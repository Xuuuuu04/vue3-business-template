<script lang="ts">
/** 返回列表时恢复表体位置，仅保存本次页面会话内最近 50 个地址。 */
const scrollPositions = new Map<string, number>();
</script>
<script setup lang="ts" generic="T extends object">
/**
 * 数据表格：排序、勾选、固定列、行内展开、分组折叠、列设置、全屏、分页、批量操作条。
 * 列用 columns 声明；特殊单元格用 cell-列名 插槽；数据读取状态用 loading 与 empty 表达。
 */
import { computed, ref, useSlots, watch, onBeforeUnmount, onMounted, nextTick } from "vue";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, Columns3, Maximize2, Minimize2 } from "lucide-vue-next";
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from "reka-ui";
import type { DataColumn, SortState } from "../lib/types";
import UiCheckbox from "../base/Checkbox.vue";
import Skeleton from "../base/Skeleton.vue";
import EmptyState from "../base/EmptyState.vue";
import Pagination from "../base/Pagination.vue";
import Tip from "../base/Tip.vue";

const props = withDefaults(
  defineProps<{
    columns: DataColumn[];
    rows: T[];
    /** 行的唯一字段名。 */
    rowKey: string;
    title?: string;
    /** 标题后的小字，如“当前筛选 13 条”。 */
    meta?: string;
    loading?: boolean;
    selectable?: boolean;
    /** 分组字段；相同值的行归为一组，可折叠。 */
    groupBy?: string;
    /** 为 true 时点击表头只发出 sort 变化，由页面重新读取；默认在当前页内排序。 */
    serverSort?: boolean;
    /** 表体最高多少；fill 模式由父工作区决定高度，普通模式跟随内容。 */
    maxHeight?: string;
    /** 在主工作区占满剩余高度，只有表体滚动。 */
    fill?: boolean;
    /** 一般传列表完整地址，筛选和分页分别保留位置。 */
    scrollKey?: string;
    /** 直接作为页面主区时不再包一层卡片边框。 */
    flat?: boolean;
    emptyTitle?: string;
    emptyHint?: string;
    total?: number;
    sizes?: number[];
    settings?: boolean;
    fullscreenable?: boolean;
    /** 整行可点击（如进入详情）；点到行内按钮、输入框时不触发。 */
    rowClickable?: boolean;
  }>(),
  { emptyTitle: "没有符合条件的数据", settings: true, fullscreenable: true },
);
const scrollport = ref<HTMLElement>();
function saveScroll() {
  if (!props.scrollKey || !scrollport.value) return;
  scrollPositions.set(props.scrollKey, scrollport.value.scrollTop);
  if (scrollPositions.size > 50) scrollPositions.delete(scrollPositions.keys().next().value!);
}
async function restoreScroll() {
  await nextTick();
  if (props.scrollKey && scrollport.value)
    scrollport.value.scrollTop = scrollPositions.get(props.scrollKey) ?? 0;
}
onMounted(restoreScroll);
watch([() => props.scrollKey, () => props.loading, () => props.rows.length], restoreScroll, { flush: "post" });
const selected = defineModel<string[]>("selected", { default: () => [] });
const sort = defineModel<SortState | null>("sort", { default: null });
const expanded = defineModel<string[]>("expanded", { default: () => [] });
const page = defineModel<number>("page", { default: 1 });
const pageSize = defineModel<number>("pageSize", { default: 20 });
const slots = useSlots();
const emit = defineEmits<{ "row-click": [row: T] }>();
function clickRow(e: MouseEvent, row: T) {
  if (!props.rowClickable) return;
  if ((e.target as HTMLElement).closest("button, a, input, label, [role=checkbox]")) return;
  emit("row-click", row);
}
/** 当前页显示的是第几条到第几条。 */
const range = computed(() => {
  const t = props.total ?? 0;
  if (!t) return "";
  const from = (page.value - 1) * pageSize.value + 1;
  return `第 ${from}–${Math.min(t, from + pageSize.value - 1)} 条，共 ${t.toLocaleString("zh-CN")} 条`;
});

const hidden = ref(new Set(props.columns.filter((c) => c.hidden).map((c) => c.key)));
const visibleColumns = computed(() => props.columns.filter((c) => !hidden.value.has(c.key)));
const collapsed = ref(new Set<string>());
const fullscreen = ref(false);
const SELECT_WIDTH = 44;

/** 行对象按列名取值；列名由页面声明，类型在这里放宽。 */
function cell(row: T, key: string): unknown { return (row as Record<string, unknown>)[key]; }
function keyOf(row: T): string { return String(cell(row, props.rowKey)); }

