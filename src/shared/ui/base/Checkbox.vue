<script setup lang="ts">
import { CheckboxRoot, CheckboxIndicator } from "reka-ui";
import { Check, Minus } from "lucide-vue-next";

const model = defineModel<boolean | "indeterminate">({ default: false });
defineProps<{ label?: string; disabled?: boolean; ariaLabel?: string }>();
</script>
<template>
  <label
    class="inline-flex min-h-6 min-w-6 items-center gap-2"
    :class="disabled ? 'opacity-50' : 'cursor-pointer'"
  >
    <CheckboxRoot
      v-model="model"
      :disabled="disabled"
      :aria-label="ariaLabel ?? label"
      class="relative after:absolute after:-inset-1 grid size-4 shrink-0 place-content-center rounded-[calc(var(--r-sm)-2px)] border border-control-line bg-surface transition-colors duration-(--motion-fast) hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
    >
      <CheckboxIndicator class="text-primary-ink">
        <Minus
          v-if="model === 'indeterminate'"
          class="size-3"
          :stroke-width="2.5"
        />
        <Check v-else class="size-3" :stroke-width="2.5" />
      </CheckboxIndicator>
    </CheckboxRoot>
    <span v-if="label" class="select-none">{{ label }}</span>
  </label>
</template>
