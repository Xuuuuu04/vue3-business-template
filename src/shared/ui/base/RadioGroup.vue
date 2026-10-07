<script setup lang="ts">
import { RadioGroupRoot, RadioGroupItem, RadioGroupIndicator } from "reka-ui";
/** 单选：选项少（2–5 个）且需要都看到时用；card 样式适合带说明的方案选择。 */
const model = defineModel<string>({ default: "" });
defineProps<{ options: { value: string; label: string; hint?: string; disabled?: boolean }[]; variant?: "plain" | "card"; direction?: "row" | "column"; ariaLabel?: string }>();
</script>
<template>
  <RadioGroupRoot v-model="model" :aria-label="ariaLabel" class="flex gap-2" :class="[direction === 'row' ? 'flex-row flex-wrap gap-x-5' : 'flex-col', variant === 'card' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3']">
    <label v-for="o in options" :key="o.value" class="flex items-start gap-2.5" :class="[o.disabled ? 'opacity-50' : 'cursor-pointer', variant === 'card' && 'rounded-lg border p-3.5 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft border-line hover:border-line-strong']">
      <RadioGroupItem :value="o.value" :disabled="o.disabled" class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-line-strong bg-surface transition-colors hover:border-primary data-[state=checked]:border-primary">
        <RadioGroupIndicator class="size-2 rounded-full bg-primary" />
      </RadioGroupItem>
      <span class="flex flex-col"><span :class="variant === 'card' && 'font-medium'">{{ o.label }}</span><span v-if="o.hint" class="text-[13px] text-fg-faint">{{ o.hint }}</span></span>
    </label>
  </RadioGroupRoot>
</template>
