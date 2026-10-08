/** 执行关键业务步骤；读写限制、类型检查、取消与记录集中处理。 */
import type { Action, Fields, Step } from "./definitions";
import { validateAction } from "./definitions";
import {
  ActionError,
  sendRequest,
  type Endpoint,
  type StepTools,
  type Transport,
} from "@/shared/http/client";
import {
  changed,
  sourceOf,
  startRecord,
  summary,
  type RunRecord,
  type StepRecord,
} from "@/shared/records/store";
import { RecordPrivacy } from "@/shared/records/privacy";
import { inputFieldErrors } from "./input-errors";
import { zhCN } from "zod/locales";

const localeError = zhCN().localeError;
const inputError: typeof localeError = (issue) => issue.code === "invalid_type" && issue.expected === "int"
  ? "请填写整数"
  : localeError(issue);

let authorization: (permission: string) => boolean = () => true;
/** 仅应用入口配置权限提示，后台仍验证身份与数据范围。 */
export function setAuthorization(check: (permission: string) => boolean) {
  authorization = check;
}

/** 输入先按类型检查，每次动作使用独立数据，异步动作不共用可写中间结果。 */
export async function execute<I extends object, O>(
  action: Action<I, O>,
  input: I,
  endpoints: Endpoint[],
  signal: AbortSignal,
  transport?: Transport,
): Promise<O> {
  validateAction(action);
  const record = startRecord(action.id, action.title);
  const started = performance.now();
  const values: Record<string, unknown> = {};
  const privacy = new RecordPrivacy();
  try {
    for (const [key, field] of Object.entries(action.fields))
      if (field.secret) privacy.add((input as Record<string, unknown>)[key]);
    if (action.permission && !authorization(action.permission))
      throw new ActionError("not_allowed", "当前账号没有执行此操作的权限");
    for (const key of Object.keys(input))
      if (!action.inputFields.includes(key))
        throw new ActionError("undeclared_input", `输入字段 ${key} 没有声明`);
    const checked = action.input.safeParse(input, { error: inputError });
    if (!checked.success)
      throw new ActionError("invalid_input", "输入不符合要求，请修改对应字段。", false,
        inputFieldErrors(checked.error.issues, action, privacy));
    Object.assign(values, checked.data);
    for (const [key, field] of Object.entries(action.fields))
      if (field.secret && key in values) privacy.add(values[key]);
    for (const key of action.inputFields) {
      const parsed = action.fields[key]?.schema.safeParse(values[key], { error: inputError });
      if (!parsed?.success)
        throw new ActionError(
          "invalid_input",
          `输入字段 ${key} 类型不符合约定`,
          false,
          inputFieldErrors(parsed?.error.issues ?? [], action, privacy, [key]),
        );
      values[key] = parsed.data;
      if (action.fields[key]?.secret) privacy.add(parsed.data);
    }
    for (const [key, field] of Object.entries(action.fields)) {
      if (!(key in values)) {
        const parsed = field.schema.safeParse(undefined);
        if (parsed.success) {
          values[key] = parsed.data;
          if (field.secret) privacy.add(parsed.data);
        }
      }
    }
    for (const part of action.steps) {
      signal.throwIfAborted();
      await runStep(
        part,
        values,
        action.fields,
        endpoints,
        signal,
        record,
        privacy,
        transport,
      );
    }
    signal.throwIfAborted();
    record.status = "ok";
    return values[action.result] as O;
  } catch (error) {
    error = privacy.failure(error);
    // 后续失败不能抹掉本次已经保存的事实，也不能让页面重发整个动作。
    const saved = record.steps.some((step) =>
      step.requests.some(
        (request) => request.method !== "GET" && request.outcome === "ok",
      ),
    );
    if (saved) {
      const failure = new ActionError(
        error instanceof ActionError ? error.code : "after_write_failed",
        `已有后台写入操作成功，但后续步骤失败：${error instanceof Error ? error.message : "动作执行失败"} 请先查询实际结果，不要再次提交整个操作。`,
        true,
      );
      error = failure;
    }
    record.status =
      error instanceof ActionError && error.unknownResult
        ? "unknown"
        : signal.aborted
          ? "cancelled"
          : "failed";
    record.error =
      error instanceof Error ? privacy.text(error.message) : "动作执行失败";
    throw error;
  } finally {
    record.elapsed = performance.now() - started;
    privacy.clean(record);
    changed();
  }
}

