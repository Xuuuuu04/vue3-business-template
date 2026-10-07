<script setup lang="ts">
/** 折线图：自适应宽度，悬停显示十字线与数值。第一条序列用品牌色，其余依次用中性色与状态色。 */
import { computed, ref } from "vue";
import { useChartWidth } from "../lib/chart-width";
const props = defineProps<{ series: { name: string; values: number[]; dashed?: boolean }[]; labels: string[]; height?: number; format?: (v: number) => string }>();
const svg = ref<SVGSVGElement>();
const W = useChartWidth(svg);
const H = computed(() => props.height ?? 240);
const pad = { l: 44, r: 16, t: 12, b: 26 };
const colors = ["var(--primary)", "var(--fg-faint)", "var(--info)", "var(--ok)"];
const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString("zh-CN"));
const range = computed(() => {
  const all = props.series.flatMap((s) => s.values);
  const max = Math.max(...all), min = Math.min(0, ...all);
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(1, max - min)))) / 2;
  const top = Math.ceil(max / step) * step;
  return { min, max: top === min ? min + 1 : top };
});
const n = computed(() => props.labels.length);
const x = (i: number) => pad.l + (n.value <= 1 ? 0 : (i * (W.value - pad.l - pad.r)) / (n.value - 1));
const y = (v: number) => pad.t + (1 - (v - range.value.min) / (range.value.max - range.value.min)) * (H.value - pad.t - pad.b);
const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
const area = computed(() => `${path(props.series[0]?.values ?? [])} L${x(n.value - 1)} ${H.value - pad.b} L${x(0)} ${H.value - pad.b}Z`);
const ticks = computed(() => [0, 1, 2, 3].map((i) => range.value.min + ((range.value.max - range.value.min) * i) / 3));
const xTicks = computed(() => { const out = new Set([0, n.value - 1]); for (let i = 1; i < 4; i++) out.add(Math.round(((n.value - 1) * i) / 4)); return [...out].sort((a, b) => a - b); });
const hover = ref<number | null>(null);
function move(e: PointerEvent) {
  const box = svg.value!.getBoundingClientRect();
  const px = ((e.clientX - box.left) / box.width) * W.value;
  hover.value = Math.max(0, Math.min(n.value - 1, Math.round(((px - pad.l) / (W.value - pad.l - pad.r)) * (n.value - 1))));
}
const uid = Math.random().toString(36).slice(2, 8);
</script>
<template>
  <div class="relative">
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" class="block w-full" role="img" :aria-label="`${series.map((s) => s.name).join('、')}趋势图`" @pointermove="move" @pointerleave="hover = null">
      <defs><linearGradient :id="`a${uid}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".16" /><stop offset="1" stop-color="var(--primary)" stop-opacity="0" /></linearGradient></defs>
      <g v-for="t in ticks" :key="t"><line :x1="pad.l" :x2="W - pad.r" :y1="y(t)" :y2="y(t)" stroke="var(--line)" /><text :x="pad.l - 8" :y="y(t) + 4" text-anchor="end" fill="var(--fg-faint)" font-size="12">{{ fmt(t) }}</text></g>
      <text v-for="i in xTicks" :key="i" :x="x(i)" :y="H - 6" :text-anchor="i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'" fill="var(--fg-faint)" font-size="12">{{ labels[i] }}</text>
      <path :d="area" :fill="`url(#a${uid})`" />
      <path v-for="(s, i) in [...series].reverse()" :key="s.name" :d="path(s.values)" fill="none" :stroke="colors[(series.length - 1 - i) % colors.length]" :stroke-width="series.length - 1 - i === 0 ? 2 : 1.5" :stroke-dasharray="s.dashed ? '4 4' : undefined" stroke-linejoin="round" stroke-linecap="round" />
      <g v-if="hover !== null"><line :x1="x(hover)" :x2="x(hover)" :y1="pad.t" :y2="H - pad.b" stroke="var(--line-strong)" /><circle v-for="(s, i) in series" :key="s.name" :cx="x(hover)" :cy="y(s.values[hover]!)" r="4" fill="var(--surface)" :stroke="colors[i % colors.length]" stroke-width="2" /></g>
    </svg>
    <div v-if="hover !== null" class="pointer-events-none absolute top-2 min-w-32 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] popup-surface" :style="{ left: `clamp(8px, calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 150px))` }">
      <p class="mb-1 text-fg-faint">{{ labels[hover] }}</p>
      <p v-for="(s, i) in series" :key="s.name" class="flex items-center gap-2"><span class="size-2 rounded-full" :style="{ background: colors[i % colors.length] }" />{{ s.name }}<b class="ml-auto pl-3 font-semibold tabular-nums">{{ fmt(s.values[hover]!) }}</b></p>
    </div>
  </div>
</template>
