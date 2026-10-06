<script setup lang="ts">
/** 设计预览：配色、控件、数据展示和页面拼法的实际效果。切换配色立即生效。 */
import { computed, ref } from "vue";
import { Plus, Download, Inbox } from "lucide-vue-next";
import {
  PageFrame, Stack, Row, Grid, Card, Field, StatusLine, FilterBar, FilterItem, DataTable, CellText, MetricStrip,
  DescriptionList, Timeline, LineChart, BarList, Sparkline, UiButton, UiInput, UiSearchInput, UiSelect, UiCheckbox, UiTag, UiTabs, UiDialog,
  UiDrawer, UiTip, UiMenu, UiSkeleton, UiEmpty, UiFileDrop, StatusMessage, useToast, useTheme, palettes, type DataColumn, type SortState,
} from "@/shared/ui/public";

const toast = useToast();
const { settings, choosePalette } = useTheme();
const tab = ref("theme");
const text = ref("");
const search = ref("");
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
].map((r, i) => ({ id: String(i), name: r[0], store: r[1], sku: r[2], orig: r[3], act: r[4], rate: r[5], chg: r[6], kind: r[7] }) as Item);
const columns: DataColumn[] = [
  { key: "name", title: "商品 / 门店", sticky: "left", width: 240 },
  { key: "orig", title: "原价", unit: "元", kind: "number", sortable: true, width: 100, format: (v) => (v as number).toFixed(2) },
  { key: "act", title: "活动价", unit: "元", kind: "number", sortable: true, width: 120 },
  { key: "rate", title: "毛利率", unit: "%", kind: "number", sortable: true, width: 110, format: (v) => (v as number).toFixed(1) },
  { key: "chg", title: "较昨日", unit: "%", kind: "delta", sortable: true, width: 100 },
  { key: "actions", title: "操作", align: "right", sticky: "right", width: 130 },
];
const kinds = [{ value: "", label: "全部价型" }, { value: "活动价", label: "活动价" }, { value: "报名价", label: "报名价" }];
const shown = computed(() => rows.filter((r) => (!kind.value || r.kind === kind.value) && (!search.value || r.name.includes(search.value))));
const applied = computed(() => (kind.value ? [{ key: "kind", label: `价型：${kind.value}` }] : []));
function query() { loading.value = true; setTimeout(() => (loading.value = false), 700); }

