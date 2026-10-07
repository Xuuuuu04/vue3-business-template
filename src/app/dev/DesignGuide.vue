<script setup lang="ts">
/** 设计预览：配色、控件、数据展示和页面拼法的实际效果。切换配色立即生效。 */
import { computed, ref } from "vue";
import { Inbox } from "lucide-vue-next";
import {
  PageFrame, Stack, Row, Grid, Card, Field, StatusLine, FilterBar, FilterItem, DataTable, CellText, MetricStrip,
  DescriptionList, Timeline, LineChart, BarList, Sparkline, BarChart, DonutChart, ActivityFeed, FormSection, BatchProgress,
  UiButton, UiInput, UiSearchInput, UiSelect, UiCheckbox, UiTag, UiTabs, UiDialog, UiDrawer, UiTip, UiMenu, UiSkeleton, UiEmpty, UiFileDrop,
  UiTextarea, UiSwitch, UiRadioGroup, UiSegmented, UiNumberInput, UiTagsInput, UiCombobox, UiDatePicker, UiDateRangePicker, UiPasswordInput,
  UiAlert, UiResult, UiPopconfirm, UiProgress, UiAvatar, UiAvatarGroup, UiSteps, UiAccordion, UiKbd, UiFileIcon,
  ChatThread, PromptInput, Markdown, CodeBlock, UsageMeter,
  StatusMessage, useToast, useTheme, palettes, type DataColumn, type SortState,
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
  ["区块标题", "17 / 600", "text-[17px] font-semibold", "团队文件与最近上传"],
  ["正文", "16 / 400", "", "表格、表单与说明都使用这个大小，中文用系统黑体，数字与英文用 Inter。"],
  ["辅助说明", "13 / 400", "text-[13px] text-fg-muted", "次要信息、字段提示、时间"],
  ["标注", "12 / 500", "text-xs font-medium text-fg-faint", "标签、页脚、快捷键"],
  ["数字", "等宽数字", "text-[26px] font-semibold tracking-tight tabular-nums", "1,284,630.50"],
];
const recipes = [
  ["列表页", "PageFrame workspace → DataTable fill flat。一个列表占满主区，主要操作放右上，筛选放表格工具条。"],
  ["详情页", "PageFrame workspace → WorkArea fill。围绕同一个对象展示，次要字段按需展开，主要操作只保留一个。"],
  ["表单页", "PageFrame workspace → WorkArea form → 表单。说明贴近字段，保存入口放页头，不另做须知卡片。"],
  ["设置页", "同一类设置使用一个主区；外观、账号、关于通过标签切换，不同时堆在首屏。"],
  ["登录页", "AuthLayout → 字段 → 登录。只负责进入产品，品牌信息来自 app.config.ts。"],
];

