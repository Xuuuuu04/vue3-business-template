export interface Option {
  value: string;
  label: string;
}
export interface TabItem {
  value: string;
  label: string;

  count?: number;

  mark?: string;
}
export interface MenuItem {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

export interface DataColumn {
  key: string;
  title: string;

  unit?: string;
  align?: "left" | "right" | "center";
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  sticky?: "left" | "right";
  kind?: "text" | "number" | "delta";

  format?: (value: unknown, row: Record<string, unknown>) => string;

  hidden?: boolean;
}
export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export interface NavItem {
  label: string;
  to?: string;
  icon?: import("vue").Component;
  badge?: number;
  exact?: boolean;
  children?: NavItem[];
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}
