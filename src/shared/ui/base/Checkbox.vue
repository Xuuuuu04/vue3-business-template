<script setup lang="ts">
import { CheckboxRoot, CheckboxIndicator } from "reka-ui";
import { Check, Minus } from "lucide-vue-next";
/** 复选框。modelValue 为 "indeterminate" 时显示半选，用于表格全选。 */
const model = defineModel<boolean | "indeterminate">({ default: false });
defineProps<{ label?: string; disabled?: boolean; ariaLabel?: string }>();
</script>
<template>
  <label class="inline-flex items-center gap-2" :class="disabled ? 'opacity-50' : 'cursor-pointer'">
    <CheckboxRoot
      v-model="model"
      :disabled="disabled"
      :aria-label="ariaLabel ?? label"
      class="grid size-4 shrink-0 place-content-center rounded-[calc(var(--r-sm)-2px)] border-[1.5px] border-line-strong bg-surface transition-colors duration-100 hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
    >
      <CheckboxIndicator class="text-primary-ink">
        <Minus v-if="model === 'indeterminate'" class="size-3" :stroke-width="3" />
        <Check v-else class="size-3" :stroke-width="3" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <span v-if="label" class="select-none">{{ label }}</span>
  </label>
</template>
