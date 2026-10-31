import type { Step } from "./definitions";
import {
  ActionError,
  sendRequest,
  type Endpoint,
  type StepTools,
  type Transport,
} from "@/shared/http/client";
import type { RunRecord, StepRecord } from "@/shared/records/store";
import type { RecordPrivacy } from "@/shared/records/privacy";
export interface StepContext {
  endpoints: Endpoint[];
  signal: AbortSignal;
  run: RunRecord;
  privacy: RecordPrivacy;
  transport?: Transport;
  checkAccess(): void;
}
export function createRequests(
  part: Step,
  item: StepRecord,
  notes: string[],
  context: StepContext,
) {
  const { endpoints, signal, run, privacy, transport, checkAccess } = context;
  const pending: Promise<PromiseSettledResult<unknown>>[] = [];
  let closed = false;
  const tools: StepTools = {
    signal,
    note(message) {
      if (notes.length < 40) notes.push(message);
      else if (!run.gaps.includes("步骤附加说明超过 40 条"))
        run.gaps.push("步骤附加说明超过 40 条");
    },
    request<T>(id: string, options = {}): Promise<T> {
      if (closed)
        throw new ActionError("step_finished", "步骤已结束，不能继续发送请求");
      checkAccess();
      signal.throwIfAborted();
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
        at:
          run.origin === undefined ? undefined : performance.now() - run.origin,
        outcome: "running",
      };
      if (item.requests.length >= 40)
        throw new ActionError(
          "request_limit",
          "单一步骤请求超过 40 次，请分页或拆分动作",
        );
      item.requests.push(request);
      const result = sendRequest<T>(
        endpoint,
        options,
        signal,
        request,
        transport,
        (message) => privacy.text(message),
      );
      pending.push(
        result.then(
          (value) => ({ status: "fulfilled", value }),
          (reason: unknown) => ({ status: "rejected", reason }),
        ),
      );
      return result;
    },
  };

  async function finish() {
    closed = true;
    const results = await Promise.all(pending);
    const failure = results.find(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof ActionError &&
        result.reason.unknownResult,
    );
    return failure?.status === "rejected"
      ? (failure.reason as ActionError)
      : undefined;
  }
  return { tools, finish };
}
