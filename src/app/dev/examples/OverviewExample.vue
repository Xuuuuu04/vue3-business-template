<script setup lang="ts">
/** 经营总览示例：一个重点趋势、一组待处理事项和三个辅助比较。数据只在当前页面内存。 */
import { computed } from "vue";
import {
  PageFrame, OverviewBoard, Panel, StatusLine, LineChart, BarList, DonutChart, ActivityFeed, ActionList, FilterBar, Field, UiSelect, UiSegmented,
} from "@/shared/ui/public";
import { ref } from "vue";

const range = ref("30");
const region = ref("");
const storeType = ref("");
const channel = ref("");
const storeTypes = [{ value: "", label: "全部类型" }, { value: "flagship", label: "旗舰店" }, { value: "community", label: "社区店" }];
const channelOptions = [{ value: "", label: "全部渠道" }, { value: "store", label: "门店" }, { value: "mini", label: "小程序" }, { value: "delivery", label: "外卖平台" }];
const regions = [{ value: "", label: "全部区域" }, { value: "center", label: "渝中区" }, { value: "north", label: "江北区" }, { value: "south", label: "南岸区" }];
const days = computed(() => Number(range.value));
const labels = computed(() => Array.from({ length: days.value }, (_, i) => {
  const d = new Date(2026, 9, 8 - (days.value - 1 - i));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}));
function wave(seed: number, base: number, amp: number) {
  return Array.from({ length: days.value }, (_, i) => Math.round(base + amp * Math.sin((i + seed) / 3.2) + amp * 0.6 * Math.cos((i * 7 + seed) / 5) + i * base * 0.004));
}
const series = computed(() => [
  { name: "本期", values: wave(2, 182000, 26000) },
  { name: "上期", values: wave(6, 168000, 22000), dashed: true },
]);
const total = computed(() => series.value[0]!.values.reduce((a, b) => a + b, 0));
const previous = computed(() => series.value[1]!.values.reduce((a, b) => a + b, 0));
const money = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(v >= 1e6 ? 0 : 1)} 万` : v.toLocaleString("zh-CN"));

const todos = [
  { label: "退款待审核", count: 12, tone: "bad" as const, to: "/dev/examples/approval" },
  { label: "库存低于安全线", count: 7, tone: "warn" as const, to: "/dev/examples/customers" },
  { label: "客户消息未回复", count: 4, tone: "warn" as const, to: "/dev/examples/inbox" },
  { label: "合同即将到期", count: 3, tone: "warn" as const, to: "/dev/examples/customers" },
  { label: "发票待开具", count: 9, to: "/dev/examples/approval" },
  { label: "活动待发布", count: 2, to: "/dev/examples/campaign" },
];
const stores = [
  { label: "解放碑旗舰店", value: 1286400 }, { label: "观音桥店", value: 982300 }, { label: "南坪万达店", value: 861000 },
  { label: "沙坪坝三峡广场店", value: 702500 }, { label: "大坪时代天街店", value: 655800 },
].map((s) => ({ ...s, text: money(s.value) }));
const channels = [
  { label: "门店", value: 4820 }, { label: "小程序", value: 2960 }, { label: "外卖平台", value: 1840 }, { label: "企业团购", value: 620 },
];
const activity = [
  { id: "1", actor: "周晓", action: "通过了采购申请", target: "设计工作站采购", time: "2026-10-08T10:24:00" },
  { id: "2", actor: "林知远", action: "发布了活动", target: "秋季新品体验活动", time: "2026-10-08T09:40:00" },
  { id: "3", actor: "何静", action: "导入了门店销售明细", target: "九月.csv", time: "2026-10-08T08:15:00" },
  { id: "4", actor: "系统", action: "完成了日结", target: "10 月 7 日", time: "2026-10-07T23:30:00" },
];
</script>

<template>
  <PageFrame title="经营总览" workspace>
    <template #actions>
      <UiSegmented v-model="range" :options="[{ value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" aria-label="统计范围" />
    </template>
    <template #filters>
      <FilterBar :more-active="[storeType, channel].filter(Boolean).length" @query="() => {}" @reset="region = ''; storeType = ''; channel = ''">
        <UiSelect v-model="region" :options="regions" aria-label="区域" />
        <template #more>
          <Field label="门店类型"><UiSelect v-model="storeType" :options="storeTypes" /></Field>
          <Field label="销售渠道"><UiSelect v-model="channel" :options="channelOptions" /></Field>
        </template>
      </FilterBar>
    </template>
    <template #status>
      <StatusLine :items="[{ text: '数据截至 10 月 8 日 10:30', tone: 'ok' }, { text: '5 家门店已日结' }, { text: '1 家门店数据延迟', tone: 'warn' }]" />
    </template>
    <OverviewBoard>
      <Panel title="销售额" focus more="/dev/examples/customers" :figure="{ value: money(total), unit: '元', delta: ((total - previous) / previous) * 100, deltaLabel: '较上期' }">
        <LineChart :series="series" :labels="labels" :height="248" :format="money" />
      </Panel>
      <Panel title="待处理" flush>
        <ActionList :items="todos" />
      </Panel>
      <Panel title="门店销售排名" more="/dev/examples/customers">
        <BarList :items="stores" />
      </Panel>
      <Panel title="订单渠道">
        <DonutChart :items="channels" unit="单" center-label="订单" />
      </Panel>
      <Panel title="最近动态">
        <ActivityFeed :items="activity" />
      </Panel>
    </OverviewBoard>
  </PageFrame>
</template>
