<script setup lang="ts" generic="T extends object">
import { computed, ref, useSlots } from "vue";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  Columns3,
  Maximize2,
  Minimize2,
} from "lucide-vue-next";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from "reka-ui";
import type { SortState } from "../lib/types";
import UiCheckbox from "../base/Checkbox.vue";
import Skeleton from "../base/Skeleton.vue";
import EmptyState from "../base/EmptyState.vue";
import Pagination from "../base/Pagination.vue";
import Tip from "../base/Tip.vue";
import UiButton from "../base/Button.vue";

import type { DataTableProps } from "./table-types";
import {
  tableCell as cell,
  useRowOrdering,
  useRowSelection,
  useRowExpansion,
  useRowNavigation,
} from "./table-rows";
import {
  SELECT_WIDTH,
  useTableColumns,
  showCell as show,
  cellAlignment,
  cellClass,
  stickyPosition,
  widthStyle,
  deltaTone,
} from "./table-columns";
import { useTableRange, useTableViewport } from "./table-viewport";

const props = withDefaults(defineProps<DataTableProps<T>>(), {
  emptyTitle: "没有符合条件的数据",
  settings: true,
  fullscreenable: true,
});
const selected = defineModel<string[]>("selected", { default: () => [] });
const sort = defineModel<SortState | null>("sort", { default: null });
const expanded = defineModel<string[]>("expanded", { default: () => [] });
const page = defineModel<number>("page", { default: 1 });
const pageSize = defineModel<number>("pageSize", { default: 20 });
const slots = useSlots();
const emit = defineEmits<{ "row-click": [row: T]; retry: [] }>();
const scrollport = ref<HTMLElement>();
const { fullscreen, saveScroll } = useTableViewport(props, scrollport);
const { keyOf, allState, toggleAll, toggleRow } = useRowSelection(
  props,
  selected,
);
const { groups, toggleSort, ariaSort } = useRowOrdering(props, sort);
const toggleExpand = useRowExpansion(keyOf, expanded);
const {
  hidden,
  visibleColumns,
  lastLeft,
  firstRight,
  toggleColumn,
  stickyStyle,
} = useTableColumns(props);
const range = useTableRange(props, page, pageSize);
const collapsed = ref(new Set<string>());
function toggleGroup(key: string) {
  collapsed.value.has(key)
    ? collapsed.value.delete(key)
    : collapsed.value.add(key);
  collapsed.value = new Set(collapsed.value);
}
const { keyRow, clickRow, doubleClickRow } = useRowNavigation(
  props,
  (row) => emit("row-click", row),
  () => Boolean(slots.expanded),
  toggleExpand,
);
const colCount = computed(
  () => visibleColumns.value.length + (props.selectable ? 1 : 0),
);
const hasToolbar = computed(
  () =>
    props.title ||
    props.meta ||
    slots["toolbar"] ||
    slots["search"] ||
    props.settings ||
    props.fullscreenable,
);
const showFooter = computed(() => props.total !== undefined);
</script>