/** 固定列的位置：左固定列从勾选列之后依次排开，右固定列从右边依次排开。 */
const offsets = computed(() => {
  const map = new Map<string, number>();
  let left = props.selectable ? SELECT_WIDTH : 0;
  for (const c of visibleColumns.value.filter((x) => x.sticky === "left")) { map.set(c.key, left); left += c.width ?? 160; }
  let right = 0;
  for (const c of [...visibleColumns.value].reverse().filter((x) => x.sticky === "right")) { map.set(c.key, right); right += c.width ?? 120; }
  return map;
});
const lastLeft = computed(() => [...visibleColumns.value].reverse().find((c) => c.sticky === "left")?.key);
const firstRight = computed(() => visibleColumns.value.find((c) => c.sticky === "right")?.key);

const sorted = computed<T[]>(() => {
  const s = sort.value;
  if (!s || props.serverSort) return props.rows;
  const dir = s.dir === "asc" ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const x = cell(a, s.key) as number | string, y = cell(b, s.key) as number | string;
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "zh-CN")) * dir;
  });
});

interface Group { key: string; rows: T[] }
const groups = computed<Group[]>(() => {
  if (!props.groupBy) return [{ key: "", rows: sorted.value }];
  const map = new Map<string, T[]>();
  for (const row of sorted.value) {
    const g = String(cell(row, props.groupBy!) ?? "");
    (map.get(g) ?? map.set(g, []).get(g)!).push(row);
  }
  return [...map].map(([key, rows]) => ({ key, rows }));
});

