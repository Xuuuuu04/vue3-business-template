<script setup lang="ts">
import {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
} from "reka-ui";
import { Minus, Plus } from "lucide-vue-next";
import { useFieldControl } from "../lib/field";

defineOptions({ inheritAttrs: false });
const model = defineModel<number | undefined>();
const props = defineProps<{
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  unit?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}>();
const {
  attributes,
  invalid: fieldInvalid,
  rootAttributes,
} = useFieldControl(() => ({ id: props.id, label: props.ariaLabel }));
</script>
<template>
  <NumberFieldRoot
    v-bind="rootAttributes()"
    v-model="model"
    :min="min"
    :max="max"
    :step="step ?? 1"
    :disabled="disabled"
    :format-options="
      decimals !== undefined
        ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
        : undefined
    "
    locale="zh-CN"
    :data-invalid="fieldInvalid() || undefined"
    class="flex h-(--control-h) w-full items-center overflow-hidden control-surface rounded-md border border-line bg-surface transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_2px_var(--ring)] hover:border-line-strong data-[disabled]:opacity-50"
  >
    <NumberFieldDecrement
      class="grid h-full w-8 place-items-center text-fg-muted hover:bg-muted disabled:opacity-30"
      aria-label="减少"
      ><Minus class="size-3.5"
    /></NumberFieldDecrement>
    <NumberFieldInput
      v-bind="attributes()"
      class="h-full min-w-0 flex-1 bg-transparent px-1 text-center tabular-nums outline-none"
    />
    <span v-if="unit" class="pr-1 text-help text-fg-faint">{{ unit }}</span>
    <NumberFieldIncrement
      class="grid h-full w-8 place-items-center text-fg-muted hover:bg-muted disabled:opacity-30"
      aria-label="增加"
      ><Plus class="size-3.5"
    /></NumberFieldIncrement>
  </NumberFieldRoot>
</template>
