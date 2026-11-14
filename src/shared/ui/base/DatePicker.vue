<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarPrev,
  CalendarNext,
  CalendarGrid,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarGridBody,
  CalendarCell,
  CalendarCellTrigger,
} from "reka-ui";
import {
  parseDate,
  today,
  getLocalTimeZone,
  type DateValue,
} from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-vue-next";
import { useFieldControl } from "../lib/field";

defineOptions({ inheritAttrs: false });
const model = defineModel<string>({ default: "" });
const props = defineProps<{
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}>();
const open = ref(false);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false;
  },
);
const trigger = ref<HTMLButtonElement>();
function clear() {
  if (props.disabled) return;
  model.value = "";
  open.value = false;
  void nextTick(() => trigger.value?.focus());
}
const value = computed<DateValue | undefined>({
  get: () => (model.value ? parseDate(model.value) : undefined),
  set: (v) => {
    if (props.disabled) return;
    model.value = v ? v.toString() : "";
    open.value = false;
  },
});
const shown = computed(() =>
  model.value
    ? model.value.replace(
        /^(\d+)-(\d+)-(\d+)$/,
        (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`,
      )
    : "",
);
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
              : (ariaLabel ?? placeholder ?? '选择日期')
          "
          class="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left"
        >
          <CalendarDays class="size-4 shrink-0 text-fg-faint" />
          <span
            class="min-w-0 flex-1 truncate tabular-nums"
            :class="!shown && 'text-fg-faint'"
            >{{ shown || placeholder || "选择日期" }}</span
          >
        </button>
      </PopoverTrigger>
      <button
        v-if="model"
        type="button"
        class="mr-2 grid size-6 shrink-0 place-items-center rounded-sm text-fg-muted hover:bg-muted hover:text-fg"
        aria-label="清除日期"
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
        class="z-[100] rounded-lg border border-line bg-surface p-3 popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]"
      >
        <CalendarRoot
          v-slot="{ weekDays, grid }"
          v-model="value"
          :disabled="disabled"
          locale="zh-CN"
          :week-starts-on="1"
          :placeholder="value ?? today(getLocalTimeZone())"
          :min-value="min ? parseDate(min) : undefined"
          :max-value="max ? parseDate(max) : undefined"
          fixed-weeks
        >
          <CalendarHeader class="mb-2 flex items-center justify-between">
            <CalendarPrev
              class="grid size-7 place-items-center rounded-md hover:bg-muted"
              aria-label="上个月"
              ><ChevronLeft class="size-4"
            /></CalendarPrev>
            <CalendarHeading class="font-semibold" />
            <CalendarNext
              class="grid size-7 place-items-center rounded-md hover:bg-muted"
              aria-label="下个月"
              ><ChevronRight class="size-4"
            /></CalendarNext>
          </CalendarHeader>
          <CalendarGrid
            v-for="m in grid"
            :key="m.value.toString()"
            class="border-collapse"
          >
            <CalendarGridHead
              ><CalendarGridRow
                ><CalendarHeadCell
                  v-for="d in weekDays"
                  :key="d"
                  class="size-9 text-xs font-normal text-fg-faint"
                  >{{ d }}</CalendarHeadCell
                ></CalendarGridRow
              ></CalendarGridHead
            >
            <CalendarGridBody>
              <CalendarGridRow v-for="(week, i) in m.rows" :key="i">
                <CalendarCell
                  v-for="d in week"
                  :key="d.toString()"
                  :date="d"
                  class="p-0"
                >
                  <CalendarCellTrigger
                    :day="d"
                    :month="m.value"
                    class="grid size-9 place-items-center rounded-md tabular-nums outline-none hover:bg-muted focus-visible:shadow-[0_0_0_2px_var(--ring)] data-[disabled]:pointer-events-none data-[disabled]:opacity-30 data-[outside-view]:text-fg-faint data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-primary-ink data-[today]:font-semibold data-[today]:text-primary-text data-[unavailable]:line-through"
                  />
                </CalendarCell>
              </CalendarGridRow>
            </CalendarGridBody>
          </CalendarGrid>
        </CalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
