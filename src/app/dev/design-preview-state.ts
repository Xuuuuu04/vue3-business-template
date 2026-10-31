import { computed, ref, type Ref } from "vue";
import type { SortState } from "@/shared/ui/public";
import { rows, createActivity, type Item } from "./design-preview-data";

export function useFormPreview() {
  return {
    text: ref(""),
    note: ref(""),
    notify: ref(true),
    plan: ref("team"),
    range: ref("30"),
    qty: ref<number | undefined>(12),
    keywords: ref(["季度", "复盘"]),
    owner: ref(""),
    watchers: ref<string[]>(["lin"]),
    day: ref(""),
    period: ref<string[]>([]),
    pwd: ref(""),
    agreed: ref(false),
    file: ref<File>(),
    kind: ref(""),
  };
}

export function useDataPreview(kind: Ref<string>) {
  const picked = ref<string[]>([]);
  const expanded = ref<string[]>([]);
  const sort = ref<SortState | null>(null);
  const page = ref(1);
  const pageSize = ref(20);
  const tableState = ref("ready");
  const search = ref("");
  const dialog = ref(false);
  const drawer = ref(false);
  const inspected = ref(rows[0]!);
  function inspect(row: Item) {
    inspected.value = row;
    drawer.value = true;
  }
  function selectInspected() {
    picked.value = [...new Set([...picked.value, inspected.value.id])];
    drawer.value = false;
  }
  const shown = computed(() =>
    rows.filter(
      (row) =>
        (!kind.value || row.kind === kind.value) &&
        (!search.value || row.name.includes(search.value)),
    ),
  );
  return {
    activity: createActivity(),
    picked,
    expanded,
    sort,
    page,
    pageSize,
    tableState,
    search,
    kind,
    dialog,
    drawer,
    inspected,
    inspect,
    selectInspected,
    shown,
  };
}

export function useFeedbackPreview(dialog: Ref<boolean>, drawer: Ref<boolean>) {
  return {
    dialog,
    drawer,
    step: ref(1),
    readState: ref("loading"),
    resultState: ref("success"),
  };
}

export type FormPreviewState = ReturnType<typeof useFormPreview>;
export type DataPreviewState = ReturnType<typeof useDataPreview>;
export type FeedbackPreviewState = ReturnType<typeof useFeedbackPreview>;
