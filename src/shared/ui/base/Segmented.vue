<script setup lang="ts">
/** 分段选择：在 2–4 个互斥视图或范围间切换（如“7 天 / 30 天 / 90 天”）。 */
const model = defineModel<string>({ required: true });
defineProps<{ options: { value: string; label: string }[]; ariaLabel?: string; size?: "sm" | "md" }>();
</script>
<template>
  <div class="inline-flex w-fit gap-0.5 rounded-md bg-muted p-0.5" role="radiogroup" :aria-label="ariaLabel">
    <button v-for="o in options" :key="o.value" type="button" role="radio" :aria-checked="model === o.value" class="rounded-sm px-3 whitespace-nowrap transition-colors" :class="[size === 'sm' ? 'h-6 text-[13px]' : 'h-7', model === o.value ? 'bg-surface font-medium text-fg shadow-card' : 'text-fg-muted hover:text-fg']" @click="model = o.value">{{ o.label }}</button>
  </div>
</template>
