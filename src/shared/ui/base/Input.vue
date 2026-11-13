<script setup lang="ts">
import { useAttrs } from "vue";
import { useFieldControl } from "../lib/field";
defineOptions({ inheritAttrs: false });
const model = defineModel<string>({ default: "" });
const props = defineProps<{
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "md" | "lg";
  align?: "left" | "right";

  unit?: boolean;
  inputmode?:
    "text" | "decimal" | "numeric" | "search" | "email" | "tel" | "url";
  autocomplete?: string;
  id?: string;
  name?: string;
}>();
const attrs = useAttrs();
const { attributes, invalid: fieldInvalid } = useFieldControl(() => ({
  id: props.id,
  label: attrs["aria-label"] as string | undefined,
  labelledBy: attrs["aria-labelledby"] as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  invalid:
    props.invalid ||
    attrs["aria-invalid"] === true ||
    attrs["aria-invalid"] === "true",
}));
</script>
<template>
  <div
    class="group flex w-full items-center overflow-hidden control-surface rounded-md border bg-surface transition-[border-color,box-shadow] duration-(--motion-fast) focus-within:border-primary focus-within:shadow-[0_0_0_2px_var(--ring)] hover:border-fg-muted"
    :data-invalid="fieldInvalid() || undefined"
    :class="[
      size === 'lg' ? 'h-(--control-h-lg)' : 'h-(--control-h)',
      fieldInvalid()
        ? 'border-bad focus-within:border-bad'
        : 'border-control-line',
      disabled && 'pointer-events-none opacity-50',
    ]"
  >
    <span v-if="$slots.prefix" class="flex items-center pl-2.5 text-fg-faint"
      ><slot name="prefix"
    /></span>
    <input
      v-bind="{ ...$attrs, ...attributes() }"
      :name="name"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      class="h-full min-w-0 flex-1 bg-transparent px-2.5 text-fg outline-none placeholder:text-fg-faint tabular-nums"
      :class="align === 'right' && 'text-right'"
    />
    <span
      v-if="$slots.suffix"
      class="flex h-full items-center px-2.5 text-help text-fg-muted"
      :class="unit && 'border-l border-line bg-muted'"
      ><slot name="suffix"
    /></span>
  </div>
</template>