<template>
  <section
    class="data-table relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface"
    :class="[
      fullscreen
        ? 'fixed inset-0 z-[60]'
        : !flat && 'rounded-lg border border-line',
      fill && 'flex-1',
    ]"
    :aria-label="title ?? '数据表格'"
    :aria-busy="Boolean(loading)"
  >
    <header
      v-if="hasToolbar"
      class="flex min-h-12 shrink-0 flex-wrap items-center gap-3 pb-2"
      :class="!flat && 'px-4 pt-3'"
    >
      <slot name="search" />
      <h2 v-if="title" class="text-[15px] font-semibold">{{ title }}</h2>
      <span v-if="meta" class="text-help text-fg-faint tabular-nums">{{
        meta
      }}</span>
      <span class="hidden flex-1 sm:block" />
      <slot name="toolbar" />
      <PopoverRoot v-if="settings">
        <Tip text="列设置">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="grid size-8 place-items-center rounded-md border border-line-strong text-fg-muted hover:bg-subtle"
              aria-label="列设置"
            >
              <Columns3 class="size-4" />
            </button>
          </PopoverTrigger>
        </Tip>
        <PopoverPortal>
          <PopoverContent
            :collision-padding="12"
            align="end"
            :side-offset="6"
            class="z-[100] w-52 rounded-lg border border-line bg-surface p-2 popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]"
          >
            <p class="px-2 pt-1 pb-2 text-xs text-fg-faint">显示的列</p>
            <div
              v-for="c in columns"
              :key="c.key"
              class="flex h-8 items-center rounded-md px-2 hover:bg-muted"
            >
              <UiCheckbox
                :model-value="!hidden.has(c.key)"
                :label="c.title"
                @update:model-value="(v) => toggleColumn(c.key, v)"
              />
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <Tip v-if="fullscreenable" :text="fullscreen ? '退出全屏' : '全屏'">
        <button
          type="button"
          class="grid size-8 place-items-center rounded-md border border-line-strong text-fg-muted hover:bg-subtle"
          :aria-label="fullscreen ? '退出全屏' : '全屏'"
          @click="fullscreen = !fullscreen"
        >
          <Minimize2 v-if="fullscreen" class="size-4" /><Maximize2
            v-else
            class="size-4"
          />
        </button>
      </Tip>
    </header>

    <div
      ref="scrollport"
      data-table-scroll
      @scroll="saveScroll"
      class="min-h-0 flex-1 overflow-auto border border-line rounded-md"
      :style="{
        maxHeight: fullscreen || fill ? 'none' : (maxHeight ?? 'none'),
      }"
    >
      <table class="w-full min-w-max border-separate border-spacing-0">
        <thead>
          <tr>
            <th
              v-if="selectable"
              class="sticky top-0 left-0 z-30 h-10 border-b border-line bg-subtle pl-4 text-left"
              :style="{
                width: SELECT_WIDTH + 'px',
                minWidth: SELECT_WIDTH + 'px',
              }"
            >
              <UiCheckbox
                :model-value="allState"
                aria-label="选择当前页全部"
                @update:model-value="toggleAll"
              />
            </th>
            <th
              v-for="c in visibleColumns"
              :key="c.key"
              scope="col"
              :aria-sort="ariaSort(c)"
              class="sticky top-0 h-10 border-b border-line bg-subtle px-(--cell-px) align-middle text-help font-medium whitespace-nowrap text-fg"
              :class="[
                cellClass(c),
                c.sticky ? ['z-20 sm:z-30', stickyPosition(c)] : 'z-20',
                c.key === lastLeft && 'sm:shadow-[1px_0_0_var(--line)]',
                c.key === firstRight && 'sm:shadow-[-1px_0_0_var(--line)]',
                c.sortable && 'cursor-pointer select-none hover:text-fg',
              ]"
              :style="{ ...widthStyle(c), ...stickyStyle(c) }"
              :tabindex="c.sortable ? 0 : undefined"
              @keydown.enter="toggleSort(c)"
              @keydown.space.prevent="toggleSort(c)"
              @click="toggleSort(c)"
            >
              <span
                class="inline-flex flex-col"
                :class="
                  (c.kind === 'number' ||
                    c.kind === 'delta' ||
                    c.align === 'right') &&
                  'items-end'
                "
              >
                <span class="inline-flex items-center gap-1">
                  {{ c.title }}
                  <template v-if="c.sortable">
                    <ArrowUp
                      v-if="sort?.key === c.key && sort.dir === 'asc'"
                      class="size-3.5 text-primary-text"
                    />
                    <ArrowDown
                      v-else-if="sort?.key === c.key"
                      class="size-3.5 text-primary-text"
                    />
                    <ChevronsUpDown v-else class="size-3.5 text-fg-faint" />
                  </template>
                </span>
                <span
                  v-if="c.unit"
                  class="text-[12px] leading-none font-normal text-fg-faint"
                  >{{ c.unit }}</span
                >
              </span>
            </th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="n in 6" :key="n">
            <td v-if="selectable" class="h-(--row-h) border-b border-line" />
            <td
              v-for="c in visibleColumns"
              :key="c.key"
              class="h-(--row-h) border-b border-line px-(--cell-px)"
            >
              <Skeleton
                :width="c.kind === 'number' ? '40px' : '70%'"
                :class="c.kind === 'number' && 'ml-auto'"
              />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="error">
          <tr>
            <td :colspan="colCount">
              <div role="alert">
                <EmptyState title="读取失败" :hint="error"
                  ><UiButton
                    v-if="retryable"
                    variant="secondary"
                    icon="refresh"
                    @click="emit('retry')"
                    >重新读取</UiButton
                  ></EmptyState
                >
              </div>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="rows.length === 0">
          <tr>
            <td :colspan="colCount">
              <slot name="empty"
                ><EmptyState :title="emptyTitle" :hint="emptyHint"
              /></slot>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <template v-for="g in groups" :key="g.key">
            <tr v-if="groupBy">
              <td
                :colspan="colCount"
                class="h-10 border-b border-line bg-subtle px-4 font-semibold hover:bg-muted"
              >
                <button
                  type="button"
                  class="flex min-h-10 w-full items-center gap-2 text-left"
                  :aria-expanded="!collapsed.has(g.key)"
                  :aria-label="`${collapsed.has(g.key) ? '展开' : '收起'}${g.key || '未分组'}分组`"
                  @click="toggleGroup(g.key)"
                >
                  <ChevronDown
                    class="size-4 text-fg-faint transition-transform duration-(--motion-normal)"
                    :class="collapsed.has(g.key) && '-rotate-90'"
                    aria-hidden="true"
                  />
                  <slot name="group" :label="g.key" :rows="g.rows">{{
                    g.key
                  }}</slot>
                  <span class="font-normal text-fg-faint tabular-nums"
                    >{{ g.rows.length }} 项</span
                  >
                </button>
              </td>
            </tr>
            <template v-for="row in g.rows" :key="keyOf(row)">
              <tr
                v-show="!collapsed.has(g.key)"
                class="group/row"
                :class="[
                  rowClickable &&
                    'cursor-pointer focus-visible:outline-offset-[-2px]',
                  selected.includes(keyOf(row)) && 'is-selected',
                ]"
                :tabindex="rowClickable ? 0 : undefined"
                @keydown="keyRow($event, row)"
                @dblclick="doubleClickRow($event, row)"
                @click="clickRow($event, row)"
              >
                <td
                  v-if="selectable"
                  class="sticky left-0 z-10 h-(--row-h) border-b border-line bg-surface pl-4 group-hover/row:bg-subtle group-[.is-selected]/row:bg-primary-soft"
                >
                  <UiCheckbox
                    :model-value="selected.includes(keyOf(row))"
                    :aria-label="`选择第 ${keyOf(row)} 行`"
                    @update:model-value="(v) => toggleRow(row, v)"
                  />
                </td>
                <td
                  v-for="c in visibleColumns"
                  :key="c.key"
                  class="h-(--row-h) border-b border-line bg-surface px-(--cell-px) py-2 align-middle transition-colors group-hover/row:bg-subtle group-[.is-selected]/row:bg-primary-soft"
                  :class="[
                    cellClass(c),
                    c.sticky && ['sm:sticky sm:z-10', stickyPosition(c)],
                    c.key === lastLeft && 'sm:shadow-[1px_0_0_var(--line)]',
                    c.key === firstRight && 'sm:shadow-[-1px_0_0_var(--line)]',
                    c.kind === 'delta' && deltaTone(cell(row, c.key)),
                  ]"
                  :style="stickyStyle(c)"
                >
                  <div
                    :class="
                      slots['expanded'] &&
                      c.key === visibleColumns[0]?.key && [
                        'flex items-center gap-2',
                        cellAlignment(c) === 'right'
                          ? 'justify-end'
                          : cellAlignment(c) === 'center'
                            ? 'justify-center'
                            : 'justify-start',
                      ]
                    "
                  >
                    <button
                      v-if="
                        slots['expanded'] && c.key === visibleColumns[0]?.key
                      "
                      type="button"
                      class="grid size-6 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
                      :aria-label="`${expanded.includes(keyOf(row)) ? '收起' : '展开'}${show(c, row)}详情`"
                      :aria-expanded="expanded.includes(keyOf(row))"
                      @click.stop="toggleExpand(row)"
                    >
                      <ChevronDown
                        class="size-4 transition-transform duration-(--motion-normal)"
                        :class="!expanded.includes(keyOf(row)) && '-rotate-90'"
                        aria-hidden="true"
                      />
                    </button>
                    <slot
                      :name="`cell-${c.key}`"
                      :row="row"
                      :value="cell(row, c.key)"
                    >
                      <template
                        v-if="
                          c.kind === 'delta' &&
                          typeof cell(row, c.key) === 'number'
                        "
                      >
                        <span
                          v-if="(cell(row, c.key) as number) !== 0"
                          aria-hidden="true"
                          >{{
                            (cell(row, c.key) as number) > 0 ? "▲" : "▼"
                          }} </span
                        >{{ Math.abs(cell(row, c.key) as number).toFixed(1) }}
                      </template>
                      <template v-else>{{ show(c, row) }}</template>
                    </slot>
                  </div>
                </td>
              </tr>
              <tr
                v-if="
                  slots['expanded'] &&
                  expanded.includes(keyOf(row)) &&
                  !collapsed.has(g.key)
                "
              >
                <td
                  :colspan="colCount"
                  class="border-b border-line bg-subtle px-6 py-3 text-fg-muted"
                >
                  <slot name="expanded" :row="row" />
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <Transition
      enter-from-class="opacity-0 translate-y-4"
      enter-active-class="transition duration-(--motion-normal) ease-(--ease)"
      leave-active-class="transition duration-(--motion-fast)"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="selectable && selected.length"
        class="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl bg-fg py-2 pr-2 pl-4 text-surface popup-surface"
        role="toolbar"
        aria-label="批量操作"
      >
        <span class="tabular-nums"
          >已选 <b>{{ selected.length }}</b> 项</span
        >
        <span class="mx-1 h-5 w-px bg-surface/20" />
        <slot
          name="bulk"
          :count="selected.length"
          :clear="() => (selected = [])"
        />
        <button
          type="button"
          class="h-7 rounded-md px-2.5 text-help text-surface/70 hover:bg-surface/10 hover:text-surface"
          @click="selected = []"
        >
          取消选择
        </button>
      </div>
    </Transition>
    <footer
      v-if="showFooter"
      class="flex shrink-0 flex-wrap items-center gap-3 border-t border-line py-3 text-help text-fg-muted"
      :class="!flat && 'px-4'"
    >
      <span class="tabular-nums">{{ range }}</span>
      <slot name="footer" />
      <span class="flex-1" />
      <Pagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="total!"
        :sizes="sizes"
        :loading="loading || Boolean(error)"
      />
    </footer>
  </section>
</template>
