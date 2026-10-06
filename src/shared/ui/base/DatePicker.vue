<script setup lang="ts">
import { computed, ref } from "vue";
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, CalendarRoot, CalendarHeader, CalendarHeading, CalendarPrev, CalendarNext, CalendarGrid, CalendarGridHead, CalendarGridRow, CalendarHeadCell, CalendarGridBody, CalendarCell, CalendarCellTrigger } from "reka-ui";
import { parseDate, today, getLocalTimeZone, type DateValue } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-vue-next";
/** 日期选择：值为 "YYYY-MM-DD" 字符串，空字符串表示未选。周一开始，可清除。 */
const model = defineModel<string>({ default: "" });
defineProps<{ placeholder?: string; ariaLabel?: string; min?: string; max?: string }>();
const open = ref(false);
const value = computed<DateValue | undefined>({
  get: () => (model.value ? parseDate(model.value) : undefined),
  set: (v) => { model.value = v ? v.toString() : ""; open.value = false; },
});
const shown = computed(() => (model.value ? model.value.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`) : ""));
</script>
<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button type="button" :aria-label="ariaLabel ?? placeholder ?? '选择日期'" class="group flex h-(--control-h) w-full items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 text-left transition-[border-color,box-shadow] hover:border-fg-faint data-[state=open]:border-primary data-[state=open]:shadow-[0_0_0_3px_var(--ring)]">
        <CalendarDays class="size-4 text-fg-faint" />
        <span class="flex-1 truncate tabular-nums" :class="!shown && 'text-fg-faint'">{{ shown || placeholder || "选择日期" }}</span>
        <span v-if="model" role="button" tabindex="-1" class="grid size-5 place-items-center rounded-sm text-fg-faint hover:bg-muted hover:text-fg" aria-label="清除日期" @click.stop="model = ''"><X class="size-3.5" /></span>
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent align="start" :side-offset="6" class="z-[100] rounded-lg border border-line bg-surface p-3 shadow-pop data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <CalendarRoot v-slot="{ weekDays, grid }" v-model="value" locale="zh-CN" :week-starts-on="1" :placeholder="value ?? today(getLocalTimeZone())" :min-value="min ? parseDate(min) : undefined" :max-value="max ? parseDate(max) : undefined" fixed-weeks>
          <CalendarHeader class="mb-2 flex items-center justify-between">
            <CalendarPrev class="grid size-7 place-items-center rounded-md hover:bg-muted" aria-label="上个月"><ChevronLeft class="size-4" /></CalendarPrev>
            <CalendarHeading class="font-semibold" />
            <CalendarNext class="grid size-7 place-items-center rounded-md hover:bg-muted" aria-label="下个月"><ChevronRight class="size-4" /></CalendarNext>
          </CalendarHeader>
          <CalendarGrid v-for="m in grid" :key="m.value.toString()" class="border-collapse">
            <CalendarGridHead><CalendarGridRow><CalendarHeadCell v-for="d in weekDays" :key="d" class="size-9 text-xs font-normal text-fg-faint">{{ d }}</CalendarHeadCell></CalendarGridRow></CalendarGridHead>
            <CalendarGridBody>
              <CalendarGridRow v-for="(week, i) in m.rows" :key="i">
                <CalendarCell v-for="d in week" :key="d.toString()" :date="d" class="p-0">
                  <CalendarCellTrigger :day="d" :month="m.value" class="grid size-9 place-items-center rounded-md tabular-nums outline-none hover:bg-muted focus-visible:shadow-[0_0_0_2px_var(--ring)] data-[disabled]:pointer-events-none data-[disabled]:opacity-30 data-[outside-view]:text-fg-faint data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-primary-ink data-[today]:font-semibold data-[today]:text-primary-text data-[unavailable]:line-through" />
                </CalendarCell>
              </CalendarGridRow>
            </CalendarGridBody>
          </CalendarGrid>
        </CalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
