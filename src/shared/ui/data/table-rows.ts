import { computed, type Ref } from "vue";
import type { DataColumn, SortState } from "../lib/types";
import type { DataTableProps } from "./table-types";

export function tableCell<T extends object>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function useRowOrdering<T extends object>(
  props: DataTableProps<T>,
  sort: Ref<SortState | null>,
) {
  const sorted = computed(() => {
    const current = sort.value;
    if (!current || props.serverSort) return props.rows;
    const direction = current.dir === "asc" ? 1 : -1;
    return [...props.rows].sort((a, b) => {
      const x = tableCell(a, current.key),
        y = tableCell(b, current.key);
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "zh-CN")) * direction
      );
    });
  });
  const groups = computed(() => {
    if (!props.groupBy) return [{ key: "", rows: sorted.value }];
    const grouped = new Map<string, T[]>();
    for (const row of sorted.value) {
      const key = String(tableCell(row, props.groupBy) ?? "");
      const rows = grouped.get(key) ?? [];
      rows.push(row);
      grouped.set(key, rows);
    }
    return [...grouped].map(([key, rows]) => ({ key, rows }));
  });
  function toggleSort(column: DataColumn) {
    if (!column.sortable) return;
    const current = sort.value;
    sort.value =
      !current || current.key !== column.key
        ? { key: column.key, dir: "asc" }
        : current.dir === "asc"
          ? { key: column.key, dir: "desc" }
          : null;
  }
  function ariaSort(column: DataColumn) {
    return sort.value?.key === column.key
      ? sort.value.dir === "asc"
        ? "ascending"
        : "descending"
      : column.sortable
        ? "none"
        : undefined;
  }
  return { groups, toggleSort, ariaSort };
}

export function useRowSelection<T extends object>(
  props: DataTableProps<T>,
  selected: Ref<string[]>,
) {
  const keyOf = (row: T) => String(tableCell(row, props.rowKey));
  const allState = computed<boolean | "indeterminate">(() => {
    const count = props.rows.filter((row) =>
      selected.value.includes(keyOf(row)),
    ).length;
    return count === 0
      ? false
      : count === props.rows.length
        ? true
        : "indeterminate";
  });
  function toggleAll(value: boolean | "indeterminate") {
    const keys = props.rows.map(keyOf);
    selected.value =
      value === true
        ? [...new Set([...selected.value, ...keys])]
        : selected.value.filter((key) => !keys.includes(key));
  }
  function toggleRow(row: T, value: boolean | "indeterminate") {
    const key = keyOf(row);
    selected.value =
      value === true
        ? [...selected.value, key]
        : selected.value.filter((item) => item !== key);
  }
  return { keyOf, allState, toggleAll, toggleRow };
}

export function useRowExpansion<T extends object>(
  keyOf: (row: T) => string,
  expanded: Ref<string[]>,
) {
  return (row: T) => {
    const key = keyOf(row);
    expanded.value = expanded.value.includes(key)
      ? expanded.value.filter((item) => item !== key)
      : [...expanded.value, key];
  };
}

export function useRowNavigation<T extends object>(
  props: DataTableProps<T>,
  onClick: (row: T) => void,
  hasExpansion: () => boolean,
  toggleExpand: (row: T) => void,
) {
  function keyRow(event: KeyboardEvent, row: T) {
    if (
      !props.rowClickable ||
      event.target !== event.currentTarget ||
      !["Enter", " "].includes(event.key)
    )
      return;
    event.preventDefault();
    onClick(row);
  }
  function clickRow(e: MouseEvent, row: T) {
    if (!props.rowClickable) return;
    if (
      (e.target as HTMLElement).closest(
        "button, a, input, label, [role=checkbox]",
      )
    )
      return;
    onClick(row);
  }
  function doubleClickRow(e: MouseEvent, row: T) {
    if (
      props.rowClickable ||
      !hasExpansion() ||
      (e.target as Element).closest("button, a, input, label, [role=checkbox]")
    )
      return;
    toggleExpand(row);
  }

  return { keyRow, clickRow, doubleClickRow };
}
