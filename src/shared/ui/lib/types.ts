/** 多个组件共用的小类型。 */
export interface Option {
  value: string;
  label: string;
}
export interface TabItem {
  value: string;
  label: string;
  /** 标签后面的数量。 */
  count?: number;
  /** 标签前的小块，通常是平台或分类的简称。 */
  mark?: string;
}
export interface MenuItem {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

/** 表格列。数字列设置 kind: "number" 自动右对齐并等宽数字；固定列必须写 width。 */
export interface DataColumn {
  key: string;
  title: string;
  /** 表头下方的小字单位，如 "元"、"%"。 */
  unit?: string;
  align?: "left" | "right" | "center";
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  sticky?: "left" | "right";
  kind?: "text" | "number" | "delta";
  /** 没有自定义单元格插槽时，用它把值变成显示文字。 */
  format?: (value: unknown, row: Record<string, unknown>) => string;
  /** 默认隐藏，可在列设置里打开。 */
  hidden?: boolean;
}
export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

/** 侧栏菜单树。目录用 children，页面用 to；目录也可以有自己的入口。 */
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
