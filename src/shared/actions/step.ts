import type { Fields, Step } from "./definitions";
import { ActionError } from "@/shared/http/client";
import {
  changed,
  sourceOf,
  summary,
  type StepRecord,
} from "@/shared/records/store";
import type { RecordPrivacy } from "@/shared/records/privacy";
import { view } from "./values";
import { createRequests, type StepContext } from "./requests";
export async function runStep(
  part: Step,
  values: Record<string, unknown>,
  fields: Fields,
  context: StepContext,
): Promise<void> {
  const { signal, run, privacy } = context;
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

  const notes: string[] = [];
  const requests = createRequests(part, item, notes, context);
  try {
    if (!conditionMatches(part, item, values, fields, privacy)) {
      item.status = "skipped";
      return;
    }
    let returned: unknown;
    let failed: { error: unknown } | undefined;
    try {
      returned = await part.run(
        view(values, fields, part.reads, part.writes, written, privacy),
        requests.tools,
      );
    } catch (error) {
      failed = { error };
    }
    const requestFailure = await requests.finish();
    if (failed) throw failed.error;
    if (requestFailure) throw requestFailure;
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

function conditionMatches(
  part: Step,
  item: StepRecord,
  values: Record<string, unknown>,
  fields: Fields,
  privacy: RecordPrivacy,
): boolean {
  if (!part.when) return true;
  {
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
      return false;
    }
  }
  return true;
}
