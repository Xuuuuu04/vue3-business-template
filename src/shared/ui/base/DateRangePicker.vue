<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  RangeCalendarRoot,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarPrev,
  RangeCalendarNext,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarGridBody,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
} from "reka-ui";
import {
  parseDate,
  today,
  getLocalTimeZone,
  startOfMonth,
  type DateValue,
} from "@internationalized/date";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-vue-next";
import { useFieldControl } from "../lib/field";

defineOptions({ inheritAttrs: false });
const model = defineModel<string[]>({ default: () => [] });
const props = defineProps<{
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}>();
const open = ref(false);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false;
  },
);
const months = ref(2);
let viewport: MediaQueryList | undefined;
function adaptCalendar() {
  months.value = viewport?.matches ? 1 : 2;
}
onMounted(() => {
  viewport = window.matchMedia("(max-width: 639px)");
  adaptCalendar();
  viewport.addEventListener("change", adaptCalendar);
});
onBeforeUnmount(() => viewport?.removeEventListener("change", adaptCalendar));
const trigger = ref<HTMLButtonElement>();
function clear() {
  if (props.disabled) return;
  model.value = [];
  open.value = false;
  void nextTick(() => trigger.value?.focus());
}
type Range = { start: DateValue | undefined; end: DateValue | undefined };
const value = computed<Range>({
  get: () => ({
    start: model.value[0] ? parseDate(model.value[0]) : undefined,
    end: model.value[1] ? parseDate(model.value[1]) : undefined,
  }),
  set: (v) => {
    if (!props.disabled && v.start && v.end) {
      model.value = [v.start.toString(), v.end.toString()];
      open.value = false;
    }
  },
});
const fmt = (s: string) =>
  s.replace(
    /^(\d+)-(\d+)-(\d+)$/,
    (_, y, m, d) => `${y}/${Number(m)}/${Number(d)}`,
  );
const shown = computed(() =>
  model.value.length === 2
    ? `${fmt(model.value[0]!)} – ${fmt(model.value[1]!)}`
    : "",
);
const now = today(getLocalTimeZone());
const presets = [
  { label: "最近 7 天", range: [now.subtract({ days: 6 }), now] },
  { label: "最近 30 天", range: [now.subtract({ days: 29 }), now] },
  { label: "本月", range: [startOfMonth(now), now] },
  {
    label: "上个月",
    range: [
      startOfMonth(now.subtract({ months: 1 })),
      startOfMonth(now).subtract({ days: 1 }),
    ],
  },
] as const;
function pick(r: readonly [DateValue, DateValue]) {
  if (props.disabled) return;
  model.value = [r[0].toString(), r[1].toString()];
  open.value = false;
}
const {
  attributes,
  invalid: fieldInvalid,
  rootAttributes,
} = useFieldControl(() => ({ id: props.id, label: props.ariaLabel }));
</script>
<template>
  <PopoverRoot v-model:open="open">
    <div
      v-bind="rootAttributes()"
      :data-invalid="fieldInvalid() || undefined"
      class="control-surface flex h-(--control-h) w-full items-center rounded-md border bg-surface transition-[border-color,box-shadow] hover:border-fg-muted focus-within:shadow-[0_0_0_2px_var(--ring)]"
      :class="[
        open ? 'border-primary' : 'border-control-line',
        disabled && 'opacity-50',
      ]"
    >
      <PopoverTrigger as-child>
        <button
          ref="trigger"
          type="button"
          v-bind="attributes()"
          :disabled="disabled"
          :aria-label="
            attributes()['aria-labelledby']
              ? undefined
              : (ariaLabel ?? placeholder ?? '选择日期范围')
          "
          class="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left"
        >
          <CalendarRange class="size-4 shrink-0 text-fg-faint" />
          <span
            class="min-w-0 flex-1 truncate tabular-nums"
            :class="!shown && 'text-fg-faint'"
            >{{ shown || placeholder || "选择日期范围" }}</span
          >
        </button>
      </PopoverTrigger>
      <button
        v-if="shown"
        type="button"
        class="mr-2 grid size-6 shrink-0 place-items-center rounded-sm text-fg-muted hover:bg-muted hover:text-fg"
        aria-label="清除日期范围"
        :disabled="disabled"
        @click="clear"
      >
        <X class="size-3.5" />
      </button>
    </div>
    <PopoverPortal>
      <PopoverContent
        :collision-padding="12"
        align="start"
        :side-offset="6"
        class="z-[100] flex max-w-[calc(100vw-24px)] overflow-auto rounded-lg border border-line bg-surface popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]"
      >
        <div
          class="hidden w-32 shrink-0 flex-col sm:flex gap-0.5 border-r border-line p-2"
        >
          <button
            v-for="p in presets"
            :key="p.label"
            type="button"
            :disabled="disabled"
            class="h-8 rounded-md px-2.5 text-left hover:bg-muted"
            @click="pick(p.range)"
          >
            {{ p.label }}
          </button>
        </div>
        <RangeCalendarRoot
          v-slot="{ weekDays, grid }"
          v-model="value"
          :disabled="disabled"
          locale="zh-CN"
          :week-starts-on="1"
          :number-of-months="months"
          :placeholder="value.start ?? now.subtract({ months: 1 })"
          fixed-weeks
          class="p-3"
        >
          <RangeCalendarHeader class="mb-2 flex items-center justify-between">
            <RangeCalendarPrev
              class="grid size-7 place-items-center rounded-md hover:bg-muted"
              aria-label="上个月"
              ><ChevronLeft class="size-4"
            /></RangeCalendarPrev>
            <RangeCalendarHeading class="font-semibold" />
            <RangeCalendarNext
              class="grid size-7 place-items-center rounded-md hover:bg-muted"
              aria-label="下个月"
              ><ChevronRight class="size-4"
            /></RangeCalendarNext>
          </RangeCalendarHeader>
          <div class="flex gap-4">
            <RangeCalendarGrid
              v-for="m in grid"
              :key="m.value.toString()"
              class="border-collapse"
            >
              <RangeCalendarGridHead
                ><RangeCalendarGridRow
                  ><RangeCalendarHeadCell
                    v-for="d in weekDays"
                    :key="d"
                    class="size-9 text-xs font-normal text-fg-faint"
                    >{{ d }}</RangeCalendarHeadCell
                  ></RangeCalendarGridRow
                ></RangeCalendarGridHead
              >
              <RangeCalendarGridBody>
                <RangeCalendarGridRow v-for="(week, i) in m.rows" :key="i">
                  <RangeCalendarCell
                    v-for="d in week"
                    :key="d.toString()"
                    :date="d"
                    class="p-0 data-[selected]:bg-primary-soft first:data-[selected]:rounded-l-md last:data-[selected]:rounded-r-md"
                  >
                    <RangeCalendarCellTrigger
                      :day="d"
                      :month="m.value"
                      class="grid size-9 place-items-center rounded-md tabular-nums outline-none hover:bg-muted data-[outside-view]:text-fg-faint data-[outside-view]:opacity-50 data-[selection-end]:bg-primary data-[selection-end]:text-primary-ink data-[selection-start]:bg-primary data-[selection-start]:text-primary-ink data-[today]:font-semibold"
                    />
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
