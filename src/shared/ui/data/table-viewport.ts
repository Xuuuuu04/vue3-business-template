import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref,
} from "vue";
import type { DataTableProps } from "./table-types";

const scrollPositions = new Map<string, number>();

export function useTableViewport<T extends object>(
  props: DataTableProps<T>,
  scrollport: Ref<HTMLElement | undefined>,
) {
  const fullscreen = ref(false);
  function saveScroll() {
    if (!props.scrollKey || !scrollport.value) return;
    scrollPositions.set(props.scrollKey, scrollport.value.scrollTop);
    if (scrollPositions.size > 50)
      scrollPositions.delete(scrollPositions.keys().next().value!);
  }
  async function restoreScroll() {
    await nextTick();
    if (props.scrollKey && scrollport.value)
      scrollport.value.scrollTop = scrollPositions.get(props.scrollKey) ?? 0;
  }
  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") fullscreen.value = false;
  }
  watch(fullscreen, (value) => {
    value
      ? document.addEventListener("keydown", onKey)
      : document.removeEventListener("keydown", onKey);
  });
  onMounted(restoreScroll);
  watch(
    [() => props.scrollKey, () => props.loading, () => props.rows.length],
    restoreScroll,
    { flush: "post" },
  );
  onBeforeUnmount(() => {
    saveScroll();
    document.removeEventListener("keydown", onKey);
  });
  return { fullscreen, saveScroll };
}

export function useTableRange<T extends object>(
  props: DataTableProps<T>,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  return computed(() => {
    const total = props.total ?? 0;
    if (!total) return "共 0 条";
    const validPage = Math.min(
      Math.max(1, page.value),
      Math.max(1, Math.ceil(total / pageSize.value)),
    );
    const from = (validPage - 1) * pageSize.value + 1;
    return `第 ${from}–${Math.min(total, from + pageSize.value - 1)} 条，共 ${total.toLocaleString("zh-CN")} 条`;
  });
}
