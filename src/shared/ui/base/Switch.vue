<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";
/** 开关：立即生效的设置用开关；需要提交才生效的用复选框。 */
const model = defineModel<boolean>({ default: false });
defineProps<{ label?: string; hint?: string; disabled?: boolean }>();
</script>
<template>
  <label class="inline-flex items-start gap-3" :class="disabled ? 'opacity-50' : 'cursor-pointer'">
    <SwitchRoot v-model="model" :disabled="disabled" :aria-label="label" class="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-line-strong transition-colors duration-200 data-[state=checked]:bg-primary">
      <SwitchThumb class="block size-4 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.25)] transition-transform duration-200 ease-(--ease) data-[state=checked]:translate-x-[18px]" />
    </SwitchRoot>
    <span v-if="label" class="flex flex-col"><span>{{ label }}</span><span v-if="hint" class="text-[13px] text-fg-faint">{{ hint }}</span></span>
  </label>
</template>
