import type { Action } from "./definitions";
import { validateAction } from "./definitions";
import {
  ActionError,
  accessVersion,
  type Endpoint,
  type Transport,
} from "@/shared/http/client";
import { changed, startRecord, type RunRecord } from "@/shared/records/store";
import { RecordPrivacy } from "@/shared/records/privacy";
import { runStep } from "./step";
import { prepareInput } from "./input";

let authorization: (permission: string) => boolean = () => true;

export function setAuthorization(check: (permission: string) => boolean) {
  authorization = check;
}

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
  const session = accessVersion();
  const checkAccess = () => {
    if (session !== accessVersion())
      throw new ActionError(
        "session_changed",
        "登录状态已改变，本次操作已停止。请重新查询结果。",
      );
    if (!authorization(action.permission ?? "public"))
      throw new ActionError("not_allowed", "当前账号没有执行此操作的权限");
  };
  const privacy = new RecordPrivacy();
  try {
    for (const [key, field] of Object.entries(action.fields))
      if (field.secret) privacy.add((input as Record<string, unknown>)[key]);
    checkAccess();
    const values = prepareInput(action, input, privacy);
    for (const part of action.steps) {
      signal.throwIfAborted();
      checkAccess();
      await runStep(part, values, action.fields, {
        endpoints,
        signal,
        run: record,
        privacy,
        transport,
        checkAccess,
      });
    }
    signal.throwIfAborted();
    checkAccess();
    record.status = "ok";
    return values[action.result] as O;
  } catch (error) {
    error = privacy.failure(error);

    error = writeFailure(error, record);
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

function writeFailure(error: unknown, record: RunRecord) {
  const saved = record.steps.some((step) =>
    step.requests.some(
      (request) =>
        request.method !== "GET" &&
        ["ok", "unknown", "running"].includes(request.outcome),
    ),
  );
  if (saved) {
    const confirmed = record.steps.some((step) =>
      step.requests.some(
        (request) => request.method !== "GET" && request.outcome === "ok",
      ),
    );
    const failure = new ActionError(
      error instanceof ActionError ? error.code : "after_write_failed",
      `${confirmed ? "已有后台写入操作成功，但后续步骤失败" : "后台写入结果尚不能确认"}：${error instanceof Error ? error.message : "动作执行失败"} 请先查询实际结果，不要再次提交整个操作。`,
      true,
    );
    error = failure;
  }
  return error;
}