/** 每一步的输出必须实际写入，失败后保留已经产生的安全摘要。 */
async function runStep(
  part: Step,
  values: Record<string, unknown>,
  fields: Fields,
  endpoints: Endpoint[],
  signal: AbortSignal,
  run: RunRecord,
  privacy: RecordPrivacy,
  transport?: Transport,
): Promise<void> {
  const item: StepRecord = {
    id: part.id,
    title: part.title,
    rule: part.rule,
    source: sourceOf(part.id),
    status: "running",
    elapsed: 0,
    at: run.origin === undefined ? undefined : performance.now() - run.origin,
    outputs: [],
    requests: [],
  };
  run.steps.push(item);
  changed();
  const started = performance.now();
  const written = new Set<string>();
  // 说明等到本步骤输出确定后再保存，才能清理刚刚产生的敏感值。
  const notes: string[] = [];
  try {
    if (part.when) {
      item.condition = {
        title: part.when.title,
        source: sourceOf(part.when.id),
        elapsed: 0,
      };
      const conditionStarted = performance.now();
      let outcome: unknown;
      try {
        outcome = part.when.run(
          view(values, fields, part.when.reads, [], new Set(), privacy),
        );
      } finally {
        item.condition.elapsed = performance.now() - conditionStarted;
      }
      if (typeof outcome !== "boolean")
        throw new ActionError("condition_invalid", "条件必须产生布尔结果");
      item.condition.outcome = outcome;
      if (!outcome) {
        item.status = "skipped";
        return;
      }
    }
    const tools: StepTools = {
      signal,
      note(message) {
        if (notes.length < 40) notes.push(message);
        else if (!run.gaps.includes("步骤附加说明超过 40 条"))
          run.gaps.push("步骤附加说明超过 40 条");
      },
      async request<T>(id: string, options = {}): Promise<T> {
        const endpoint = endpoints.find((entry) => entry.id === id);
        if (!part.uses.includes(id) || !endpoint)
          throw new ActionError(
            "undeclared_call",
            `步骤 ${part.id} 未声明接口 ${id}`,
          );
        const request = {
          endpoint: id,
          method: endpoint.method,
          elapsed: 0,
          at: run.origin === undefined ? undefined : performance.now() - run.origin,
          outcome: "running",
        };
        if (item.requests.length >= 40)
          throw new ActionError(
            "request_limit",
            "单一步骤请求超过 40 次，请分页或拆分动作",
          );
        item.requests.push(request);
        return sendRequest<T>(endpoint, options, signal, request, transport,
          (message) => privacy.text(message));
      },
    };
    const returned = await part.run(
      view(values, fields, part.reads, part.writes, written, privacy),
      tools,
    );
    if (returned !== undefined)
      throw new ActionError("step_returned", "步骤结果必须写入声明字段");
    for (const key of part.writes)
      if (!written.has(key))
        throw new ActionError(
          "missing_write",
          `步骤 ${part.id} 没有写入 ${key}`,
        );
    item.status = signal.aborted ? "cancelled" : "ok";
  } catch (error) {
    item.status = signal.aborted ? "cancelled" : "failed";
    item.error =
      error instanceof Error ? privacy.text(error.message) : "步骤执行失败";
    throw error;
  } finally {
    item.outputs.push(...notes.map((message) => privacy.text(message, 200)));
    for (const key of written) {
      const field = fields[key]!;
      item.outputs.push(
        summary(field.title, values[key], field.secret, field.recordValue),
      );
    }
    item.elapsed = performance.now() - started;
    privacy.clean(run);
    changed();
  }
}

/** 读取对象使用深只读视图，避免对列表 push 或修改嵌套对象绕过写入声明。 */
function readonlyValue(
  value: unknown,
  cache = new WeakMap<object, object>(),
): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Blob ||
    value instanceof FormData
  )
    return value;
  const known = cache.get(value);
  if (known) return known;
  const proxy = new Proxy(value, {
    get(target, key) {
      return readonlyValue(Reflect.get(target, key), cache);
    },
    set() {
      throw new ActionError(
        "readonly_change",
        "不能原地修改只读字段，请写入新字段",
      );
    },
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return descriptor && "value" in descriptor
        ? { ...descriptor, value: readonlyValue(descriptor.value, cache) }
        : descriptor;
    },
    setPrototypeOf() {
      throw new ActionError("readonly_change", "不能修改只读对象原型");
    },
    deleteProperty() {
      throw new ActionError("readonly_change", "不能删除只读字段");
    },
    defineProperty() {
      throw new ActionError("readonly_change", "不能重定义只读字段");
    },
  });
  cache.set(value, proxy);
  return proxy;
}

/** 只让步骤读写已声明的字段；类型不符时保留字段和步骤名称。 */
function view(
  values: Record<string, unknown>,
  fields: Fields,
  reads: string[],
  writes: string[],
  written: Set<string>,
  privacy: RecordPrivacy,
) {
  return new Proxy(values, {
    get(target, key) {
      if (
        typeof key !== "string" ||
        (!reads.includes(key) && !written.has(key))
      )
        throw new ActionError(
          "undeclared_read",
          `读取未声明字段 ${String(key)}`,
        );
      if (!(key in target))
        throw new ActionError("missing_value", `字段 ${key} 尚未产生`);
      return readonlyValue(target[key]);
    },
    set(target, key, value) {
      if (typeof key !== "string" || !writes.includes(key))
        throw new ActionError(
          "undeclared_write",
          `写入未声明字段 ${String(key)}`,
        );
      const parsed = fields[key]?.schema.safeParse(value);
      if (!parsed?.success)
        throw new ActionError(
          "invalid_value",
          `字段 ${key} 的值类型不符合约定`,
        );
      target[key] = parsed.data;
      if (fields[key]?.secret) privacy.add(parsed.data);
      written.add(key);
      return true;
    },
    ownKeys(target) {
      return Object.keys(target).filter(
        (key) => reads.includes(key) || written.has(key),
      );
    },
    getOwnPropertyDescriptor(target, key) {
      if (
        typeof key !== "string" ||
        (!reads.includes(key) && !written.has(key))
      )
        return undefined;
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: readonlyValue(target[key]),
      };
    },
    getPrototypeOf() {
      return null;
    },
    setPrototypeOf() {
      throw new ActionError("undeclared_write", "步骤不能修改数据原型");
    },
    deleteProperty() {
      throw new ActionError("undeclared_write", "步骤不能删除字段");
    },
    defineProperty() {
      throw new ActionError("undeclared_write", "步骤不能重定义字段");
    },
  });
}
