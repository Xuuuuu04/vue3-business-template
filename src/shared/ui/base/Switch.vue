<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";

const model = defineModel<boolean>({ default: false });
defineProps<{ label?: string; hint?: string; disabled?: boolean }>();
</script>
<template>
  <label
    class="inline-flex items-start gap-3"
    :class="disabled ? 'opacity-50' : 'cursor-pointer'"
  >
    <SwitchRoot
      v-model="model"
      :disabled="disabled"
      :aria-label="label"
      class="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-line-strong transition-colors duration-(--motion-normal) data-[state=checked]:bg-primary"
    >
      <SwitchThumb
        class="block size-4 translate-x-0.5 rounded-full bg-switch-thumb shadow-card transition-transform duration-(--motion-normal) ease-(--ease) data-[state=checked]:translate-x-[18px]"
      />
    </SwitchRoot>
    <span v-if="label" class="flex flex-col"
      ><span>{{ label }}</span
      ><span v-if="hint" class="text-help text-fg-faint">{{ hint }}</span></span
    >
  </label>
</template>
