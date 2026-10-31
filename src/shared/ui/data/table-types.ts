import type { DataColumn } from "../lib/types";

export interface DataTableProps<T extends object> {
  columns: DataColumn[];
  rows: T[];
  rowKey: string;
  title?: string;
  meta?: string;
  loading?: boolean;
  error?: string;
  retryable?: boolean;
  selectable?: boolean;
  groupBy?: string;
  serverSort?: boolean;
  maxHeight?: string;
  fill?: boolean;
  scrollKey?: string;
  flat?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  total?: number;
  sizes?: number[];
  settings?: boolean;
  fullscreenable?: boolean;
  rowClickable?: boolean;
}
