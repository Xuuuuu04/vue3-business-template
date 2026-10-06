<script setup lang="ts">
/** 界面库展示页：所有组件的真实样子。切换右上角的主题，检查任何配色下是否协调。 */
import { computed, ref } from "vue";
import { Plus, Download, RefreshCw, Inbox } from "lucide-vue-next";
import {
  PageFrame, Stack, Row, Grid, Card, Field, StatusLine, FilterBar, FilterItem, DataTable, CellText, MetricStrip,
  DescriptionList, Timeline, LineChart, BarList, Sparkline,
  UiButton, UiInput, UiSelect, UiCheckbox, UiTag, UiTabs, UiDialog, UiDrawer, UiTip, UiMenu, UiSkeleton, UiEmpty, UiFileDrop,
  useToast, type DataColumn, type SortState,
} from "@/shared/ui/public";

const toast = useToast();
const tab = ref("overview");
const text = ref("");
const kind = ref("");
const agreed = ref(false);
const dialog = ref(false);
const drawer = ref(false);
const loading = ref(false);
const file = ref<File>();
const picked = ref<string[]>([]);
const expanded = ref<string[]>([]);
const sort = ref<SortState | null>(null);
const page = ref(1);
const pageSize = ref(20);

interface Item { id: string; name: string; store: string; sku: string; orig: number; act: number; rate: number; chg: number; kind: string }
const rows: Item[] = [
  ["矿泉水 550ml", "南岸门店", "AX100245", 2.0, 0.99, 37.4, 1.9, "报名价"],
  ["红烧牛肉面 桶装", "渝中门店", "AX100482", 5.5, 3.2, -7.8, -3.2, "活动价"],
  ["纯牛奶 250ml", "沙坪坝门店", "AX100628", 4.0, 2.25, 16.4, 5.1, "报名价"],
  ["薯片 原味 70g", "南岸门店", "AX100774", 6.5, 4.05, 28.4, 0.6, "活动价"],
  ["夹心饼干 97g", "渝中门店", "AX100801", 7.8, 5.2, 30.8, -1.4, "活动价"],
  ["凉茶 310ml", "沙坪坝门店", "AX100913", 3.5, 2.1, 26.2, 2.2, "报名价"],
].map((r, i) => ({ id: String(i), name: r[0], store: r[1], sku: r[2], orig: r[3], act: r[4], rate: r[5], chg: r[6], kind: r[7] }) as Item);
const columns: DataColumn[] = [
  { key: "name", title: "商品 / 门店", sticky: "left", width: 240 },
  { key: "orig", title: "原价", unit: "元", kind: "number", sortable: true, width: 100, format: (v) => (v as number).toFixed(2) },
  { key: "act", title: "活动价", unit: "元", kind: "number", sortable: true, width: 120 },
  { key: "rate", title: "毛利率", unit: "%", kind: "number", sortable: true, width: 110, format: (v) => (v as number).toFixed(1) },
  { key: "chg", title: "较昨日", unit: "%", kind: "delta", sortable: true, width: 100 },
  { key: "note", title: "备注", minWidth: 200, hidden: true },
  { key: "actions", title: "操作", align: "right", sticky: "right", width: 130 },
];
const kinds = [{ value: "", label: "全部价型" }, { value: "活动价", label: "活动价" }, { value: "报名价", label: "报名价" }];
const shown = computed(() => rows.filter((r) => !kind.value || r.kind === kind.value));
const applied = computed(() => (kind.value ? [{ key: "kind", label: `价型：${kind.value}` }] : []));
function refresh() { loading.value = true; setTimeout(() => { loading.value = false; toast.success("价格表已更新"); }, 800); }

