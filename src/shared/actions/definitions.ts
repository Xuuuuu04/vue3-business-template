import type { z } from "zod";
import type { StepTools } from "@/shared/http/client";

export interface Field {
  title: string;
  schema: z.ZodType;
  secret?: boolean;
  recordValue?: boolean;
}
export type Fields = Record<string, Field>;
export interface Condition {
  id: string;
  title: string;
  reads: string[];
  run: (data: Record<string, unknown>) => boolean;
}
export interface Step {
  id: string;
  title: string;
  rule: string;
  reads: string[];
  writes: string[];
  uses: string[];
  when?: Condition;
  run: (
    data: Record<string, unknown>,
    tools: StepTools,
  ) => void | Promise<void>;
}
export interface Action<I extends object = object, O = unknown> {
  id: string;
  title: string;
  permission?: string;
  input: z.ZodType<I>;
  fields: Fields;
  inputFields: string[];
  result: string;
  steps: Step[];
  output?: O;
}

export function defineStep<W extends object>(
  part: Omit<Step, "run"> & {
    run: (data: W, tools: StepTools) => void | Promise<void>;
  },
): Step {
  return Object.freeze({ ...part, run: part.run as unknown as Step["run"] });
}

export function defineCondition<W extends object>(
  part: Omit<Condition, "run"> & {
    run: (data: W) => boolean;
  },
): Condition {
  return Object.freeze({
    ...part,
    run: part.run as unknown as Condition["run"],
  });
}

export function defineAction<I extends object, O>(
  action: Action<I, O>,
): Action<I, O> {
  validateAction(action);
  return Object.freeze(action);
}

export function validateAction(action: Action): void {
  const errors: string[] = [];
  const known = new Set(action.inputFields);
  for (const [key, field] of Object.entries(action.fields)) {
    if (!field.title.trim()) errors.push(`字段 ${key} 缺少含义`);
    if (field.schema.safeParse(undefined).success) known.add(key);
  }
  for (const key of action.inputFields)
    if (!action.fields[key]) errors.push(`输入字段 ${key} 没有含义与类型声明`);
  const conditions = new Map<string, Condition>();
  const writers = new Set(action.inputFields);
  const ids = new Set<string>();
  const conditional = new Map<string, Set<string>>();
  for (const part of action.steps) {
    if (part.when) {
      const previous = conditions.get(part.when.id);
      if (previous && previous !== part.when)
        errors.push(`条件 ${part.when.id} 必须复用同一个定义`);
      conditions.set(part.when.id, part.when);
    }
    if (ids.has(part.id)) errors.push(`步骤 ${part.id} 重复`);
    ids.add(part.id);
    const available = new Set([
      ...known,
      ...(conditional.get(part.when?.id ?? "") ?? []),
    ]);
    for (const key of [...part.reads, ...(part.when?.reads ?? [])]) {
      if (!action.fields[key])
        errors.push(`步骤 ${part.id} 读取未知字段 ${key}`);
      if (!available.has(key))
        errors.push(`步骤 ${part.id} 的字段 ${key} 尚无来源`);
    }
    for (const key of part.writes) {
      if (!action.fields[key])
        errors.push(`步骤 ${part.id} 写入未知字段 ${key}`);
      if (writers.has(key)) errors.push(`字段 ${key} 有多个写入者或覆盖输入`);
      writers.add(key);
      if (part.when) {
        const names = conditional.get(part.when.id) ?? new Set<string>();
        names.add(key);
        conditional.set(part.when.id, names);
      } else known.add(key);
    }
  }
  if (!action.steps.length) errors.push("动作没有步骤");
  if (action.steps.length > 12)
    errors.push("动作超过 12 步，请拆成有明确用途的动作");
  if (!known.has(action.result))
    errors.push(`结果字段 ${action.result} 可能没有值`);
  if (errors.length) throw new Error(`${action.id}：${errors.join("；")}`);
}
