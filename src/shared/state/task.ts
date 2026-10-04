/** 页面动作的并发规则：查询以最新一次为准，写入禁止重复与未知结果重发。 */
import { readonly, shallowRef } from "vue";
import { execute } from "@/shared/actions/runtime";
import type { Action } from "@/shared/actions/definitions";
import {
  ActionError,
  type Endpoint,
  type Transport,
} from "@/shared/http/client";
export type TaskStatus = "idle" | "loading" | "success" | "error" | "unknown";
export interface TaskState<O> {
  status: TaskStatus;
  data?: O;
  error?: string;
}
export function createTask<I extends object, O>(
  action: Action<I, O>,
  endpoints: Endpoint[],
  mode: "latest" | "submit",
  transport?: Transport,
) {
  const writing = action.steps.some((step) =>
    step.uses.some((id) =>
      endpoints.some(
        (endpoint) => endpoint.id === id && endpoint.method !== "GET",
      ),
    ),
  );
  if (writing && mode === "latest")
    throw new Error("写入动作必须采用 submit，不能取消并覆盖先前提交");
  const state = shallowRef<TaskState<O>>({ status: "idle" });
  let controller: AbortController | undefined;
  let version = 0;
  async function run(input: I): Promise<O | undefined> {
    if (
      mode === "submit" &&
      (state.value.status === "loading" || state.value.status === "unknown")
    )
      return;
    controller?.abort();
    controller = new AbortController();
    const current = ++version;
    const signal = controller.signal;
    state.value = { ...state.value, status: "loading", error: undefined };
    try {
      const data = await execute(action, input, endpoints, signal, transport);
      if (current !== version || signal.aborted) return;
      state.value = { status: "success", data };
      return data;
    } catch (error) {
      if (
        current !== version ||
        (signal.aborted &&
          !(error instanceof ActionError && error.unknownResult))
      )
        return;
      state.value = {
        ...state.value,
        status:
          error instanceof ActionError && error.unknownResult
            ? "unknown"
            : "error",
        error: error instanceof Error ? error.message : "操作失败",
      };
    }
  }
  function dispose() {
    version++;
    // 已提交的写入继续取得真实结果，只停止向离开的页面更新。
    if (!writing) controller?.abort();
  }
  return { state: readonly(state), run, dispose };
}
