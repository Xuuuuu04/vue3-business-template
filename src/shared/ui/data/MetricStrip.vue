<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
/** 数字条：一排并列的关键数字，用竖线分隔，不做成一组大卡片。 */
const props = defineProps<{ items: { label: string; value: string; unit?: string; delta?: number; deltaLabel?: string; goodWhenUp?: boolean }[] }>();
/** 数字出现时从 0 滚动到目标值（约 0.7 秒）；不是纯数字的值直接显示；系统要求减少动效时直接显示。 */
const shown = ref<string[]>(props.items.map((m) => m.value));
function roll() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { shown.value = props.items.map((m) => m.value); return; }
  props.items.forEach((m, i) => {
    const plain = m.value.replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(plain)) { shown.value[i] = m.value; return; }
    const target = Number(plain), decimals = plain.split(".")[1]?.length ?? 0, grouped = m.value.includes(",");
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700), eased = 1 - Math.pow(1 - t, 3);
      shown.value[i] = (target * eased).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
onMounted(roll);
watch(() => props.items.map((m) => m.value).join("|"), roll);
function tone(m: { delta?: number; goodWhenUp?: boolean }) {
  if (!m.delta) return "text-fg-faint";
  const good = m.goodWhenUp === false ? m.delta < 0 : m.delta > 0;
  return good ? "text-ok" : "text-bad";
}
</script>
<template>
  <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface shadow-card xl:grid-cols-4">
    <div v-for="(m, i) in items" :key="m.label" class="min-w-0 border-line px-5 py-4" :class="['border-b xl:border-b-0', i % 2 === 0 && 'border-r', i < items.length - 1 && 'xl:border-r', i === 1 && 'xl:border-r']">
      <dt class="text-[13px] text-fg-muted">{{ m.label }}</dt>
      <dd class="mt-1 text-[26px] leading-tight font-semibold tracking-tight tabular-nums">{{ shown[i] ?? m.value }}<small v-if="m.unit" class="ml-1 text-[13px] font-medium text-fg-faint">{{ m.unit }}</small></dd>
      <dd v-if="m.delta !== undefined" class="mt-0.5 text-[13px] font-medium tabular-nums" :class="tone(m)">{{ m.delta > 0 ? "+" : m.delta < 0 ? "−" : "" }}{{ Math.abs(m.delta).toFixed(1) }}%<span class="ml-1 font-normal text-fg-faint">{{ m.deltaLabel ?? "较上期" }}</span></dd>
    </div>
  </dl>
</template>
