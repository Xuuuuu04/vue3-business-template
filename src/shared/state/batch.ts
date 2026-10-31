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
    const count = (s: BatchOutcome["status"]) =>
      items.value.filter((i) => i.status === s).length;
    const ok = count("ok"),
      failed = count("failed"),
      unknown = count("unknown"),
      skipped = count("skipped");
    return {
      total: items.value.length,
      done: ok + failed + unknown + skipped,
      ok,
      failed,
      unknown,
      skipped,
    };
  });

  async function run<I, O>(
    task: BatchTask<I, O>,
    list: { key: string; label: string; input: I }[],
    after?: (result: O, key: string) => void,
  ) {
    if (running.value) return items.value;
    running.value = true;
    items.value = list.map(({ key, label }) => ({
      key,
      label,
      status: "waiting",
    }));
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
  function reset() {
    items.value = [];
  }
  return { items, running, summary, run, reset };
}
