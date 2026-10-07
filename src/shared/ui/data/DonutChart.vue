<script setup lang="ts">
import { computed, ref } from "vue";
/** 环形图：几部分占整体的比例（不超过 6 部分）。中间显示总数，右边是图例与占比。 */
const props = defineProps<{ items: { label: string; value: number }[]; unit?: string; centerLabel?: string }>();
const total = computed(() => props.items.reduce((n, i) => n + i.value, 0));
const hues = ["var(--primary)", "oklch(0.7 0.12 200)", "oklch(0.75 0.13 80)", "oklch(0.65 0.14 20)", "oklch(0.6 0.1 300)", "var(--line-strong)"];
const R = 52, C = 2 * Math.PI * R;
const arcs = computed(() => { let acc = 0; return props.items.map((it, i) => { const len = total.value ? (it.value / total.value) * C : 0; const a = { ...it, color: hues[i % hues.length]!, dash: `${Math.max(0, len - 2)} ${C}`, offset: -acc }; acc += len; return a; }); });
const hover = ref<number | null>(null);
</script>
<template>
  <div class="flex flex-wrap items-center gap-6">
    <div class="relative size-40 shrink-0">
      <svg viewBox="0 0 140 140" class="size-full -rotate-90" role="img" :aria-label="`${items.map((i) => i.label).join('、')}占比`">
        <circle cx="70" cy="70" :r="R" fill="none" stroke="var(--muted)" stroke-width="16" />
        <circle v-for="(a, i) in arcs" :key="a.label" cx="70" cy="70" :r="R" fill="none" :stroke="a.color" :stroke-width="hover === i ? 20 : 16" :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset" class="transition-[stroke-width] duration-(--motion-fast)" @pointerenter="hover = i" @pointerleave="hover = null" />
      </svg>
      <div class="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <b class="text-xl font-semibold tracking-tight tabular-nums">{{ hover === null ? total.toLocaleString("zh-CN") : items[hover]!.value.toLocaleString("zh-CN") }}</b>
        <span class="text-xs text-fg-faint">{{ hover === null ? (centerLabel ?? "合计") : items[hover]!.label }}</span>
      </div>
    </div>
    <ul class="flex min-w-40 flex-1 flex-col gap-2">
      <li v-for="(a, i) in arcs" :key="a.label" class="flex items-center gap-2.5" @pointerenter="hover = i" @pointerleave="hover = null">
        <span class="size-2.5 shrink-0 rounded-sm" :style="{ background: a.color }" /><span class="flex-1 truncate">{{ a.label }}</span>
        <span class="text-fg-muted tabular-nums">{{ a.value.toLocaleString("zh-CN") }}{{ unit }}</span><span class="w-12 text-right text-fg-faint tabular-nums">{{ total ? ((a.value / total) * 100).toFixed(1) : 0 }}%</span>
      </li>
    </ul>
  </div>
</template>