const allState = computed<boolean | "indeterminate">(() => {
  const n = props.rows.filter((r) => selected.value.includes(keyOf(r))).length;
  return n === 0 ? false : n === props.rows.length ? true : "indeterminate";
});
function toggleAll(v: boolean | "indeterminate") {
  const keys = props.rows.map(keyOf);
  selected.value = v === true ? [...new Set([...selected.value, ...keys])] : selected.value.filter((k) => !keys.includes(k));
}
function toggleRow(row: T, v: boolean | "indeterminate") {
  const k = keyOf(row);
  selected.value = v === true ? [...selected.value, k] : selected.value.filter((x) => x !== k);
}
function toggleSort(c: DataColumn) {
  if (!c.sortable) return;
  const s = sort.value;
  sort.value = !s || s.key !== c.key ? { key: c.key, dir: "asc" } : s.dir === "asc" ? { key: c.key, dir: "desc" } : null;
}
function ariaSort(c: DataColumn) {
  return sort.value?.key === c.key ? (sort.value.dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined;
}
function toggleGroup(key: string) {
  collapsed.value.has(key) ? collapsed.value.delete(key) : collapsed.value.add(key);
  collapsed.value = new Set(collapsed.value);
}
function toggleExpand(row: T) {
  const k = keyOf(row);
  expanded.value = expanded.value.includes(k) ? expanded.value.filter((x) => x !== k) : [...expanded.value, k];
}
function toggleColumn(key: string, show: boolean | "indeterminate") {
  show ? hidden.value.delete(key) : hidden.value.add(key);
  hidden.value = new Set(hidden.value);
}
function show(c: DataColumn, row: T): string {
  const v = cell(row, c.key);
  return c.format ? c.format(v, row as Record<string, unknown>) : v === null || v === undefined ? "—" : String(v);
}
function cellClass(c: DataColumn) {
  return [
    (c.align ?? (c.kind === "number" || c.kind === "delta" ? "right" : "left")) === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
    (c.kind === "number" || c.kind === "delta") && "tabular-nums",
  ];
}
function stickyStyle(c: DataColumn) {
  const o = offsets.value.get(c.key);
  return o === undefined ? undefined : { [c.sticky === "right" ? "right" : "left"]: `${o}px` };
}
function widthStyle(c: DataColumn) {
  return { width: c.width ? `${c.width}px` : undefined, minWidth: c.minWidth ? `${c.minWidth}px` : c.width ? `${c.width}px` : undefined };
}
function deltaTone(v: unknown) { return typeof v === "number" ? (v > 0 ? "text-ok" : v < 0 ? "text-bad" : "text-fg-faint") : ""; }

const colCount = computed(() => visibleColumns.value.length + (props.selectable ? 1 : 0));
const hasToolbar = computed(() => props.title || props.meta || slots["toolbar"] || slots["search"] || props.settings || props.fullscreenable);
const showFooter = computed(() => props.total !== undefined);
function onKey(e: KeyboardEvent) { if (e.key === "Escape") fullscreen.value = false; }
watch(fullscreen, (v) => { v ? document.addEventListener("keydown", onKey) : document.removeEventListener("keydown", onKey); });
onBeforeUnmount(() => { saveScroll(); document.removeEventListener("keydown", onKey); });
</script>

<template>
  <section class="data-table relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface" :class="[fullscreen ? 'fixed inset-0 z-[60]' : !flat && 'rounded-lg border border-line', fill && 'flex-1']" :aria-label="title ?? '数据表格'">
    <header v-if="hasToolbar" class="flex min-h-12 shrink-0 flex-wrap items-center gap-3 pb-2" :class="!flat && 'px-4 pt-3'">
      <slot name="search" />
      <h2 v-if="title" class="text-[15px] font-semibold">{{ title }}</h2>
      <span v-if="meta" class="text-[13px] text-fg-faint tabular-nums">{{ meta }}</span>
      <span class="flex-1" />
      <slot name="toolbar" />
      <PopoverRoot v-if="settings">
        <Tip text="列设置">
          <PopoverTrigger as-child>
            <button type="button" class="grid size-8 place-items-center rounded-md border border-line-strong text-fg-muted hover:bg-subtle" aria-label="列设置"><Columns3 class="size-4" /></button>
          </PopoverTrigger>
        </Tip>
        <PopoverPortal>
          <PopoverContent align="end" :side-offset="6" class="z-[100] w-52 rounded-lg border border-line bg-surface p-2 popup-surface data-[state=open]:animate-[pop_.14s_var(--ease)]">
            <p class="px-2 pt-1 pb-2 text-xs text-fg-faint">显示的列</p>
            <div v-for="c in columns" :key="c.key" class="flex h-8 items-center rounded-md px-2 hover:bg-muted">
              <UiCheckbox :model-value="!hidden.has(c.key)" :label="c.title" @update:model-value="(v) => toggleColumn(c.key, v)" />
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <Tip v-if="fullscreenable" :text="fullscreen ? '退出全屏' : '全屏'">
        <button type="button" class="grid size-8 place-items-center rounded-md border border-line-strong text-fg-muted hover:bg-subtle" :aria-label="fullscreen ? '退出全屏' : '全屏'" @click="fullscreen = !fullscreen">
          <Minimize2 v-if="fullscreen" class="size-4" /><Maximize2 v-else class="size-4" />
        </button>
      </Tip>
    </header>

    <div ref="scrollport" data-table-scroll @scroll="saveScroll" class="min-h-0 flex-1 overflow-auto border border-line rounded-md" :style="{ maxHeight: fullscreen || fill ? 'none' : (maxHeight ?? 'none') }">
      <table class="w-full min-w-max border-separate border-spacing-0">
        <thead>
          <tr>
            <th v-if="selectable" class="sticky top-0 left-0 z-30 h-10 border-b border-line bg-subtle pl-4 text-left" :style="{ width: SELECT_WIDTH + 'px', minWidth: SELECT_WIDTH + 'px' }">
              <UiCheckbox :model-value="allState" aria-label="选择当前页全部" @update:model-value="toggleAll" />
            </th>
            <th
              v-for="c in visibleColumns" :key="c.key" scope="col" :aria-sort="ariaSort(c)"
              class="sticky top-0 h-10 border-b border-line bg-subtle px-(--cell-px) align-middle text-[13px] font-medium whitespace-nowrap text-fg"
              :class="[cellClass(c), c.sticky ? 'z-30' : 'z-20', c.key === lastLeft && 'shadow-[1px_0_0_var(--line)]', c.key === firstRight && 'shadow-[-1px_0_0_var(--line)]', c.sortable && 'cursor-pointer select-none hover:text-fg']"
              :style="{ ...widthStyle(c), ...stickyStyle(c) }"
               :tabindex="c.sortable ? 0 : undefined"
              @keydown.enter="toggleSort(c)"
              @keydown.space.prevent="toggleSort(c)"
              @click="toggleSort(c)"
            >
              <span class="inline-flex flex-col" :class="(c.kind === 'number' || c.kind === 'delta' || c.align === 'right') && 'items-end'">
                <span class="inline-flex items-center gap-1">
                  {{ c.title }}
                  <template v-if="c.sortable">
                    <ArrowUp v-if="sort?.key === c.key && sort.dir === 'asc'" class="size-3.5 text-primary-text" />
                    <ArrowDown v-else-if="sort?.key === c.key" class="size-3.5 text-primary-text" />
                    <ChevronsUpDown v-else class="size-3.5 text-fg-faint" />
                  </template>
                </span>
                <span v-if="c.unit" class="text-[12px] leading-none font-normal text-fg-faint">{{ c.unit }}</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="n in 6" :key="n">
            <td v-if="selectable" class="h-(--row-h) border-b border-line" />
            <td v-for="c in visibleColumns" :key="c.key" class="h-(--row-h) border-b border-line px-(--cell-px)"><Skeleton :width="c.kind === 'number' ? '40px' : '70%'" :class="(c.kind === 'number') && 'ml-auto'" /></td>
          </tr>
        </tbody>
        <tbody v-else-if="rows.length === 0">
          <tr><td :colspan="colCount"><slot name="empty"><EmptyState :title="emptyTitle" :hint="emptyHint" /></slot></td></tr>
        </tbody>
        <tbody v-else>
          <template v-for="g in groups" :key="g.key">
            <tr v-if="groupBy" class="cursor-pointer select-none" :aria-expanded="!collapsed.has(g.key)" @click="toggleGroup(g.key)">
              <td :colspan="colCount" class="h-10 border-b border-line bg-subtle px-4 font-semibold hover:bg-muted">
                <span class="inline-flex items-center gap-2">
                  <ChevronDown class="size-4 text-fg-faint transition-transform duration-200" :class="collapsed.has(g.key) && '-rotate-90'" />
                  <slot name="group" :label="g.key" :rows="g.rows">{{ g.key }}</slot>
                  <span class="font-normal text-fg-faint tabular-nums">{{ g.rows.length }} 项</span>
                </span>
              </td>
            </tr>
            <template v-for="row in g.rows" :key="keyOf(row)">
              <tr v-show="!collapsed.has(g.key)" class="group/row" :class="[rowClickable && 'cursor-pointer', selected.includes(keyOf(row)) && 'is-selected']" @dblclick="slots['expanded'] && toggleExpand(row)" @click="clickRow($event, row)">
                <td v-if="selectable" class="sticky left-0 z-10 h-(--row-h) border-b border-line bg-surface pl-4 group-hover/row:bg-subtle group-[.is-selected]/row:bg-primary-soft">
                  <UiCheckbox :model-value="selected.includes(keyOf(row))" :aria-label="`选择第 ${keyOf(row)} 行`" @update:model-value="(v) => toggleRow(row, v)" />
                </td>
                <td
                  v-for="c in visibleColumns" :key="c.key"
                  class="h-(--row-h) border-b border-line bg-surface px-(--cell-px) py-2 align-middle transition-colors group-hover/row:bg-subtle group-[.is-selected]/row:bg-primary-soft"
                  :class="[cellClass(c), c.sticky && 'sticky z-10', c.key === lastLeft && 'shadow-[1px_0_0_var(--line)]', c.key === firstRight && 'shadow-[-1px_0_0_var(--line)]', c.kind === 'delta' && deltaTone(cell(row, c.key))]"
                  :style="stickyStyle(c)"
                >
                  <slot :name="`cell-${c.key}`" :row="row" :value="cell(row, c.key)">
                    <template v-if="c.kind === 'delta' && typeof cell(row, c.key) === 'number'">
                      <span v-if="(cell(row, c.key) as number) !== 0" aria-hidden="true">{{ (cell(row, c.key) as number) > 0 ? "▲" : "▼" }} </span>{{ Math.abs(cell(row, c.key) as number).toFixed(1) }}
                    </template>
                    <template v-else>{{ show(c, row) }}</template>
                  </slot>
                </td>
              </tr>
              <tr v-if="slots['expanded'] && expanded.includes(keyOf(row)) && !collapsed.has(g.key)">
                <td :colspan="colCount" class="border-b border-line bg-subtle px-6 py-3 text-fg-muted"><slot name="expanded" :row="row" /></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <Transition enter-from-class="opacity-0 translate-y-4" enter-active-class="transition duration-200 ease-(--ease)" leave-active-class="transition duration-150" leave-to-class="opacity-0 translate-y-4">
      <div v-if="selectable && selected.length" class="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl bg-fg py-2 pr-2 pl-4 text-surface popup-surface" role="toolbar" aria-label="批量操作">
        <span class="tabular-nums">已选 <b>{{ selected.length }}</b> 项</span>
        <span class="mx-1 h-5 w-px bg-surface/20" />
        <slot name="bulk" :count="selected.length" :clear="() => (selected = [])" />
        <button type="button" class="h-7 rounded-md px-2.5 text-[13px] text-surface/70 hover:bg-surface/10 hover:text-surface" @click="selected = []">取消选择</button>
      </div>
    </Transition>
    <footer v-if="showFooter" class="flex shrink-0 flex-wrap items-center gap-3 border-t border-line py-3 text-[13px] text-fg-muted" :class="!flat && 'px-4'">
      <span class="tabular-nums">{{ range }}</span>
      <slot name="footer" />
      <span class="flex-1" />
      <Pagination v-model:page="page" v-model:page-size="pageSize" :total="total!" :sizes="sizes" />
    </footer>
  </section>
</template>
