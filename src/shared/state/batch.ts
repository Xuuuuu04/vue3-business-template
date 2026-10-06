/**
 * 批量执行：把同一个动作按顺序用在多个对象上（如批量删除、批量下载）。
 * 规则：
 * - 一次只执行一项，前一项有了结果再做下一项；
 * - 明确失败的项记为失败，继续做后面的；
 * - 某一项结果未知（网络中断、超时等）立即停下，后面的记为“未执行”，避免在网络不稳时连续制造未知结果；
 * - 任何一项都不自动重发，未知的项要先查询实际结果。
 */
import { computed, ref, type Ref } from "vue";
import type { TaskState } from "./task";

export interface BatchOutcome {
  key: string;
  label: string;
  status: "waiting" | "running" | "ok" | "failed" | "unknown" | "skipped";
  error?: string;
}
interface BatchTask<I, O> {
  run(input: I): Promise<O | undefined>;
  state: Readonly<Ref<TaskState<O>>>;
}

export function useBatch() {
  const items = ref<BatchOutcome[]>([]);
  const running = ref(false);
  const summary = computed(() => {
    const count = (s: BatchOutcome["status"]) => items.value.filter((i) => i.status === s).length;
    const ok = count("ok"), failed = count("failed"), unknown = count("unknown"), skipped = count("skipped");
    return { total: items.value.length, done: ok + failed + unknown + skipped, ok, failed, unknown, skipped };
  });
  /** 按顺序执行；每项成功后调用 after（如保存下载的文件）。返回每一项的结果。 */
  async function run<I, O>(task: BatchTask<I, O>, list: { key: string; label: string; input: I }[], after?: (result: O, key: string) => void) {
    if (running.value) return items.value;
    running.value = true;
    items.value = list.map(({ key, label }) => ({ key, label, status: "waiting" }));
    try {
      for (const [i, entry] of list.entries()) {
        const item = items.value[i]!;
        item.status = "running";
        const result = await task.run(entry.input);
        const state = task.state.value;
        if (state.status === "success") {
          item.status = "ok";
          if (after) after(result as O, entry.key);
        } else if (state.status === "unknown") {
          item.status = "unknown";
          item.error = state.error;
          for (const rest of items.value.slice(i + 1)) rest.status = "skipped";
          break;
        } else {
          item.status = "failed";
          item.error = state.error ?? "操作失败";
        }
      }
    } finally {
      running.value = false;
    }
    return items.value;
  }
  function reset() { items.value = []; }
  return { items, running, summary, run, reset };
}
