import { computed, ref } from "vue";
import type { DataColumn } from "../lib/types";
import type { DataTableProps } from "./table-types";
import { tableCell } from "./table-rows";

export const SELECT_WIDTH = 44;

export function useTableColumns<T extends object>(props: DataTableProps<T>) {
  const hidden = ref(
    new Set(
      props.columns
        .filter((column) => column.hidden)
        .map((column) => column.key),
    ),
  );
  const visibleColumns = computed(() =>
    props.columns.filter((column) => !hidden.value.has(column.key)),
  );
  const offsets = computed(() => {
    const map = new Map<string, number>();
    let left = props.selectable ? SELECT_WIDTH : 0;
    for (const column of visibleColumns.value.filter(
      (item) => item.sticky === "left",
    )) {
      map.set(column.key, left);
      left += column.width ?? 160;
    }
    let right = 0;
    for (const column of [...visibleColumns.value]
      .reverse()
      .filter((item) => item.sticky === "right")) {
      map.set(column.key, right);
      right += column.width ?? 120;
    }
    return map;
  });
  const lastLeft = computed(
    () =>
      [...visibleColumns.value]
        .reverse()
        .find((column) => column.sticky === "left")?.key,
  );
  const firstRight = computed(
    () => visibleColumns.value.find((column) => column.sticky === "right")?.key,
  );
  function toggleColumn(key: string, show: boolean | "indeterminate") {
    show ? hidden.value.delete(key) : hidden.value.add(key);
    hidden.value = new Set(hidden.value);
  }
  function stickyStyle(column: DataColumn) {
    const offset = offsets.value.get(column.key);
    return offset === undefined
      ? undefined
      : { "--sticky-offset": `${offset}px` };
  }
  return {
    hidden,
    visibleColumns,
    lastLeft,
    firstRight,
    toggleColumn,
    stickyStyle,
  };
}

export function showCell<T extends object>(column: DataColumn, row: T): string {
  const value = tableCell(row, column.key);
  return column.format
    ? column.format(value, row as Record<string, unknown>)
    : value === null || value === undefined
      ? "—"
      : String(value);
}

export function cellAlignment(column: DataColumn) {
  return (
    column.align ??
    (column.kind === "number" || column.kind === "delta" ? "right" : "left")
  );
}

export function cellClass(column: DataColumn) {
  const alignment = cellAlignment(column);
  return [
    alignment === "right"
      ? "text-right"
      : alignment === "center"
        ? "text-center"
        : "text-left",
    (column.kind === "number" || column.kind === "delta") && "tabular-nums",
  ];
}

export function stickyPosition(column: DataColumn) {
  return column.sticky === "right"
    ? "sm:right-(--sticky-offset)"
    : "sm:left-(--sticky-offset)";
}

export function widthStyle(column: DataColumn) {
  return {
    width: column.width ? `${column.width}px` : undefined,
    minWidth: column.minWidth
      ? `${column.minWidth}px`
      : column.width
        ? `${column.width}px`
        : undefined,
  };
}

export function deltaTone(value: unknown) {
  return typeof value === "number"
    ? value > 0
      ? "text-ok"
      : value < 0
        ? "text-bad"
        : "text-fg-faint"
    : "";
}