// —— 表单示例 ——
const note = ref("");
const notify = ref(true);
const plan = ref("team");
const range = ref("30");
const qty = ref<number | undefined>(12);
const keywords = ref(["季度", "复盘"]);
const owner = ref("");
const watchers = ref<string[]>(["lin"]);
const day = ref("");
const period = ref<string[]>([]);
const pwd = ref("");
const people = [{ value: "lin", label: "林知远", hint: "运营" }, { value: "zhou", label: "周晓", hint: "采购" }, { value: "chen", label: "陈一鸣", hint: "财务" }, { value: "wu", label: "吴越", hint: "商品" }, { value: "he", label: "何静", hint: "门店" }];
// —— 反馈示例 ——
const step = ref(1);
const sample = [{ key: "a", label: "2026 第三季度经营报告.pdf", status: "ok" }, { key: "b", label: "客户名单.xlsx", status: "failed", error: "没有删除权限" }, { key: "c", label: "品牌素材包.zip", status: "unknown", error: "网络中断，结果未确认" }, { key: "d", label: "会议纪要.md", status: "skipped" }];
// —— 数据示例 ——
const activity = [
  { id: "1", actor: "林知远", action: "上传了", target: "2026 第三季度经营报告.pdf", time: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: "2", actor: "周晓", action: "评论了", target: "采购计划-十月.csv", time: new Date(Date.now() - 5 * 3600e3).toISOString(), note: "矿泉水的数量再核一下，上周到货偏多。" },
  { id: "3", actor: "陈一鸣", action: "下载了", target: "年度预算草案.pdf", time: new Date(Date.now() - 26 * 3600e3).toISOString() },
  { id: "4", actor: "何静", action: "删除了", target: "旧版门店照片.zip", time: new Date(Date.now() - 50 * 3600e3).toISOString() },
];
// —— AI 示例 ——
const mdSample = "**粗体**、`行内代码` 和 [链接](https://example.com)。\n\n- 列表第一项\n- 列表第二项\n\n> 引用的说明文字";
const codeSample = "npm run new:module -- orders --title 订单管理\nnpm run docs\nnpm run check -- --module orders";
const prompt = ref("");
const busy = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
const chat = ref([
  { id: "u1", role: "user" as const, content: "帮我总结一下九月南岸门店的销售情况" },
  { id: "a1", role: "assistant" as const, content: "九月南岸门店整体**稳中有升**：\n\n1. 实付金额 38.2 万元，环比增长 12.4%\n2. 有效订单 4,120 单，客单价 92.7 元\n3. 推广消耗下降 31%，投入产出更好\n\n需要导出明细，可以运行：\n\n```sql\nselect day, orders, paid from store_daily where store = '南岸门店';\n```" },
]);
const reply = "好的，我按**周**拆开看：第一周受国庆前备货影响订单偏少，第二、三周恢复到日均 140 单以上，第四周因为 `满减活动` 带动达到峰值。建议十月继续保留周末满减。";
function send(text: string) {
  chat.value.push({ id: `u${Date.now()}`, role: "user", content: text });
  const msg = { id: `a${Date.now()}`, role: "assistant" as const, content: "", streaming: true };
  chat.value.push(msg);
  busy.value = true;
  let n = 0;
  timer = setInterval(() => {
    n += 3;
    const last = chat.value.at(-1)!;
    last.content = reply.slice(0, n);
    if (n >= reply.length) stop();
  }, 40);
}
function stop() { clearInterval(timer); busy.value = false; const last = chat.value.at(-1); if (last && "streaming" in last) (last as { streaming?: boolean }).streaming = false; }
</script>
<template>
  <PageFrame title="设计预览">
    <template #tabs><UiTabs v-model="tab" :items="[{ value: 'theme', label: '配色与字体' }, { value: 'forms', label: '表单' }, { value: 'feedback', label: '按钮与反馈' }, { value: 'data', label: '数据展示' }, { value: 'ai', label: 'AI 应用' }, { value: 'pages', label: '页面拼法' }]" /></template>

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


    <template v-else-if="tab === 'forms'">
      <Grid :cols="2">
        <Card title="文本输入"><Stack>
          <Field label="项目名称" for="n" required hint="用于列表显示"><UiInput id="n" v-model="text" placeholder="请输入" /></Field>
          <Field label="单价" for="p" error="金额必须大于 0"><UiInput id="p" model-value="-1" invalid align="right" unit><template #suffix>元</template></UiInput></Field>
          <Field label="密码" for="pw" hint="显示/隐藏，开了大写会提醒"><UiPasswordInput id="pw" v-model="pwd" autocomplete="new-password" /></Field>
          <Field label="备注" for="note"><UiTextarea id="note" v-model="note" autosize :maxlength="200" placeholder="随内容长高，最多 8 行" /></Field>
        </Stack></Card>
        <Card title="选择"><Stack>
          <Field label="价型" for="k" hint="选项少于 10 个用下拉"><UiSelect v-model="kind" :options="kinds" placeholder="请选择" /></Field>
          <Field label="负责人" hint="选项多时用可搜索下拉"><UiCombobox v-model="owner" :options="people" placeholder="搜索姓名" aria-label="负责人" /></Field>
          <Field label="关注人" hint="可多选"><UiCombobox v-model="watchers" :options="people" multiple placeholder="添加关注人" aria-label="关注人" /></Field>
          <Field label="关键词" hint="回车或逗号添加"><UiTagsInput v-model="keywords" placeholder="输入关键词" /></Field>
        </Stack></Card>
        <Card title="数字与日期"><Stack>
          <Field label="采购数量"><UiNumberInput v-model="qty" :min="0" :max="9999" unit="箱" aria-label="采购数量" /></Field>
          <Field label="到货日期"><UiDatePicker v-model="day" placeholder="选择日期" /></Field>
          <Field label="统计区间" hint="左边有常用范围"><UiDateRangePicker v-model="period" placeholder="选择日期范围" /></Field>
        </Stack></Card>
        <Card title="开关、单选与分段"><Stack>
          <UiSwitch v-model="notify" label="有新文件时通知我" hint="立即生效的设置用开关" />
          <UiCheckbox v-model="agreed" label="我已阅读项目说明" />
          <UiRadioGroup v-model="plan" direction="row" :options="[{ value: 'personal', label: '个人' }, { value: 'team', label: '团队' }, { value: 'enterprise', label: '企业' }]" aria-label="版本" />
          <UiSegmented v-model="range" :options="[{ value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" aria-label="时间范围" />
        </Stack></Card>
      </Grid>
      <Card title="方案选择（卡片单选）"><UiRadioGroup v-model="plan" variant="card" :options="[{ value: 'personal', label: '个人版', hint: '1 人使用，5 GB 空间' }, { value: 'team', label: '团队版', hint: '最多 50 人，500 GB 空间' }, { value: 'enterprise', label: '企业版', hint: '不限人数，单点登录与审批' }]" aria-label="方案" /></Card>
      <Card title="设置类表单（FormSection）">
        <FormSection title="通知" text="什么时候提醒你"><UiSwitch v-model="notify" label="有新文件时通知我" /><UiSwitch :model-value="false" label="每周发送汇总邮件" /></FormSection>
        <FormSection title="默认查看范围" text="打开列表时默认显示的时间范围"><UiSegmented v-model="range" :options="[{ value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" aria-label="默认范围" /></FormSection>
        <FormSection title="文件上传"><Field label="文件选择"><UiFileDrop v-model="file" hint="一次一个文件，最大 10 MB" /></Field></FormSection>
      </Card>
    </template>

    <template v-else-if="tab === 'feedback'">
      <Grid :cols="2">
        <Card title="按钮"><Stack>
          <Row><UiButton variant="primary">主要操作</UiButton><UiButton>次要操作</UiButton><UiButton variant="ghost">轻量操作</UiButton><UiButton variant="link">链接</UiButton></Row>
          <Row><UiButton variant="danger-quiet" icon="delete">删除</UiButton><UiButton variant="danger">确认删除</UiButton><UiButton disabled>不可用</UiButton><UiButton loading>处理中</UiButton></Row>
          <Row><UiButton variant="primary" size="sm" icon="plus">小号</UiButton><UiButton size="lg" icon="download">大号</UiButton><UiTip text="只有图标的按钮要有悬停说明"><UiButton size="icon" icon="download" aria-label="下载" /></UiTip><span class="text-fg-muted">快捷键 <UiKbd>⌘</UiKbd> <UiKbd>K</UiKbd></span></Row>
        </Stack></Card>
        <Card title="标签与头像"><Stack>
          <Row><UiTag>默认</UiTag><UiTag tone="primary">强调</UiTag><UiTag tone="ok" dot>成功</UiTag><UiTag tone="warn" dot>待处理</UiTag><UiTag tone="bad" dot>失败</UiTag><UiTag tone="info">提示</UiTag><UiTag tone="code">AX100245</UiTag></Row>
          <Row><UiAvatar name="林知远" size="lg" /><UiAvatar name="周晓" /><UiAvatar name="陈一鸣" size="sm" /><UiAvatarGroup :people="[{ name: '林知远' }, { name: '周晓' }, { name: '陈一鸣' }, { name: '吴越' }, { name: '何静' }, { name: '赵岚' }]" /></Row>
          <Row><UiFileIcon name="a.pdf" /><UiFileIcon name="a.xlsx" /><UiFileIcon name="a.docx" /><UiFileIcon name="a.pptx" /><UiFileIcon name="a.png" /><UiFileIcon name="a.zip" /><UiFileIcon name="a.md" /></Row>
        </Stack></Card>
      </Grid>
      <Stack gap="sm">
        <UiAlert tone="info" title="系统将在今晚 23:00 维护" text="维护期间约 10 分钟不能保存，请提前保存正在编辑的内容。" closable />
        <UiAlert tone="ok" text="价格表已更新到 10 月 6 日。" />
        <UiAlert tone="warn" title="有 2 个文件结果未确认" text="网络中断导致无法确认是否已删除。请先刷新列表查看，不要重复操作。"><UiButton size="sm">刷新列表</UiButton></UiAlert>
        <UiAlert tone="bad" title="保存失败" text="金额必须大于 0，原来的输入已保留。" />
      </Stack>
      <Grid :cols="2">
        <Card title="弹层与确认"><Row>
          <UiButton @click="dialog = true">确认弹窗</UiButton><UiButton @click="drawer = true">侧边抽屉</UiButton>
          <UiMenu :items="[{ key: 'a', label: '编辑' }, { key: 'b', label: '复制' }, { key: 'c', label: '删除', danger: true }]" @select="(k) => toast.info(`选择了 ${k}`)"><UiButton>更多操作</UiButton></UiMenu>
          <UiPopconfirm title="移除这一行？" text="可以在回收站恢复。" danger confirm-text="移除" @confirm="toast.success('已移除')"><UiButton variant="danger-quiet">气泡确认</UiButton></UiPopconfirm>
          <UiButton @click="toast.success('已保存')">轻提示</UiButton>
        </Row></Card>
        <Card title="进度"><Stack>
          <UiProgress :value="68" label="上传进度" /><UiProgress :value="92" tone="warn" label="空间" /><UiProgress label="处理中" />
          <UsageMeter label="存储空间" :used="412" :limit="500" unit=" GB" />
        </Stack></Card>
        <Card title="步骤条"><Stack>
          <UiSteps :items="[{ title: '填写信息' }, { title: '选择方案', text: '可随时更换' }, { title: '确认支付' }, { title: '完成' }]" :current="step" />
          <Row justify="end"><UiButton :disabled="step === 0" @click="step--">上一步</UiButton><UiButton variant="primary" :disabled="step === 3" @click="step++">下一步</UiButton></Row>
        </Stack></Card>
        <Card title="批量执行的逐项结果"><BatchProgress :items="sample" verb="已删除" /></Card>
        <Card title="读取中、没有数据、出错"><Stack>
          <UiSkeleton width="60%" /><UiSkeleton width="90%" />
          <UiEmpty title="没有符合条件的数据" hint="换个关键词，或清除筛选条件"><template #icon><Inbox class="size-5" /></template><UiButton>清除筛选</UiButton></UiEmpty>
          <StatusMessage status="error" error="保存失败：原来的输入已保留，可以修改后再提交。" />
        </Stack></Card>
        <Card title="折叠面板"><UiAccordion :items="[{ value: 'a', title: '文件最大可以多大？' }, { value: 'b', title: '删除后还能恢复吗？' }, { value: 'c', title: '谁能看到我上传的文件？' }]" :default-open="['a']"><template #item-a>单个文件不超过 10 MB，产品可以在后台调整。</template><template #item-b>删除后不能恢复，请先下载备份。</template><template #item-c>同一团队里有查看权限的成员。</template></UiAccordion></Card>
      </Grid>
      <Card title="结果页"><Grid :cols="2"><UiResult status="success" title="提交成功" text="审批人会在 1 个工作日内处理，结果会通知你。"><UiButton variant="primary">查看申请</UiButton><UiButton>返回列表</UiButton></UiResult><UiResult status="error" title="支付没有完成" text="银行返回余额不足。订单已保留 30 分钟。"><UiButton variant="primary">重新支付</UiButton></UiResult></Grid></Card>
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
        <template #cell-actions="{ row }"><Row justify="end" gap="md" nowrap><UiButton variant="link" @click="drawer = true">详情</UiButton><UiButton variant="link" @click="expanded = expanded.includes(row.id) ? expanded.filter((x) => x !== row.id) : [...expanded, row.id]">依据</UiButton></Row></template>
        <template #expanded="{ row }"><DescriptionList :columns="2" :items="[{ label: '建议原因', value: '毛利率低于 30% 红线' }, { label: '规则编号', value: 'R-03' }, { label: '同店排名', value: `第 ${Number(row.id) + 3} / 40` }, { label: '近 7 日均价', value: (row.act * 1.03).toFixed(2) + ' 元' }]" /></template>
        <template #bulk><UiButton variant="primary" size="sm">批量调价</UiButton></template>
      </DataTable>
      <Grid :cols="2">
        <Card title="柱状图"><BarChart :labels="['周一', '周二', '周三', '周四', '周五', '周六', '周日']" :series="[{ name: '本周', values: [132, 148, 141, 156, 170, 212, 198] }, { name: '上周', values: [120, 131, 138, 142, 151, 188, 176] }]" /></Card>
        <Card title="环形图"><DonutChart :items="[{ label: '美团', value: 18420 }, { label: '淘宝', value: 12960 }, { label: '门店自提', value: 7310 }, { label: '其他', value: 2140 }]" unit=" 单" center-label="订单" /></Card>
      </Grid>
      <Card title="动态"><ActivityFeed :items="activity" /></Card>
      <Card title="键值对、时间线与迷你趋势"><Grid :cols="2"><DescriptionList :items="[{ label: '店铺', value: '南岸门店' }, { label: '近 7 日', key: 'trend' }]"><template #value-trend><Sparkline :values="[3, 5, 4, 6, 8, 7, 9]" /></template></DescriptionList><Timeline :items="[{ title: '活动价 0.99', time: '今天 09:30' }, { title: '活动价 1.03', time: '08-07' }, { title: '原价 2.00', time: '08-01' }]" /></Grid></Card>
    </template>


    <template v-else-if="tab === 'ai'">
      <Grid ratio="2:1">
        <Card title="对话">
          <div class="flex h-[520px] flex-col">
            <ChatThread :messages="chat" user-name="林知远" assistant-name="经营助手" />
            <PromptInput v-model="prompt" :busy="busy" @send="send" @stop="stop"><template #tools><UiTag>经营数据 · 九月</UiTag></template></PromptInput>
          </div>
        </Card>
        <Stack>
          <Card title="本月用量"><Stack><UsageMeter label="对话次数" :used="8240" :limit="10000" /><UsageMeter label="Token" :used="1.92" :limit="2" unit=" M" :format="(v) => v.toFixed(2)" /><UsageMeter label="知识库文档" :used="126" :limit="500" unit=" 篇" /></Stack></Card>
          <Card title="Markdown"><Markdown :text="mdSample" /></Card>
        </Stack>
      </Grid>
      <Card title="代码块"><CodeBlock lang="bash" :code="codeSample" /></Card>
    </template>

    <template v-else-if="tab === 'pages'">
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