const days = Array.from({ length: 30 }, (_, i) => `${i + 1} 日`);
const a = Array.from({ length: 30 }, (_, i) => Math.round(52000 + Math.sin(i / 3.5) * 11000 + i * 700 + ((i * 13) % 7) * 800));
const series = [{ name: "本月", values: a }, { name: "上月同期", values: a.map((v, i) => Math.round(v * 0.9 + Math.cos(i / 4) * 2000)), dashed: true }];
const tokens = [["canvas", "页面底色"], ["surface", "卡片、表格"], ["muted", "悬停、分隔"], ["line", "边框"], ["fg", "正文"], ["fg-muted", "次要文字"], ["primary", "品牌色"], ["primary-soft", "品牌浅底"], ["ok", "成功"], ["warn", "待处理"], ["bad", "失败"], ["info", "提示"]];
const types = [
  ["展示标题", "32 / 600 / 字距 -1%", "text-[32px] leading-tight font-semibold tracking-tight", "每一步都看得见结果"],
  ["页面标题", "22 / 600", "text-[22px] font-semibold tracking-tight", "文件管理 Files 1,284,630"],
  ["区块标题", "15 / 600", "text-[15px] font-semibold", "团队文件与最近上传"],
  ["正文", "14 / 400", "", "表格、表单与说明都使用这个大小，中文用系统黑体，数字与英文用 Inter。"],
  ["辅助说明", "13 / 400", "text-[13px] text-fg-muted", "次要信息、字段提示、时间"],
  ["标注", "12 / 500", "text-xs font-medium text-fg-faint", "标签、页脚、快捷键"],
  ["数字", "等宽数字", "text-[26px] font-semibold tracking-tight tabular-nums", "1,284,630.50"],
];
const recipes = [
  ["列表页", "PageFrame → StatusLine → FilterBar → DataTable。快速查看用抽屉，可分享的详情用独立页。"],
  ["详情页", "PageFrame（操作放右上）→ Card → DescriptionList；相关记录用时间线或表格。"],
  ["表单页", "PageFrame narrow → Card → Stack → Field + 控件；提交按钮放右下。"],
  ["总览页", "PageFrame → MetricStrip → 图表与排名并排 → 表格。"],
  ["登录页", "AuthLayout → 标题 → Field + 大号输入 → 主按钮。名称、logo、文案在 app.config.ts 里改。"],
];
</script>
<template>
  <PageFrame title="设计预览">
    <template #tabs><UiTabs v-model="tab" :items="[{ value: 'theme', label: '配色与主题' }, { value: 'controls', label: '控件' }, { value: 'data', label: '数据展示' }, { value: 'pages', label: '页面拼法' }]" /></template>

    <template v-if="tab === 'theme'">
      <StatusLine :items="[{ text: '点一套配色，整个界面立即切换' }, { text: '用户的选择保存在浏览器里' }]" />
      <Grid :cols="3">
        <button v-for="p in palettes" :key="p.id" type="button" class="flex flex-col gap-2 rounded-lg border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5" :class="settings.palette === p.id ? 'border-primary shadow-[0_0_0_3px_var(--ring)]' : 'border-line hover:border-line-strong'" :aria-pressed="settings.palette === p.id" @click="choosePalette(p.id)">
          <span class="flex items-center gap-2"><span class="size-5 rounded-full border border-line-strong" :style="{ background: `oklch(${p.brandLightness} ${Math.max(p.brandChroma, 0.04)} ${p.brandHue})` }" /><b class="font-semibold">{{ p.name }}</b><UiTag v-if="settings.palette === p.id" tone="primary" class="ml-auto">当前</UiTag></span>
          <span class="text-fg-muted">{{ p.character }}</span>
        </button>
      </Grid>
      <Card title="当前配色的颜色">
        <Grid :cols="4" gap="sm">
          <div v-for="[name, use] in tokens" :key="name" class="flex items-center gap-3"><span class="size-9 shrink-0 rounded-md border border-line-strong" :style="{ background: `var(--${name})` }" /><span class="min-w-0"><b class="block truncate font-mono text-[13px] font-medium">{{ name }}</b><span class="text-xs text-fg-faint">{{ use }}</span></span></div>
        </Grid>
      </Card>
      <Card title="字体与层级" flush>
        <ul>
          <li v-for="[name, spec, cls, sample] in types" :key="name" class="grid items-baseline gap-1 border-t border-line px-4 py-3 first:border-t-0 sm:grid-cols-[120px_160px_1fr] sm:gap-4">
            <b class="font-medium">{{ name }}</b><span class="font-mono text-[12px] text-fg-faint">{{ spec }}</span><span :class="cls">{{ sample }}</span>
          </li>
        </ul>
      </Card>
      <p class="text-fg-muted">圆角、疏密、侧栏风格和自定义品牌色在右上角的调色板里调。选定后把配色写进 <UiTag tone="code">src/app/app.config.ts</UiTag> 作为产品默认。</p>
    </template>

    <template v-else-if="tab === 'controls'">
      <Grid :cols="2">
        <Card title="按钮">
          <Stack>
            <Row><UiButton variant="primary">主要操作</UiButton><UiButton>次要操作</UiButton><UiButton variant="ghost">轻量操作</UiButton><UiButton variant="danger-quiet">删除</UiButton><UiButton variant="danger">确认删除</UiButton><UiButton variant="link">链接</UiButton></Row>
            <Row><UiButton variant="primary" size="sm"><Plus class="size-4" />小号</UiButton><UiButton size="lg"><Download class="size-4" />大号</UiButton><UiTip text="只有图标的按钮要有悬停说明"><UiButton size="icon" aria-label="下载"><Download class="size-4" /></UiButton></UiTip><UiButton disabled>不可用</UiButton><UiButton loading>处理中</UiButton></Row>
            <p class="text-[13px] text-fg-faint">每个区域只放一个主要操作。页面上的删除用“删除”样式，只有确认弹窗里的最后一步才用实心红色。</p>
          </Stack>
        </Card>
        <Card title="标签与状态">
          <Row><UiTag>默认</UiTag><UiTag tone="primary">强调</UiTag><UiTag tone="ok" dot>成功</UiTag><UiTag tone="warn" dot>待处理</UiTag><UiTag tone="bad" dot>失败</UiTag><UiTag tone="info">提示</UiTag><UiTag tone="code">AX100245</UiTag></Row>
        </Card>
        <Card title="表单">
          <Stack>
            <Field label="项目名称" for="n" required hint="用于列表显示"><UiInput id="n" v-model="text" placeholder="请输入" /></Field>
            <Field label="单价" for="p" error="金额必须大于 0"><UiInput id="p" model-value="-1" invalid align="right" unit><template #suffix>元</template></UiInput></Field>
            <Field label="价型" for="k"><UiSelect v-model="kind" :options="kinds" placeholder="请选择" /></Field>
            <UiCheckbox v-model="agreed" label="我已阅读项目说明" />
          </Stack>
        </Card>
        <Card title="文件选择与搜索"><Stack><UiFileDrop v-model="file" hint="一次一个文件，最大 10 MB" /><UiSearchInput v-model="search" placeholder="搜索商品名" /></Stack></Card>
        <Card title="弹窗、抽屉、菜单与提示">
          <Row><UiButton @click="dialog = true">确认弹窗</UiButton><UiButton @click="drawer = true">侧边抽屉</UiButton>
            <UiMenu :items="[{ key: 'a', label: '编辑' }, { key: 'b', label: '复制' }, { key: 'c', label: '删除', danger: true }]" @select="(k) => toast.info(`选择了 ${k}`)"><UiButton>更多操作</UiButton></UiMenu>
            <UiButton @click="toast.success('已保存')">显示一条操作成功的提示</UiButton></Row>
        </Card>
        <Card title="读取中、没有数据、出错">
          <Stack>
            <UiSkeleton width="60%" /><UiSkeleton width="90%" />
            <UiEmpty title="没有符合条件的数据" hint="换个关键词，或清除筛选条件"><template #icon><Inbox class="size-5" /></template><UiButton>清除筛选</UiButton></UiEmpty>
            <StatusMessage status="error" error="保存失败：原来的输入已保留，可以修改后再提交。" />
          </Stack>
        </Card>
      </Grid>
    </template>

    <template v-else-if="tab === 'data'">
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
      <FilterBar :applied="applied" :loading="loading" @query="query" @reset="kind = ''" @remove="kind = ''">
        <FilterItem size="lg"><UiSearchInput v-model="search" placeholder="商品名 / SKU / 条码" /></FilterItem>
        <FilterItem><UiSelect v-model="kind" :options="kinds" aria-label="价型" /></FilterItem>
      </FilterBar>
      <DataTable v-model:selected="picked" v-model:sort="sort" v-model:expanded="expanded" v-model:page="page" v-model:page-size="pageSize" title="商品价格" :meta="`共 ${shown.length} 条`" :columns="columns" :rows="shown" row-key="id" selectable :loading="loading" :total="2317">
        <template #toolbar><UiButton variant="primary" :disabled="!picked.length">{{ picked.length ? `批量调价（${picked.length}）` : "批量调价" }}</UiButton></template>
        <template #cell-name="{ row }"><CellText :title="row.name">{{ row.store }}<UiTag tone="code">{{ row.sku }}</UiTag></CellText></template>
        <template #cell-act="{ row }"><div class="inline-flex flex-col items-end gap-0.5"><b class="font-medium">{{ row.act.toFixed(2) }}</b><UiTag tone="primary">{{ row.kind }}</UiTag></div></template>
        <template #cell-actions="{ row }"><UiButton variant="link" @click="drawer = true">详情</UiButton><UiButton variant="link" @click="expanded = expanded.includes(row.id) ? expanded.filter((x) => x !== row.id) : [...expanded, row.id]">依据</UiButton></template>
        <template #expanded="{ row }"><DescriptionList :columns="2" :items="[{ label: '建议原因', value: '毛利率低于 30% 红线' }, { label: '规则编号', value: 'R-03' }, { label: '同店排名', value: `第 ${Number(row.id) + 3} / 40` }, { label: '近 7 日均价', value: (row.act * 1.03).toFixed(2) + ' 元' }]" /></template>
        <template #bulk><UiButton variant="primary" size="sm">批量调价</UiButton></template>
      </DataTable>
      <Card title="键值对、时间线与迷你趋势"><Grid :cols="2"><DescriptionList :items="[{ label: '店铺', value: '南岸门店' }, { label: '近 7 日', key: 'trend' }]"><template #value-trend><Sparkline :values="[3, 5, 4, 6, 8, 7, 9]" /></template></DescriptionList><Timeline :items="[{ title: '活动价 0.99', time: '今天 09:30' }, { title: '活动价 1.03', time: '08-07' }, { title: '原价 2.00', time: '08-01' }]" /></Grid></Card>
    </template>

    <template v-else>
      <Card title="五种常见页面怎么拼" flush>
        <ul>
          <li v-for="[name, how] in recipes" :key="name" class="grid gap-1 border-t border-line px-4 py-3 first:border-t-0 sm:grid-cols-[96px_1fr] sm:gap-4"><b class="font-medium">{{ name }}</b><span class="text-fg-muted">{{ how }}</span></li>
        </ul>
      </Card>
      <p class="text-fg-muted">完整规则和每个组件的用法在 <UiTag tone="code">src/shared/ui/README.md</UiTag>。</p>
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