const days = Array.from({ length: 30 }, (_, i) => `${i + 1} 日`);
const a = Array.from({ length: 30 }, (_, i) => Math.round(52000 + Math.sin(i / 3.5) * 11000 + i * 700 + ((i * 13) % 7) * 800));
const series = [{ name: "本月", values: a }, { name: "上月同期", values: a.map((v, i) => Math.round(v * 0.9 + Math.cos(i / 4) * 2000)), dashed: true }];
</script>
<template>
  <PageFrame title="界面库">
    <template #actions>
      <UiButton @click="toast.info('这是一条提示')">轻提示</UiButton>
      <UiButton variant="primary" @click="refresh"><RefreshCw class="size-4" />更新价格表</UiButton>
    </template>
    <template #tabs><UiTabs v-model="tab" :items="[{ value: 'overview', label: '总览' }, { value: 'controls', label: '控件与反馈' }]" /></template>

    <template v-if="tab === 'overview'">
      <StatusLine :items="[{ text: '1/1 来源已齐备', tone: 'ok' }, { text: '业务日 2026-08-08' }, { text: '提价 32 · 降价 19 · 保持 2,266' }]"><UiButton variant="link">来源明细</UiButton></StatusLine>
      <MetricStrip :items="[
        { label: '实付金额', value: '1,284,630', unit: '元', delta: 12.4 },
        { label: '有效订单量', value: '41,208', unit: '单', delta: 8.1 },
        { label: '全渠道净利', value: '86,215', unit: '元', delta: -6.5 },
        { label: '推广消耗', value: '13,904', unit: '元', delta: -31.2, goodWhenUp: false },
      ]" />
      <Grid ratio="3:2">
        <Card title="实付金额"><LineChart :series="series" :labels="days" :format="(v) => `${(v / 10000).toFixed(1)} 万`" /></Card>
        <Card title="门店排名"><BarList :items="[{ label: '南岸门店', value: 94, text: '38.2 万' }, { label: '渝中门店', value: 71, text: '29.0 万' }, { label: '沙坪坝门店', value: 52, text: '21.4 万' }, { label: '北城门店', value: 33, text: '13.5 万' }]" /></Card>
      </Grid>
      <FilterBar :applied="applied" @query="refresh" @reset="kind = ''" @remove="kind = ''">
        <FilterItem size="lg"><UiInput v-model="text" placeholder="商品名 / SKU / 条码" aria-label="关键词" /></FilterItem>
        <FilterItem><UiSelect v-model="kind" :options="kinds" aria-label="价型" /></FilterItem>
      </FilterBar>
      <DataTable
        v-model:selected="picked" v-model:sort="sort" v-model:expanded="expanded" v-model:page="page" v-model:page-size="pageSize"
        title="商品价格" :meta="`当前筛选 ${shown.length} 条`" :columns="columns" :rows="shown" row-key="id" selectable :loading="loading" :total="2317" max-height="460px"
      >
        <template #toolbar><UiButton variant="primary" :disabled="!picked.length">{{ picked.length ? `批量调价（${picked.length}）` : "批量调价" }}</UiButton><UiButton>调价历史</UiButton></template>
        <template #cell-name="{ row }"><CellText :title="row.name">{{ row.store }}<UiTag tone="code">{{ row.sku }}</UiTag></CellText></template>
        <template #cell-act="{ row }"><div class="inline-flex flex-col items-end gap-0.5"><b class="font-medium">{{ row.act.toFixed(2) }}</b><UiTag tone="primary">{{ row.kind }}</UiTag></div></template>
        <template #cell-actions="{ row }"><UiButton variant="link" @click="drawer = true">详情</UiButton><UiButton variant="link" @click="expanded = expanded.includes(row.id) ? expanded.filter((x) => x !== row.id) : [...expanded, row.id]">依据</UiButton></template>
        <template #expanded="{ row }"><DescriptionList :columns="2" :items="[{ label: '建议原因', value: '毛利率低于 30% 红线' }, { label: '规则编号', value: 'R-03' }, { label: '同店排名', value: `第 ${Number(row.id) + 3} / 40` }, { label: '近 7 日均价', value: (row.act * 1.03).toFixed(2) + ' 元' }]" /></template>
        <template #bulk><UiButton variant="primary" size="sm">批量调价</UiButton></template>
      </DataTable>
    </template>

    <template v-else>
      <Grid :cols="2">
        <Card title="按钮与标签">
          <Stack>
            <Row><UiButton variant="primary">主要操作</UiButton><UiButton>次要操作</UiButton><UiButton variant="ghost">幽灵</UiButton><UiButton variant="danger-quiet">删除</UiButton><UiButton variant="danger">确认删除</UiButton><UiButton variant="link">链接</UiButton><UiButton disabled>不可用</UiButton><UiButton loading>处理中</UiButton></Row>
            <Row><UiButton variant="primary" size="sm"><Plus class="size-4" />小</UiButton><UiButton size="lg"><Download class="size-4" />大号</UiButton><UiTip text="图标按钮需要悬停说明"><UiButton size="icon" aria-label="下载"><Download class="size-4" /></UiButton></UiTip></Row>
            <Row><UiTag>默认</UiTag><UiTag tone="primary">强调</UiTag><UiTag tone="ok" dot>成功</UiTag><UiTag tone="warn" dot>待处理</UiTag><UiTag tone="bad" dot>失败</UiTag><UiTag tone="info">提示</UiTag><UiTag tone="code">AX100245</UiTag></Row>
          </Stack>
        </Card>
        <Card title="表单">
          <Stack>
            <Field label="项目名称" for="n" required hint="用于列表显示"><UiInput id="n" v-model="text" placeholder="请输入" /></Field>
            <Field label="单价" for="p" error="金额必须大于 0"><UiInput id="p" model-value="-1" invalid align="right"><template #suffix>元</template></UiInput></Field>
            <Field label="价型" for="k"><UiSelect v-model="kind" :options="kinds" placeholder="请选择" /></Field>
            <UiCheckbox v-model="agreed" label="我已阅读项目说明" />
          </Stack>
        </Card>
        <Card title="弹层与菜单">
          <Row><UiButton @click="dialog = true">确认弹窗</UiButton><UiButton @click="drawer = true">侧边抽屉</UiButton>
            <UiMenu :items="[{ key: 'a', label: '编辑' }, { key: 'b', label: '复制' }, { key: 'c', label: '删除', danger: true }]" @select="(k) => toast.info(`选择了 ${k}`)"><UiButton>更多操作</UiButton></UiMenu></Row>
        </Card>
        <Card title="读取与空状态">
          <Stack><UiSkeleton width="60%" /><UiSkeleton width="90%" /><UiSkeleton width="40%" />
            <UiEmpty title="没有符合条件的数据" hint="换个关键词，或清除筛选条件"><template #icon><Inbox class="size-5" /></template><UiButton>清除筛选</UiButton></UiEmpty></Stack>
        </Card>
        <Card title="文件选择"><UiFileDrop v-model="file" hint="一次一个文件，最大 10 MB" /></Card>
        <Card title="时间线与键值对"><Stack><Timeline :items="[{ title: '活动价 0.99', time: '今天 09:30' }, { title: '活动价 1.03', time: '08-07' }, { title: '原价 2.00', time: '08-01' }]" /><DescriptionList :items="[{ label: '店铺', value: '南岸门店' }, { label: '趋势' }]"><template #value-趋势><Sparkline :values="[3, 5, 4, 6, 8, 7, 9]" /></template></DescriptionList></Stack></Card>
      </Grid>
    </template>

    <UiDialog v-model:open="dialog" title="确认调价" description="将把 2 个商品的活动价调整为建议价，提交后在调价历史中查看结果。">
      <template #footer><UiButton @click="dialog = false">取消</UiButton><UiButton variant="primary" @click="dialog = false; toast.success('已提交调价')">确认调价</UiButton></template>
    </UiDialog>
    <UiDrawer v-model:open="drawer" title="矿泉水 550ml">
      <Stack gap="lg"><DescriptionList :items="[{ label: 'SKU', value: 'AX100245' }, { label: '门店', value: '南岸门店' }, { label: '活动价', value: '0.99 元' }]" /><Timeline :items="[{ title: '活动价 0.99', time: '今天 09:30' }, { title: '活动价 1.03', time: '08-07' }]" /></Stack>
      <template #footer><UiButton @click="drawer = false">关闭</UiButton><UiButton variant="primary">按建议调价</UiButton></template>
    </UiDrawer>
  </PageFrame>
</template>
