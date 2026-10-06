<script setup lang="ts">
import { computed, ref } from "vue";
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, RangeCalendarRoot, RangeCalendarHeader, RangeCalendarHeading, RangeCalendarPrev, RangeCalendarNext, RangeCalendarGrid, RangeCalendarGridHead, RangeCalendarGridRow, RangeCalendarHeadCell, RangeCalendarGridBody, RangeCalendarCell, RangeCalendarCellTrigger } from "reka-ui";
import { parseDate, today, getLocalTimeZone, startOfMonth, type DateValue } from "@internationalized/date";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-vue-next";
/** 日期范围：值为 ["YYYY-MM-DD", "YYYY-MM-DD"]，空数组表示未选。左边是常用范围，右边是两个月的日历。 */
const model = defineModel<string[]>({ default: () => [] });
defineProps<{ placeholder?: string; ariaLabel?: string }>();
const open = ref(false);
type Range = { start: DateValue | undefined; end: DateValue | undefined };
const value = computed<Range>({
  get: () => ({ start: model.value[0] ? parseDate(model.value[0]) : undefined, end: model.value[1] ? parseDate(model.value[1]) : undefined }),
  set: (v) => { if (v.start && v.end) { model.value = [v.start.toString(), v.end.toString()]; open.value = false; } },
});
const fmt = (s: string) => s.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}/${Number(m)}/${Number(d)}`);
const shown = computed(() => (model.value.length === 2 ? `${fmt(model.value[0]!)} – ${fmt(model.value[1]!)}` : ""));
const now = today(getLocalTimeZone());
const presets = [
  { label: "最近 7 天", range: [now.subtract({ days: 6 }), now] },
  { label: "最近 30 天", range: [now.subtract({ days: 29 }), now] },
  { label: "本月", range: [startOfMonth(now), now] },
  { label: "上个月", range: [startOfMonth(now.subtract({ months: 1 })), startOfMonth(now).subtract({ days: 1 })] },
] as const;
function pick(r: readonly [DateValue, DateValue]) { model.value = [r[0].toString(), r[1].toString()]; open.value = false; }
</script>
<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button type="button" :aria-label="ariaLabel ?? placeholder ?? '选择日期范围'" class="flex h-(--control-h) w-full items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-left transition-[border-color,box-shadow] hover:border-fg-faint data-[state=open]:border-primary data-[state=open]:shadow-[0_0_0_3px_var(--ring)]">
        <CalendarRange class="size-4 text-fg-faint" />
        <span class="flex-1 truncate tabular-nums" :class="!shown && 'text-fg-faint'">{{ shown || placeholder || "选择日期范围" }}</span>
        <span v-if="shown" role="button" tabindex="-1" class="grid size-5 place-items-center rounded-sm text-fg-faint hover:bg-muted hover:text-fg" aria-label="清除日期范围" @click.stop="model = []"><X class="size-3.5" /></span>
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent align="start" :side-offset="6" class="z-[100] flex rounded-lg border border-line bg-surface shadow-pop data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <div class="flex w-32 flex-col gap-0.5 border-r border-line p-2">
          <button v-for="p in presets" :key="p.label" type="button" class="h-8 rounded-md px-2.5 text-left hover:bg-muted" @click="pick(p.range)">{{ p.label }}</button>
        </div>
        <RangeCalendarRoot v-slot="{ weekDays, grid }" v-model="value" locale="zh-CN" :week-starts-on="1" :number-of-months="2" :placeholder="value.start ?? now.subtract({ months: 1 })" fixed-weeks class="p-3">
          <RangeCalendarHeader class="mb-2 flex items-center justify-between">
            <RangeCalendarPrev class="grid size-7 place-items-center rounded-md hover:bg-muted" aria-label="上个月"><ChevronLeft class="size-4" /></RangeCalendarPrev>
            <RangeCalendarHeading class="font-semibold" />
            <RangeCalendarNext class="grid size-7 place-items-center rounded-md hover:bg-muted" aria-label="下个月"><ChevronRight class="size-4" /></RangeCalendarNext>
          </RangeCalendarHeader>
          <div class="flex gap-4">
            <RangeCalendarGrid v-for="m in grid" :key="m.value.toString()" class="border-collapse">
              <RangeCalendarGridHead><RangeCalendarGridRow><RangeCalendarHeadCell v-for="d in weekDays" :key="d" class="size-9 text-xs font-normal text-fg-faint">{{ d }}</RangeCalendarHeadCell></RangeCalendarGridRow></RangeCalendarGridHead>
              <RangeCalendarGridBody>
                <RangeCalendarGridRow v-for="(week, i) in m.rows" :key="i">
                  <RangeCalendarCell v-for="d in week" :key="d.toString()" :date="d" class="p-0 data-[selected]:bg-primary-soft first:data-[selected]:rounded-l-md last:data-[selected]:rounded-r-md">
                    <RangeCalendarCellTrigger :day="d" :month="m.value" class="grid size-9 place-items-center rounded-md tabular-nums outline-none hover:bg-muted data-[outside-view]:text-fg-faint data-[outside-view]:opacity-50 data-[selection-end]:bg-primary data-[selection-end]:text-primary-ink data-[selection-start]:bg-primary data-[selection-start]:text-primary-ink data-[today]:font-semibold" />
                  </RangeCalendarCell>
                </RangeCalendarGridRow>
              </RangeCalendarGridBody>
            </RangeCalendarGrid>
          </div>
        </RangeCalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
