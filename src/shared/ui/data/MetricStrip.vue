<script setup lang="ts">
/** 数字条：直接呈现真实值，不用从零计数的装饰动效。 */
defineProps<{ items: { label: string; value: string; unit?: string; delta?: number; deltaLabel?: string; goodWhenUp?: boolean }[] }>();
function tone(m: { delta?: number; goodWhenUp?: boolean }) {
  if (!m.delta) return "text-fg-faint";
  return (m.goodWhenUp === false ? m.delta < 0 : m.delta > 0) ? "text-ok" : "text-bad";
}
</script>
<template>
  <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface shadow-card xl:grid-cols-4">
    <div v-for="(m, i) in items" :key="m.label" class="min-w-0 border-line px-5 py-4" :class="['border-b xl:border-b-0', i % 2 === 0 && 'border-r', i < items.length - 1 && 'xl:border-r', i === 1 && 'xl:border-r']">
      <dt class="text-help text-fg-muted">{{ m.label }}</dt>
      <dd class="mt-1 text-[26px] leading-tight font-semibold tracking-tight tabular-nums">{{ m.value }}<small v-if="m.unit" class="ml-1 text-help font-medium text-fg-faint">{{ m.unit }}</small></dd>
      <dd v-if="m.delta !== undefined" class="mt-0.5 text-help font-medium tabular-nums" :class="tone(m)">{{ m.delta > 0 ? "+" : m.delta < 0 ? "−" : "" }}{{ Math.abs(m.delta).toFixed(1) }}%<span class="ml-1 font-normal text-fg-faint">{{ m.deltaLabel ?? "较上期" }}</span></dd>
    </div>
  </dl>
</template>
