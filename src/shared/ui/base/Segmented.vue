<script setup lang="ts">
import { nextTick } from "vue";

const model = defineModel<string>({ required: true });
const props = defineProps<{
  options: { value: string; label: string }[];
  ariaLabel?: string;
  size?: "sm" | "md";
}>();
function move(event: KeyboardEvent, value: string) {
  const keys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];
  if (!keys.includes(event.key) || !props.options.length) return;
  event.preventDefault();
  const index = props.options.findIndex((o) => o.value === value);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? props.options.length - 1
        : (index +
            (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
            props.options.length) %
          props.options.length;
  model.value = props.options[next]!.value;
  const group = (event.currentTarget as HTMLElement).parentElement;
  void nextTick(() =>
    group?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(),
  );
}
</script>
<template>
  <div
    class="inline-flex w-fit gap-0.5 rounded-lg bg-subtle p-1"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :tabindex="
        model === o.value ||
        (!options.some((item) => item.value === model) && o === options[0])
          ? 0
          : -1
      "
      @keydown="move($event, o.value)"
      class="rounded-sm px-3 whitespace-nowrap transition-colors"
      :class="[
        size === 'sm' ? 'h-7 text-label' : 'h-8',
        model === o.value
          ? 'bg-surface font-medium text-fg shadow-card'
          : 'text-fg-muted hover:text-fg',
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
