<script setup lang="ts">
import {
  DataTable,
  UiSegmented,
  FilterItem,
  UiSearchInput,
  UiSelect,
  UiButton,
  CellText,
  UiTag,
  Row,
  DescriptionList,
  LineChart,
  BarChart,
  DonutChart,
  BarList,
  MetricStrip,
  ActivityFeed,
  Sparkline,
  Timeline,
} from "@/shared/ui/public";
import { columns, kinds, days, series } from "./design-preview-data";
import type { DataPreviewState } from "./design-preview-state";
const props = defineProps<{ example: string; state: DataPreviewState }>();
const {
  activity,
  tableState,
  shown,
  picked,
  sort,
  expanded,
  page,
  pageSize,
  search,
  kind,
  dialog,
  inspect,
} = props.state;
</script>
<template>
  <template v-if="example === 'table-states'">
    <div class="flex min-h-0 flex-1 flex-col gap-4">
      <UiSegmented
        v-model="tableState"
        aria-label="查询状态"
        :options="[
          { value: 'ready', label: '有数据' },
          { value: 'loading', label: '读取中' },
          { value: 'empty', label: '无结果' },
          { value: 'error', label: '失败' },
        ]"
      />
      <DataTable
        fill
        flat
        :columns="columns"
        :rows="tableState === 'empty' ? [] : shown"
        row-key="id"
        :loading="tableState === 'loading'"
        :error="
          tableState === 'error'
            ? '连接暂时中断，已有筛选条件已保留。'
            : undefined
        "
        retryable
        :settings="false"
        :fullscreenable="false"
        @retry="tableState = 'ready'"
      />
    </div>
  </template>
  <template v-if="example === 'table'">
    <DataTable
      fill
      flat
      v-model:selected="picked"
      v-model:sort="sort"
      v-model:expanded="expanded"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="shown"
      row-key="id"
      selectable
      :total="shown.length"
    >
      <template #search
        ><FilterItem size="lg"
          ><UiSearchInput
            v-model="search"
            placeholder="商品名 / SKU / 条码" /></FilterItem
        ><FilterItem
          ><UiSelect
            v-model="kind"
            :options="kinds"
            aria-label="价型" /></FilterItem
      ></template>
      <template #toolbar
        ><UiButton
          variant="primary"
          :disabled="!picked.length"
          @click="dialog = true"
          >{{
            picked.length ? `处理已选（${picked.length}）` : "处理已选"
          }}</UiButton
        ></template
      >
      <template #cell-name="{ row }"
        ><CellText :title="row.name"
          >{{ row.store }}<UiTag tone="code">{{ row.sku }}</UiTag></CellText
        ></template
      >
      <template #cell-act="{ row }"
        ><div class="inline-flex flex-col items-end gap-0.5">
          <b class="font-medium">{{ row.act.toFixed(2) }}</b
          ><UiTag tone="primary">{{ row.kind }}</UiTag>
        </div></template
      >
      <template #cell-actions="{ row }"
        ><Row justify="end" gap="md" nowrap
          ><UiButton variant="link" @click="inspect(row)">详情</UiButton></Row
        ></template
      >
      <template #expanded="{ row }"
        ><DescriptionList
          :columns="2"
          :items="[
            { label: '建议原因', value: '毛利率低于 30%' },
            { label: '规则编号', value: 'R-03' },
            { label: '同店排名', value: `第 ${Number(row.id) + 3} / 40` },
            {
              label: '近 7 日均价',
              value: (row.act * 1.03).toFixed(2) + ' 元',
            },
          ]"
      /></template>
    </DataTable>
  </template>
  <template v-if="example === 'line'"
    ><LineChart
      :series="series"
      :labels="days"
      :format="(v) => `${(v / 10000).toFixed(1)} 万`"
  /></template>
  <template v-if="example === 'bars'"
    ><BarChart
      :labels="['周一', '周二', '周三', '周四', '周五', '周六', '周日']"
      :series="[
        { name: '本周', values: [132, 148, 141, 156, 170, 212, 198] },
        { name: '上周', values: [120, 131, 138, 142, 151, 188, 176] },
      ]"
  /></template>
  <template v-if="example === 'donut'"
    ><DonutChart
      :items="[
        { label: '美团', value: 18420 },
        { label: '淘宝', value: 12960 },
        { label: '门店自提', value: 7310 },
        { label: '其他', value: 2140 },
      ]"
      unit=" 单"
      center-label="订单"
  /></template>
  <template v-if="example === 'ranking'"
    ><BarList
      :items="[
        { label: '南岸门店', value: 94, text: '38.2 万' },
        { label: '渝中门店', value: 71, text: '29.0 万' },
        { label: '沙坪坝门店', value: 52, text: '21.4 万' },
        { label: '北城门店', value: 33, text: '13.5 万' },
      ]"
  /></template>
  <template v-if="example === 'metrics'"
    ><MetricStrip
      :items="[
        { label: '实付金额', value: '1,284,630', unit: '元', delta: 12.4 },
        { label: '有效订单量', value: '41,208', unit: '单', delta: 8.1 },
        { label: '全渠道净利', value: '86,215', unit: '元', delta: -6.5 },
        {
          label: '推广消耗',
          value: '13,904',
          unit: '元',
          delta: -31.2,
          goodWhenUp: false,
        },
      ]"
  /></template>
  <template v-if="example === 'activity'"
    ><ActivityFeed :items="activity"
  /></template>
  <template v-if="example === 'description'"
    ><DescriptionList
      :items="[
        { label: '店铺', value: '南岸门店' },
        { label: '近 7 日', key: 'trend' },
      ]"
      ><template #value-trend
        ><Sparkline
          :values="[3, 5, 4, 6, 8, 7, 9]" /></template></DescriptionList
  ></template>
  <template v-if="example === 'timeline'"
    ><Timeline
      :items="[
        { title: '活动价 0.99', time: '今天 09:30' },
        { title: '活动价 1.03', time: '08-07' },
        { title: '原价 2.00', time: '08-01' },
      ]"
  /></template>
</template>
