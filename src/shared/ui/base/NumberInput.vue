<script setup lang="ts">
import { NumberFieldRoot, NumberFieldInput, NumberFieldIncrement, NumberFieldDecrement } from "reka-ui";
import { Minus, Plus } from "lucide-vue-next";
/** 数字输入：带加减按钮、上下限、步长与单位；金额等用 decimals 固定小数位。 */
const model = defineModel<number | undefined>();
defineProps<{ min?: number; max?: number; step?: number; decimals?: number; unit?: string; disabled?: boolean; id?: string; ariaLabel?: string }>();
</script>
<template>
  <NumberFieldRoot v-model="model" :min="min" :max="max" :step="step ?? 1" :disabled="disabled" :format-options="decimals !== undefined ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : undefined" locale="zh-CN" class="flex h-(--control-h) w-full items-center overflow-hidden rounded-md border border-line-strong bg-surface transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)] hover:border-fg-faint data-[disabled]:opacity-50">
    <NumberFieldDecrement class="grid h-full w-8 place-items-center text-fg-muted hover:bg-muted disabled:opacity-30" aria-label="减少"><Minus class="size-3.5" /></NumberFieldDecrement>
    <NumberFieldInput :id="id" :aria-label="ariaLabel" class="h-full min-w-0 flex-1 bg-transparent px-1 text-center tabular-nums outline-none" />
    <span v-if="unit" class="pr-1 text-[13px] text-fg-faint">{{ unit }}</span>
    <NumberFieldIncrement class="grid h-full w-8 place-items-center text-fg-muted hover:bg-muted disabled:opacity-30" aria-label="增加"><Plus class="size-3.5" /></NumberFieldIncrement>
  </NumberFieldRoot>
</template>
