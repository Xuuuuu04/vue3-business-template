<script setup lang="ts">
/** 页面速度：一页看清切换、接口、操作和浏览器核心指标；只显示实际测到的数据。 */
import { computed } from "vue";
import { useRecords } from "@/shared/records/store";
import { usePerformance } from "@/shared/records/performance";
import { endpointLabel } from "./endpoint";
import { PageFrame, StatusLine, OverviewBoard, Panel, LineChart, BarList, UiEmpty, UiTag } from "@/shared/ui/public";

const { items } = useRecords();
const { signals, gaps } = usePerformance();
const ms = (v: number) => (v === 0 ? "0" : v < 10 ? v.toFixed(1) : String(Math.round(v)));
const finished = computed(() => items.value.filter((r) => r.status !== "running"));
const requests = computed(() => finished.value.flatMap((r) => r.steps.flatMap((s) => s.requests)).filter((q) => q.elapsed > 0));
const of = (kind: string) => signals.value.filter((s) => s.kind === kind);

/** 重点：最近 30 次页面切换的耗时走势。 */
const switches = computed(() => of("navigation-dom").slice(-30));
const lastSwitch = computed(() => switches.value.at(-1));
const switchSeries = computed(() => [{ name: "页面切换", values: switches.value.map((s) => Math.round(s.duration * 10) / 10) }]);
const switchLabels = computed(() => switches.value.map((_, i) => `第 ${i + 1} 次`));

/** 浏览器核心指标：按常用的“良好 / 需改进 / 较差”分档，没测到就显示“—”。 */
const lcp = computed(() => of("largest-contentful-paint").at(-1)?.duration);
const cls = computed(() => of("layout-shift").reduce((n, s) => n + s.duration, 0));
const inp = computed(() => { const e = of("event").map((s) => s.duration).sort((a, b) => b - a); return e.length ? e[Math.min(e.length - 1, Math.floor(e.length / 50))] : undefined; });
const stalls = computed(() => of("longtask").length);
type Tone = "ok" | "warn" | "bad";
const grade = (v: number | undefined, good: number, poor: number): Tone | undefined => (v === undefined ? undefined : v <= good ? "ok" : v <= poor ? "warn" : "bad");
const gradeText = { ok: "良好", warn: "需改进", bad: "较差" } as const;
const vitals = computed(() => [
  { id: "lcp", label: "最大内容绘制", value: lcp.value === undefined ? "—" : `${ms(lcp.value)} ms`, tone: grade(lcp.value, 2500, 4000) },
  { id: "inp", label: "交互响应", value: inp.value === undefined ? "—" : `${ms(inp.value)} ms`, tone: grade(inp.value, 200, 500) },
  { id: "cls", label: "布局偏移", value: cls.value.toFixed(3), tone: grade(cls.value, 0.1, 0.25) },
  { id: "longtask", label: "页面卡顿", value: `${stalls.value} 次`, tone: grade(stalls.value, 0, 3) },
]);

const slowOps = computed(() => {
  const best = new Map<string, number>();
  for (const r of finished.value) best.set(r.title, Math.max(best.get(r.title) ?? 0, r.elapsed));
  return [...best].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value, text: `${ms(value)} ms` }));
});
const slowApis = computed(() => {
  const sum = new Map<string, { n: number; t: number }>();
  for (const q of requests.value) { const k = endpointLabel(q.endpoint, q.method); const c = sum.get(k) ?? { n: 0, t: 0 }; c.n++; c.t += q.elapsed; sum.set(k, c); }
  return [...sum].map(([label, c]) => ({ label, value: c.t / c.n, text: `${ms(c.t / c.n)} ms · ${c.n} 次` })).sort((a, b) => b.value - a.value).slice(0, 5);
});
const kinds: Record<string, string> = { "navigation-dom": "页面切换", paint: "绘制时点", longtask: "页面卡顿", resource: "资源加载", "largest-contentful-paint": "最大内容绘制", "layout-shift": "布局偏移", event: "交互" };
const rows = computed(() => signals.value.slice(-40).reverse().map((s, i) => ({ id: String(i), kind: kinds[s.kind] ?? s.kind, name: s.name.replace(location.origin, ""), duration: s.kind === "layout-shift" ? s.duration.toFixed(3) : `${ms(s.duration)} ms` })));
</script>
<template>
  <PageFrame title="页面速度" workspace>
    <template #status><StatusLine :items="[{ text: `最近 ${finished.length} 次操作、${signals.length} 条浏览器记录` }, { text: '接口等待含后台处理时间' }, ...gaps.map((g) => ({ text: g, tone: 'warn' as const }))]" /></template>
    <OverviewBoard>
      <Panel title="页面切换耗时" focus :figure="lastSwitch ? { value: ms(lastSwitch.duration), unit: 'ms · 最近一次' } : undefined">
        <LineChart v-if="switches.length > 1" :series="switchSeries" :labels="switchLabels" :height="220" :format="(v) => `${ms(v)} ms`" />
        <UiEmpty v-else title="切换几个页面后再来看" hint="每次切换页面会记录一次内容更新耗时。" />
      </Panel>
      <Panel title="浏览器核心指标" flush>
        <ul class="divide-y divide-line">
          <li v-for="v in vitals" :key="v.id" class="flex items-center gap-3 px-4 py-3.5">
            <span class="min-w-0 flex-1">{{ v.label }}</span>
            <b class="font-semibold tabular-nums">{{ v.value }}</b>
            <UiTag v-if="v.tone" :tone="v.tone" dot>{{ gradeText[v.tone] }}</UiTag>
          </li>
        </ul>
      </Panel>
      <Panel title="最慢的操作" more="/dev/records">
        <BarList v-if="slowOps.length" :items="slowOps" /><UiEmpty v-else title="还没有操作数据" hint="在产品页面做几次操作后回来看。" />
      </Panel>
      <Panel title="接口平均等待">
        <BarList v-if="slowApis.length" :items="slowApis" /><UiEmpty v-else title="还没有接口数据" hint="在产品页面做几次操作后回来看。" />
      </Panel>
      <Panel title="浏览器记录" flush>
        <ul v-if="rows.length" class="max-h-80 divide-y divide-line overflow-auto">
          <li v-for="r in rows" :key="r.id" class="flex items-center gap-3 px-4 py-2.5">
            <span class="w-24 shrink-0 text-help text-fg-muted">{{ r.kind }}</span>
            <span class="min-w-0 flex-1 truncate text-label" :title="r.name">{{ r.name }}</span>
            <span class="shrink-0 text-label tabular-nums">{{ r.duration }}</span>
          </li>
        </ul>
        <UiEmpty v-else title="浏览器还没有记录" />
      </Panel>
    </OverviewBoard>
  </PageFrame>
</template>
