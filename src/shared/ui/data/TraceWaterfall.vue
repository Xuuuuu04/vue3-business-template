<script setup lang="ts">
/**
 * 瀑布图：按时间展示一次执行里每一段从何时开始、用了多久、结果如何。
 * 每行可以带子行（如步骤里的接口请求）；适用于前端操作记录、后台流程阶段等任何有先后顺序的执行。
 */
import { computed } from "vue";
export interface TraceSpan {
  id: string;
  label: string;
  /** 距离开始的毫秒数；缺少时接在上一段之后。 */
  at?: number;
  elapsed: number;
  status: "running" | "ok" | "failed" | "skipped" | "cancelled" | "unknown";
  /** 标签后的附加说明，如接口状态码。 */
  meta?: string;
  children?: TraceSpan[];
}
const props = defineProps<{ spans: TraceSpan[]; total?: number }>();
const emit = defineEmits<{ select: [span: TraceSpan] }>();
interface Row { span: TraceSpan; start: number; depth: number; index: string }
const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  let cursor = 0;
  props.spans.forEach((s, i) => {
    const start = s.at ?? cursor;
    out.push({ span: s, start, depth: 0, index: String(i + 1) });
    let inner = start;
    s.children?.forEach((c) => {
      const cs = c.at ?? inner;
      out.push({ span: c, start: cs, depth: 1, index: "" });
      inner = cs + c.elapsed;
    });
    cursor = start + s.elapsed;
  });
  return out;
});
const end = computed(() => Math.max(props.total ?? 0, ...rows.value.map((r) => r.start + r.span.elapsed), 1));
const ticks = computed(() => {
  const raw = end.value / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
  const out: number[] = [];
  for (let t = 0; t <= end.value + 0.001; t += step) out.push(t);
  return out;
});
const pct = (v: number) => `${(v / end.value) * 100}%`;
const ms = (v: number) => (v < 10 ? `${v.toFixed(1)} ms` : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`);
</script>
<template>
  <div class="trace" role="table" aria-label="执行瀑布图">
    <div class="trace-row trace-axis" role="row">
      <span role="columnheader">步骤</span>
      <span class="trace-track" role="columnheader">
        <span v-for="t in ticks" :key="t" class="trace-tick" :style="{ left: pct(t) }">{{ ms(t) }}</span>
      </span>
      <span role="columnheader" class="text-right">耗时</span>
    </div>
    <button
      v-for="(r, i) in rows" :key="`${r.span.id}-${i}`" type="button" role="row"
      class="trace-row" :class="[`is-${r.span.status}`, r.depth && 'is-child']"
      :style="{ animationDelay: `${Math.min(i, 12) * 24}ms` }"
      @click="emit('select', r.span)"
    >
      <span class="trace-label" role="cell">
        <span v-if="!r.depth" class="trace-index">{{ r.index }}</span>
        <span class="min-w-0 truncate">{{ r.span.label }}</span>
        <span v-if="r.span.meta" class="trace-meta">{{ r.span.meta }}</span>
      </span>
      <span class="trace-track" role="cell">
        <span v-for="t in ticks" :key="t" class="trace-grid" :style="{ left: pct(t) }" />
        <span class="trace-bar" :style="{ left: pct(r.start), width: `max(3px, ${pct(r.span.elapsed)})` }" />
      </span>
      <span class="trace-ms" role="cell">{{ r.span.status === "skipped" ? "跳过" : ms(r.span.elapsed) }}</span>
    </button>
  </div>
</template>
