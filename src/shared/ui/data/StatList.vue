<script setup lang="ts">
defineProps<{
  items: {
    label: string;
    value: string;
    unit?: string;
    delta?: number;
    goodWhenUp?: boolean;
  }[];
}>();
function tone(m: { delta?: number; goodWhenUp?: boolean }) {
  if (!m.delta) return "text-fg-faint";
  return (m.goodWhenUp === false ? m.delta < 0 : m.delta > 0)
    ? "text-ok"
    : "text-bad";
}
</script>
<template>
  <dl class="stat-list">
    <div v-for="m in items.slice(0, 6)" :key="m.label" class="stat-item">
      <dt>{{ m.label }}</dt>
      <dd>
        <span class="tabular-nums">{{ m.value }}</span
        ><small v-if="m.unit">{{ m.unit }}</small>
      </dd>
      <dd
        v-if="m.delta !== undefined"
        class="stat-delta tabular-nums"
        :class="tone(m)"
      >
        {{ m.delta > 0 ? "↑" : m.delta < 0 ? "↓" : "" }}
        {{ Math.abs(m.delta).toFixed(1) }}%
      </dd>
    </div>
  </dl>
</template>
