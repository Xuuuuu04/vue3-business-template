<script setup lang="ts">
import { computed } from "vue";
import { useRecords } from "@/shared/records/store";
import { usePerformance } from "@/shared/records/performance";
import { endpointLabel } from "./endpoint";
import { PageFrame, StatusLine, MetricStrip, Grid, Card, BarList, DataTable, UiEmpty, type DataColumn } from "@/shared/ui/public";

const { items } = useRecords();
const { signals, gaps } = usePerformance();
const ms = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
const finished = computed(() => items.value.filter((r) => r.status !== "running"));
const requests = computed(() => finished.value.flatMap((r) => r.steps.flatMap((s) => s.requests)).filter((q) => q.elapsed > 0));
const lastSwitch = computed(() => [...signals.value].reverse().find((s) => s.kind === "navigation-dom"));
const averageWait = computed(() => (requests.value.length ? requests.value.reduce((n, q) => n + q.elapsed, 0) / requests.value.length : undefined));
const slowest = computed(() => [...finished.value].sort((a, b) => b.elapsed - a.elapsed)[0]);
const stalls = computed(() => signals.value.filter((s) => s.kind === "longtask").length);
const metrics = computed(() => [
  { label: "最近一次页面切换", value: lastSwitch.value ? ms(lastSwitch.value.duration) : "—", unit: lastSwitch.value ? "ms" : "" },
  { label: "接口平均等待", value: averageWait.value !== undefined ? ms(averageWait.value) : "—", unit: averageWait.value !== undefined ? "ms" : "" },
  { label: "最慢的一次操作", value: slowest.value ? ms(slowest.value.elapsed) : "—", unit: slowest.value ? "ms" : "" },
  { label: "页面卡顿次数", value: String(stalls.value), unit: "次" },
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
const kinds: Record<string, string> = { "navigation-dom": "页面切换", paint: "首次绘制", longtask: "页面卡顿", resource: "资源加载" };
const rows = computed(() => signals.value.slice(-30).reverse().map((s, i) => ({ id: String(i), kind: kinds[s.kind] ?? s.kind, name: s.name.replace(location.origin, ""), duration: s.duration })));
const columns: DataColumn[] = [
  { key: "kind", title: "类型", width: 120 },
  { key: "name", title: "内容", minWidth: 360 },
  { key: "duration", title: "耗时", unit: "ms", kind: "number", width: 110, format: (v) => ms(v as number) },
];
</script>
<template>
  <PageFrame title="页面速度">
    <template #status><StatusLine :items="[{ text: `基于最近 ${finished.length} 次操作与浏览器记录` }, ...gaps.map((g) => ({ text: g, tone: 'warn' as const }))]" /></template>
    <MetricStrip :items="metrics" />
    <Grid :cols="2">
      <Card title="最慢的操作"><BarList v-if="slowOps.length" :items="slowOps" /><UiEmpty v-else title="还没有数据" hint="在产品页面做几次操作后回来看。" /></Card>
      <Card title="最慢的接口（平均等待）"><BarList v-if="slowApis.length" :items="slowApis" /><UiEmpty v-else title="还没有数据" hint="在产品页面做几次操作后回来看。" /></Card>
    </Grid>
    <DataTable title="浏览器记录" meta="最近 30 条" :columns="columns" :rows="rows" row-key="id" :settings="false" :fullscreenable="false" empty-title="浏览器还没有记录" />
    <Card title="怎么读这些数字">
      <ul class="flex list-disc flex-col gap-1.5 pl-5 text-fg-muted marker:text-fg-faint">
        <li>接口等待包含了后台处理的时间，所以不能和后台步骤耗时相加。</li>
        <li>“页面切换”只表示页面内容已经更新，不保证屏幕已经画好。</li>
        <li>慢在接口，就去后端看这次请求的运行编号；慢在页面卡顿，再用浏览器自带的性能面板细查。</li>
        <li>没有测量到的部分显示“—”，不会用估算数字填上。</li>
      </ul>
    </Card>
  </PageFrame>
</template>
