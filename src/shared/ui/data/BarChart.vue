<script setup lang="ts">
import { computed, ref } from "vue";
import { useChartWidth } from "../lib/chart-width";
import { niceTicks } from "../lib/ticks";

const props = defineProps<{
  labels: string[];
  series: { name: string; values: number[] }[];
  height?: number;
  format?: (v: number) => string;
}>();
const H = computed(() => props.height ?? 220);
const svg = ref<SVGSVGElement>();
const W = useChartWidth(svg);
const pad = { l: 44, r: 8, t: 10, b: 26 };
const ticks = computed(() =>
  niceTicks(
    props.series.flatMap((s) => s.values),
    3,
  ),
);
const max = computed(() => ticks.value.at(-1)!);
const fmt = (v: number) =>
  props.format ? props.format(v) : v.toLocaleString("zh-CN");
const band = computed(() => (W.value - pad.l - pad.r) / props.labels.length);
const barW = computed(() =>
  Math.min(28, (band.value * 0.64) / props.series.length),
);
const y = (v: number) =>
  pad.t + (1 - v / max.value) * (H.value - pad.t - pad.b);
const colors = ["var(--primary)", "var(--line-strong)"];
const hover = ref<number | null>(null);
</script>
<template>
  <div class="relative">
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="block w-full"
      role="img"
      :aria-label="`${series.map((s) => s.name).join('、')}柱状图`"
      @pointerleave="hover = null"
    >
      <g v-for="t in ticks" :key="t">
        <line
          :x1="pad.l"
          :x2="W - pad.r"
          :y1="y(t)"
          :y2="y(t)"
          stroke="var(--line)"
        />
        <text
          :x="pad.l - 8"
          :y="y(t) + 4"
          text-anchor="end"
          font-size="12"
          fill="var(--fg-faint)"
        >
          {{ fmt(t) }}
        </text>
      </g>
      <g v-for="(l, i) in labels" :key="l" @pointerenter="hover = i">
        <rect
          :x="pad.l + i * band"
          :y="pad.t"
          :width="band"
          :height="H - pad.t - pad.b"
          :fill="hover === i ? 'var(--muted)' : 'transparent'"
        />
        <rect
          v-for="(s, k) in series"
          :key="s.name"
          :x="
            pad.l +
            i * band +
            band / 2 -
            (barW * series.length) / 2 +
            k * barW +
            1
          "
          :width="barW - 2"
          :y="y(s.values[i]!)"
          :height="H - pad.b - y(s.values[i]!)"
          rx="3"
          :fill="colors[k % 2]"
        />
        <text
          :x="pad.l + i * band + band / 2"
          :y="H - 8"
          text-anchor="middle"
          font-size="12"
          fill="var(--fg-faint)"
        >
          {{ l }}
        </text>
      </g>
    </svg>
    <div
      v-if="hover !== null"
      class="pointer-events-none absolute top-1 rounded-lg border border-line bg-surface px-3 py-2 text-help popup-surface"
      :style="{
        left: `clamp(8px, calc(${((pad.l + (hover + 0.5) * band) / W) * 100}% - 60px), calc(100% - 140px))`,
      }"
    >
      <p class="mb-1 text-fg-faint">{{ labels[hover] }}</p>
      <p v-for="(s, k) in series" :key="s.name" class="flex items-center gap-2">
        <span
          class="size-2 rounded-sm"
          :style="{ background: colors[k % 2] }"
        />{{ s.name
        }}<b class="ml-auto pl-3 font-semibold tabular-nums">{{
          fmt(s.values[hover]!)
        }}</b>
      </p>
    </div>
  </div>
</template>
