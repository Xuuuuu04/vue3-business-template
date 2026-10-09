<script setup lang="ts">
/** 折线图：自适应宽度，悬停显示十字线与数值。第一条序列用品牌色，其余依次用中性色与状态色。 */
import { computed, ref } from "vue";
import { useChartWidth } from "../lib/chart-width";
import { niceTicks } from "../lib/ticks";
const props = defineProps<{ series: { name: string; values: number[]; dashed?: boolean }[]; labels: string[]; height?: number; format?: (v: number) => string }>();
const svg = ref<SVGSVGElement>();
const W = useChartWidth(svg);
const H = computed(() => props.height ?? 240);

const colors = ["var(--primary)", "var(--fg-faint)", "var(--info)", "var(--ok)"];
const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString("zh-CN"));
const ticks = computed(() => niceTicks(props.series.flatMap((s) => s.values)));
const range = computed(() => ({ min: ticks.value[0]!, max: ticks.value.at(-1)! }));
/** 左边距按最长刻度文字估算，中文与单位不会被裁掉。 */
const pad = computed(() => {
  const widest = Math.max(...ticks.value.map((t) => [...fmt(t)].reduce((w, ch) => w + (/[\u4e00-\u9fff]/.test(ch) ? 12 : 7), 0)));
  return { l: Math.max(36, widest + 14), r: 16, t: 12, b: 26 };
});
const n = computed(() => props.labels.length);
const x = (i: number) => pad.value.l + (n.value <= 1 ? 0 : (i * (W.value - pad.value.l - pad.value.r)) / (n.value - 1));
const y = (v: number) => pad.value.t + (1 - (v - range.value.min) / (range.value.max - range.value.min)) * (H.value - pad.value.t - pad.value.b);
const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
const area = computed(() => `${path(props.series[0]?.values ?? [])} L${x(n.value - 1)} ${H.value - pad.value.b} L${x(0)} ${H.value - pad.value.b}Z`);
/** 横轴刻度按最长标签宽度决定能放几个，标签之间至少留 16px，不会挤在一起。 */
const labelWidth = computed(() => Math.max(...props.labels.map((l) => [...l].reduce((w, ch) => w + (/[\u4e00-\u9fff]/.test(ch) ? 12 : 7.2), 0))));
/** 标签一律居中对齐，靠两端的收进绘图区内；可放数量按“绘图宽度减一个标签宽”计算，保证相邻标签不重叠。 */
const labelX = (i: number) => Math.min(Math.max(x(i), pad.value.l + labelWidth.value / 2), W.value - pad.value.r - labelWidth.value / 2);
const xTicks = computed(() => {
  if (n.value <= 1) return [0];
  const widest = labelWidth.value;
  const room = Math.max(2, Math.min(6, Math.floor((W.value - pad.value.l - pad.value.r - widest) / (widest + 20)) + 1));
  const count = Math.min(room, n.value);
  const picked = [...new Set(Array.from({ length: count }, (_, k) => Math.round(((n.value - 1) * k) / (count - 1))))];
  // 取整后相邻标签可能靠得太近：从左往右保留间距足够的，最后一个必须保留，必要时去掉它前面的。
  const kept: number[] = [];
  for (const idx of picked) if (!kept.length || labelX(idx) - labelX(kept.at(-1)!) >= widest + 12) kept.push(idx);
  const last = n.value - 1;
  if (kept.at(-1) !== last) { while (kept.length > 1 && labelX(last) - labelX(kept.at(-1)!) < widest + 12) kept.pop(); kept.push(last); }
  return kept;
});
const hover = ref<number | null>(null);
function move(e: PointerEvent) {
  const box = svg.value!.getBoundingClientRect();
  const px = ((e.clientX - box.left) / box.width) * W.value;
  hover.value = Math.max(0, Math.min(n.value - 1, Math.round(((px - pad.value.l) / (W.value - pad.value.l - pad.value.r)) * (n.value - 1))));
}
const uid = Math.random().toString(36).slice(2, 8);
</script>
<template>
  <div class="relative">
    <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" class="block w-full" role="img" :aria-label="`${series.map((s) => s.name).join('、')}趋势图`" @pointermove="move" @pointerleave="hover = null">
      <defs><linearGradient :id="`a${uid}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".16" /><stop offset="1" stop-color="var(--primary)" stop-opacity="0" /></linearGradient></defs>
      <g v-for="t in ticks" :key="t"><line :x1="pad.l" :x2="W - pad.r" :y1="y(t)" :y2="y(t)" stroke="var(--line)" /><text :x="pad.l - 8" :y="y(t) + 4" text-anchor="end" fill="var(--fg-faint)" font-size="12">{{ fmt(t) }}</text></g>
      <text v-for="i in xTicks" :key="i" :x="labelX(i)" :y="H - 6" text-anchor="middle" fill="var(--fg-faint)" font-size="12">{{ labels[i] }}</text>
      <path :d="area" :fill="`url(#a${uid})`" />
      <path v-for="(s, i) in [...series].reverse()" :key="s.name" :d="path(s.values)" fill="none" :stroke="colors[(series.length - 1 - i) % colors.length]" :stroke-width="series.length - 1 - i === 0 ? 2 : 1.5" :stroke-dasharray="s.dashed ? '4 4' : undefined" stroke-linejoin="round" stroke-linecap="round" />
      <g v-if="hover !== null"><line :x1="x(hover)" :x2="x(hover)" :y1="pad.t" :y2="H - pad.b" stroke="var(--line-strong)" /><circle v-for="(s, i) in series" :key="s.name" :cx="x(hover)" :cy="y(s.values[hover]!)" r="4" fill="var(--surface)" :stroke="colors[i % colors.length]" stroke-width="2" /></g>
    </svg>
    <div v-if="hover !== null" class="pointer-events-none absolute top-2 min-w-32 rounded-lg border border-line bg-surface px-3 py-2 text-help popup-surface" :style="{ left: `clamp(8px, calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 150px))` }">
      <p class="mb-1 text-fg-faint">{{ labels[hover] }}</p>
      <p v-for="(s, i) in series" :key="s.name" class="flex items-center gap-2"><span class="size-2 rounded-full" :style="{ background: colors[i % colors.length] }" />{{ s.name }}<b class="ml-auto pl-3 font-semibold tabular-nums">{{ fmt(s.values[hover]!) }}</b></p>
    </div>
  </div>
</template>
