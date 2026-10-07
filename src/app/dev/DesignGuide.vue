<script setup lang="ts">
/** 设计预览：配色、控件、数据展示和页面拼法的实际效果。切换配色立即生效。 */
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import GalleryStage, { type GalleryExample } from "./GalleryStage.vue";
import { Inbox } from "lucide-vue-next";
import {
  PageFrame, Stack, Row, Grid, Field, FilterItem, DataTable, CellText, MetricStrip,
  DescriptionList, Timeline, LineChart, BarList, Sparkline, BarChart, DonutChart, ActivityFeed, FormSection, BatchProgress,
  UiButton, UiInput, UiSearchInput, UiSelect, UiCheckbox, UiTag, UiTabs, UiDialog, UiDrawer, UiTip, UiMenu, UiSkeleton, UiEmpty, UiFileDrop,
  UiTextarea, UiSwitch, UiRadioGroup, UiSegmented, UiNumberInput, UiTagsInput, UiCombobox, UiDatePicker, UiDateRangePicker, UiPasswordInput,
  UiAlert, UiResult, UiPopconfirm, UiProgress, UiAvatar, UiAvatarGroup, UiSteps, UiAccordion, UiKbd, UiFileIcon,
  ChatThread, PromptInput, Markdown, CodeBlock, UsageMeter,
  StatusMessage, useToast, useTheme, palettes, type DataColumn, type SortState,
} from "@/shared/ui/public";

const toast = useToast();
const { settings, choosePalette } = useTheme();
const route = useRoute();
const router = useRouter();
const examples: Record<string, GalleryExample[]> = {
  theme: [
    { value: "palettes", label: "产品配色", components: "useTheme" },
    { value: "tokens", label: "语义颜色", components: "theme/tokens.css" },
    { value: "typography", label: "字体与层级", components: "Inter · 系统黑体" },
  ],
  forms: [
    { value: "inputs", label: "文本输入", components: "UiInput · UiTextarea", form: true },
    { value: "choices", label: "下拉与多选", components: "UiSelect · UiCombobox", form: true },
    { value: "dates", label: "数字与日期", components: "UiNumberInput · UiDatePicker", form: true },
    { value: "toggles", label: "开关与分段", components: "UiSwitch · UiSegmented", form: true },
    { value: "plans", label: "方案选择", components: "UiRadioGroup" },
    { value: "form-sections", label: "设置表单", components: "FormSection", form: true },
    { value: "upload", label: "文件选择", components: "UiFileDrop", form: true },
  ],
  feedback: [
    { value: "buttons", label: "按钮", components: "UiButton", form: true },
    { value: "tags", label: "标签与图标", components: "UiTag · UiAvatar · UiFileIcon", form: true },
    { value: "alerts", label: "就近提示", components: "UiAlert", form: true },
    { value: "overlays", label: "弹层与确认", components: "UiDialog · UiDrawer", form: true },
    { value: "progress", label: "进度与用量", components: "UiProgress · UsageMeter", form: true },
    { value: "steps", label: "步骤条", components: "UiSteps" },
    { value: "batch", label: "逐项执行结果", components: "BatchProgress", form: true },
    { value: "states", label: "读取状态", components: "UiSkeleton · UiEmpty", form: true },
    { value: "accordion", label: "按需展开", components: "UiAccordion", form: true },
    { value: "result", label: "操作结果", components: "UiResult", form: true },
  ],
  data: [
    { value: "table", label: "数据表格", components: "DataTable" },
    { value: "line", label: "趋势图", components: "LineChart" },
    { value: "bars", label: "柱状图", components: "BarChart" },
    { value: "donut", label: "构成比例", components: "DonutChart", form: true },
    { value: "ranking", label: "排名", components: "BarList", form: true },
    { value: "metrics", label: "关键数字", components: "MetricStrip" },
    { value: "activity", label: "动态记录", components: "ActivityFeed", form: true },
    { value: "description", label: "对象信息", components: "DescriptionList · Sparkline", form: true },
    { value: "timeline", label: "时间线", components: "Timeline", form: true },
  ],
  ai: [
    { value: "conversation", label: "对话", components: "ChatThread · PromptInput" },
    { value: "markdown", label: "文档排版", components: "Markdown", form: true },
    { value: "code", label: "代码块", components: "CodeBlock" },
    { value: "usage", label: "使用情况", components: "UsageMeter", form: true },
  ],
  pages: [{ value: "recipes", label: "页面结构", components: "PageFrame · WorkArea" }],
};
/** 类别和示例保存在地址里，刷新与分享仍能看到同一项。 */
const tab = computed({
  get: () => Object.hasOwn(examples, String(route.query.section)) ? String(route.query.section) : "theme",
  set: (value: string) => { void router.replace({ query: { ...route.query, section: value, example: examples[value]![0]!.value } }); },
});
const example = computed({
  get: () => examples[tab.value]!.some((item) => item.value === route.query.example) ? String(route.query.example) : examples[tab.value]![0]!.value,
  set: (value: string) => { void router.replace({ query: { ...route.query, section: tab.value, example: value } }); },
});
const text = ref("");
const search = ref("");
const kind = ref("");
const agreed = ref(false);
const dialog = ref(false);
const drawer = ref(false);
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
const inspected = ref(rows[0]!);
function inspect(row: Item) { inspected.value = row; drawer.value = true; }
function selectInspected() {
  picked.value = [...new Set([...picked.value, inspected.value.id])];
  drawer.value = false;
}
const shown = computed(() => rows.filter((r) => (!kind.value || r.kind === kind.value) && (!search.value || r.name.includes(search.value))));

const days = Array.from({ length: 30 }, (_, i) => `${i + 1} 日`);
const a = Array.from({ length: 30 }, (_, i) => Math.round(52000 + Math.sin(i / 3.5) * 11000 + i * 700 + ((i * 13) % 7) * 800));
const series = [{ name: "本月", values: a }, { name: "上月同期", values: a.map((v, i) => Math.round(v * 0.9 + Math.cos(i / 4) * 2000)), dashed: true }];
const tokens = [["canvas", "页面底色"], ["surface", "卡片、表格"], ["muted", "悬停、分隔"], ["line", "边框"], ["fg", "正文"], ["fg-muted", "次要文字"], ["primary", "品牌色"], ["primary-soft", "品牌浅底"], ["ok", "成功"], ["warn", "待处理"], ["bad", "失败"], ["info", "提示"]];
const types = [
  ["展示标题", "32 / 600 / 字距 -1%", "text-[32px] leading-tight font-semibold tracking-tight", "每一步都看得见结果"],
  ["页面标题", "24 / 600", "text-[24px] font-semibold tracking-tight", "文件管理 Files 1,284,630"],
  ["区块标题", "18 / 600", "text-[18px] leading-6 font-semibold", "团队文件与最近上传"],
  ["正文", "16 / 400", "", "表格、表单与说明都使用这个大小，中文用系统黑体，数字与英文用 Inter。"],
  ["辅助说明", "13 / 400", "text-help text-fg-muted", "次要信息、字段提示、时间"],
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
const readState = ref("loading");
const resultState = ref("success");
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
onBeforeUnmount(stop);
</script>
<template>
  <PageFrame title="设计预览" workspace>
    <template #tabs><UiTabs v-model="tab" :items="[{ value: 'theme', label: '配色与字体' }, { value: 'forms', label: '表单' }, { value: 'feedback', label: '按钮与反馈' }, { value: 'data', label: '数据展示' }, { value: 'ai', label: 'AI 应用' }, { value: 'pages', label: '页面拼法' }]" /></template>
    <GalleryStage v-model="example" :items="examples[tab]!">
      <template #palettes>
        <Grid :cols="3">
          <button v-for="p in palettes" :key="p.id" type="button" class="flex flex-col gap-3 rounded-md border bg-surface p-4 text-left transition-colors" :class="settings.palette === p.id ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong'" :aria-pressed="settings.palette === p.id" @click="choosePalette(p.id)">
            <span class="flex items-center gap-2"><span class="size-4 rounded-full border border-line-strong" :style="{ background: `oklch(${p.brandLightness} ${Math.max(p.brandChroma, 0.04)} ${p.brandHue})` }" /><b class="font-medium">{{ p.name }}</b><UiTag v-if="settings.palette === p.id" class="ml-auto">当前</UiTag></span>
            <span class="text-label leading-6 text-fg-muted">{{ p.character }}</span>
          </button>
        </Grid>
        <p class="text-help text-fg-muted">选择后立即应用。产品默认配色在 <UiTag tone="code">src/app/app.config.ts</UiTag> 设置。</p>
      </template>
      <template #tokens>
        <Grid :cols="3" gap="lg">
          <div v-for="[name, use] in tokens" :key="name" class="flex items-center gap-3"><span class="size-10 shrink-0 rounded-md border border-line" :style="{ background: `var(--${name})` }" /><span class="min-w-0"><b class="block truncate font-mono text-label font-medium">{{ name }}</b><span class="text-help text-fg-muted">{{ use }}</span></span></div>
        </Grid>
      </template>
      <template #typography>
        <ul class="divide-y divide-line">
          <li v-for="[name, spec, cls, sample] in types" :key="name" class="grid items-baseline gap-2 py-5 first:pt-0 lg:grid-cols-[104px_150px_1fr] lg:gap-4">
            <b class="text-label font-medium">{{ name }}</b><span class="font-mono text-[12px] text-fg-muted">{{ spec }}</span><span :class="cls">{{ sample }}</span>
          </li>
        </ul>
      </template>
      <template #inputs><Stack>
        <Field label="项目名称" for="n" required hint="用于列表显示"><UiInput id="n" v-model="text" placeholder="请输入" /></Field>
        <Field label="单价" for="p" error="金额必须大于 0"><UiInput id="p" model-value="-1" invalid align="right" unit><template #suffix>元</template></UiInput></Field>
        <Field label="密码" for="pw" hint="显示或隐藏密码，开启大写时提醒"><UiPasswordInput id="pw" v-model="pwd" autocomplete="new-password" /></Field>
        <Field label="备注" for="note"><UiTextarea id="note" v-model="note" autosize :maxlength="200" placeholder="随内容长高，最多 8 行" /></Field>
      </Stack></template>
      <template #choices><Stack>
        <Field label="价型" hint="选项较少时使用下拉"><UiSelect v-model="kind" :options="kinds" placeholder="请选择" /></Field>
        <Field label="负责人" hint="选项较多时可以搜索"><UiCombobox v-model="owner" :options="people" placeholder="搜索姓名" aria-label="负责人" /></Field>
        <Field label="关注人" hint="可选择多人"><UiCombobox v-model="watchers" :options="people" multiple placeholder="添加关注人" aria-label="关注人" /></Field>
        <Field label="关键词" hint="回车或逗号添加"><UiTagsInput v-model="keywords" placeholder="输入关键词" /></Field>
      </Stack></template>
      <template #dates><Stack>
        <Field label="采购数量"><UiNumberInput v-model="qty" :min="0" :max="9999" unit="箱" aria-label="采购数量" /></Field>
        <Field label="到货日期"><UiDatePicker v-model="day" placeholder="选择日期" /></Field>
        <Field label="统计区间" hint="可直接选择常用范围"><UiDateRangePicker v-model="period" placeholder="选择日期范围" /></Field>
      </Stack></template>
      <template #toggles><Stack>
        <UiSwitch v-model="notify" label="有新文件时通知我" hint="立即生效的设置用开关" />
        <UiCheckbox v-model="agreed" label="我已阅读项目说明" />
        <UiRadioGroup v-model="plan" direction="row" :options="[{ value: 'personal', label: '个人' }, { value: 'team', label: '团队' }, { value: 'enterprise', label: '企业' }]" aria-label="版本" />
        <UiSegmented v-model="range" :options="[{ value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" aria-label="时间范围" />
      </Stack></template>
      <template #plans><UiRadioGroup v-model="plan" variant="card" :options="[{ value: 'personal', label: '个人版', hint: '1 人使用，5 GB 空间' }, { value: 'team', label: '团队版', hint: '最多 50 人，500 GB 空间' }, { value: 'enterprise', label: '企业版', hint: '不限人数，单点登录与审批' }]" aria-label="方案" /></template>
      <template #form-sections><Stack gap="none">
        <FormSection title="通知" text="什么时候提醒你"><UiSwitch v-model="notify" label="有新文件时通知我" /><UiSwitch :model-value="false" label="每周发送汇总邮件" /></FormSection>
        <FormSection title="默认查看范围" text="打开列表时默认显示的时间范围"><UiSegmented v-model="range" :options="[{ value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" aria-label="默认范围" /></FormSection>
      </Stack></template>
      <template #upload><UiFileDrop v-model="file" hint="一次一个文件，最大 10 MB" /></template>
      <template #buttons><Stack>
        <Row><UiButton variant="primary">主要操作</UiButton><UiButton>次要操作</UiButton><UiButton variant="ghost">轻量操作</UiButton><UiButton variant="link">链接</UiButton></Row>
        <Row><UiButton variant="danger-quiet" icon="delete">删除</UiButton><UiButton variant="danger">确认删除</UiButton><UiButton disabled>不可用</UiButton><UiButton loading>处理中</UiButton></Row>
        <Row><UiButton variant="primary" size="sm" icon="plus">小号</UiButton><UiButton size="lg" icon="download">大号</UiButton><UiTip text="下载"><UiButton size="icon" icon="download" aria-label="下载" /></UiTip><span class="text-help text-fg-muted">快捷键 <UiKbd>⌘</UiKbd> <UiKbd>K</UiKbd></span></Row>
      </Stack></template>
      <template #tags><Stack>
        <Row><UiTag>默认</UiTag><UiTag tone="primary">强调</UiTag><UiTag tone="ok" dot>成功</UiTag><UiTag tone="warn" dot>待处理</UiTag><UiTag tone="bad" dot>失败</UiTag><UiTag tone="info">提示</UiTag><UiTag tone="code">AX100245</UiTag></Row>
        <Row><UiAvatar name="林知远" size="lg" /><UiAvatar name="周晓" /><UiAvatar name="陈一鸣" size="sm" /><UiAvatarGroup :people="[{ name: '林知远' }, { name: '周晓' }, { name: '陈一鸣' }, { name: '吴越' }, { name: '何静' }, { name: '赵岚' }]" /></Row>
        <Row><UiFileIcon name="a.pdf" /><UiFileIcon name="a.xlsx" /><UiFileIcon name="a.docx" /><UiFileIcon name="a.pptx" /><UiFileIcon name="a.png" /><UiFileIcon name="a.zip" /><UiFileIcon name="a.md" /></Row>
      </Stack></template>
      <template #alerts><Stack gap="sm">
        <UiAlert tone="info" title="系统将在今晚 23:00 维护" text="维护期间约 10 分钟不能保存，请提前保存正在编辑的内容。" closable />
        <UiAlert tone="ok" text="价格表已更新到 10 月 6 日。" />
        <UiAlert tone="warn" title="有 2 个文件结果未确认" text="网络中断导致无法确认是否已删除。请先刷新列表查看，不要重复操作。"><UiButton size="sm">刷新列表</UiButton></UiAlert>
        <UiAlert tone="bad" title="保存失败" text="金额必须大于 0，原来的输入已保留。" />
      </Stack></template>
      <template #overlays><Row>
        <UiButton @click="dialog = true">确认弹窗</UiButton><UiButton @click="drawer = true">侧边抽屉</UiButton>
        <UiMenu :items="[{ key: 'a', label: '编辑' }, { key: 'b', label: '复制' }, { key: 'c', label: '删除', danger: true }]" @select="(k) => toast.info(`选择了 ${k}`)"><UiButton>更多操作</UiButton></UiMenu>
        <UiPopconfirm title="移除这一行？" text="可以在回收站恢复。" danger confirm-text="移除" @confirm="toast.success('已移除')"><UiButton variant="danger-quiet">气泡确认</UiButton></UiPopconfirm>
        <UiButton @click="toast.success('已保存')">轻提示</UiButton>
      </Row></template>
      <template #progress><Stack>
        <UiProgress :value="68" label="上传进度" /><UiProgress :value="92" tone="warn" label="空间" /><UiProgress label="处理中" />
        <UsageMeter label="存储空间" :used="412" :limit="500" unit=" GB" />
      </Stack></template>
      <template #steps><Stack>
        <UiSteps :items="[{ title: '填写信息' }, { title: '选择方案', text: '可随时更换' }, { title: '确认支付' }, { title: '完成' }]" :current="step" />
        <Row justify="end"><UiButton :disabled="step === 0" @click="step--">上一步</UiButton><UiButton variant="primary" :disabled="step === 3" @click="step++">下一步</UiButton></Row>
      </Stack></template>
      <template #batch><BatchProgress :items="sample" verb="已删除" /></template>
      <template #states>
        <UiSegmented v-model="readState" :options="[{ value: 'loading', label: '读取中' }, { value: 'empty', label: '无结果' }, { value: 'error', label: '失败' }]" aria-label="读取状态" />
        <Stack v-if="readState === 'loading'"><UiSkeleton width="60%" /><UiSkeleton width="90%" /><UiSkeleton width="75%" /></Stack>
        <UiEmpty v-else-if="readState === 'empty'" title="没有符合条件的数据" hint="换个关键词，或清除筛选条件"><template #icon><Inbox class="size-5" /></template><UiButton>清除筛选</UiButton></UiEmpty>
        <StatusMessage v-else status="error" error="保存失败：原来的输入已保留，可以修改后再提交。" />
      </template>
      <template #accordion><UiAccordion :items="[{ value: 'a', title: '文件最大可以多大？' }, { value: 'b', title: '删除后还能恢复吗？' }, { value: 'c', title: '谁能看到我上传的文件？' }]" :default-open="['a']"><template #item-a>单个文件不超过 10 MB，产品可以在后台调整。</template><template #item-b>删除后不能恢复，请先下载备份。</template><template #item-c>同一团队里有查看权限的成员。</template></UiAccordion></template>
      <template #result>
        <UiSegmented v-model="resultState" :options="[{ value: 'success', label: '成功' }, { value: 'error', label: '失败' }]" aria-label="结果状态" />
        <UiResult v-if="resultState === 'success'" status="success" title="提交成功" text="审批人会在 1 个工作日内处理，结果会通知你。"><UiButton variant="primary">查看申请</UiButton><UiButton>返回列表</UiButton></UiResult>
        <UiResult v-else status="error" title="支付没有完成" text="银行返回余额不足。订单已保留 30 分钟。"><UiButton variant="primary">重新支付</UiButton></UiResult>
      </template>
      <template #table>
        <DataTable fill flat v-model:selected="picked" v-model:sort="sort" v-model:expanded="expanded" v-model:page="page" v-model:page-size="pageSize" :columns="columns" :rows="shown" row-key="id" selectable :total="shown.length">
          <template #search><FilterItem size="lg"><UiSearchInput v-model="search" placeholder="商品名 / SKU / 条码" /></FilterItem><FilterItem><UiSelect v-model="kind" :options="kinds" aria-label="价型" /></FilterItem></template>
          <template #toolbar><UiButton variant="primary" :disabled="!picked.length" @click="dialog = true">{{ picked.length ? `处理已选（${picked.length}）` : '处理已选' }}</UiButton></template>
          <template #cell-name="{ row }"><CellText :title="row.name">{{ row.store }}<UiTag tone="code">{{ row.sku }}</UiTag></CellText></template>
          <template #cell-act="{ row }"><div class="inline-flex flex-col items-end gap-0.5"><b class="font-medium">{{ row.act.toFixed(2) }}</b><UiTag tone="primary">{{ row.kind }}</UiTag></div></template>
          <template #cell-actions="{ row }"><Row justify="end" gap="md" nowrap><UiButton variant="link" @click="inspect(row)">详情</UiButton></Row></template>
          <template #expanded="{ row }"><DescriptionList :columns="2" :items="[{ label: '建议原因', value: '毛利率低于 30%' }, { label: '规则编号', value: 'R-03' }, { label: '同店排名', value: `第 ${Number(row.id) + 3} / 40` }, { label: '近 7 日均价', value: (row.act * 1.03).toFixed(2) + ' 元' }]" /></template>
        </DataTable>
      </template>
      <template #line><LineChart :series="series" :labels="days" :format="(v) => `${(v / 10000).toFixed(1)} 万`" /></template>
      <template #bars><BarChart :labels="['周一', '周二', '周三', '周四', '周五', '周六', '周日']" :series="[{ name: '本周', values: [132, 148, 141, 156, 170, 212, 198] }, { name: '上周', values: [120, 131, 138, 142, 151, 188, 176] }]" /></template>
      <template #donut><DonutChart :items="[{ label: '美团', value: 18420 }, { label: '淘宝', value: 12960 }, { label: '门店自提', value: 7310 }, { label: '其他', value: 2140 }]" unit=" 单" center-label="订单" /></template>
      <template #ranking><BarList :items="[{ label: '南岸门店', value: 94, text: '38.2 万' }, { label: '渝中门店', value: 71, text: '29.0 万' }, { label: '沙坪坝门店', value: 52, text: '21.4 万' }, { label: '北城门店', value: 33, text: '13.5 万' }]" /></template>
      <template #metrics><MetricStrip :items="[{ label: '实付金额', value: '1,284,630', unit: '元', delta: 12.4 }, { label: '有效订单量', value: '41,208', unit: '单', delta: 8.1 }, { label: '全渠道净利', value: '86,215', unit: '元', delta: -6.5 }, { label: '推广消耗', value: '13,904', unit: '元', delta: -31.2, goodWhenUp: false }]" /></template>
      <template #activity><ActivityFeed :items="activity" /></template>
      <template #description><DescriptionList :items="[{ label: '店铺', value: '南岸门店' }, { label: '近 7 日', key: 'trend' }]"><template #value-trend><Sparkline :values="[3, 5, 4, 6, 8, 7, 9]" /></template></DescriptionList></template>
      <template #timeline><Timeline :items="[{ title: '活动价 0.99', time: '今天 09:30' }, { title: '活动价 1.03', time: '08-07' }, { title: '原价 2.00', time: '08-01' }]" /></template>
      <template #conversation>
        <div class="flex min-h-0 flex-1 flex-col"><ChatThread :messages="chat" user-name="林知远" assistant-name="经营助手" /><PromptInput v-model="prompt" :busy="busy" @send="send" @stop="stop"><template #tools><UiTag>经营数据 · 九月</UiTag></template></PromptInput></div>
      </template>
      <template #markdown><Markdown :text="'# 项目接入说明\n\n' + mdSample" variant="document" /></template>
      <template #code><CodeBlock lang="bash" :code="codeSample" /></template>
      <template #usage><Stack><UsageMeter label="对话次数" :used="8240" :limit="10000" /><UsageMeter label="Token" :used="1.92" :limit="2" unit=" M" :format="(v) => v.toFixed(2)" /><UsageMeter label="知识库文档" :used="126" :limit="500" unit=" 篇" /></Stack></template>
      <template #recipes>
        <dl class="divide-y divide-line"><div v-for="[name, how] in recipes" :key="name" class="grid gap-2 py-5 first:pt-0 sm:grid-cols-[104px_1fr] sm:gap-6"><dt class="font-medium">{{ name }}</dt><dd class="text-fg-muted">{{ how }}</dd></div></dl>
        <p class="text-help text-fg-muted">完整规则与用法见 <UiTag tone="code">src/shared/ui/README.md</UiTag>。</p>
      </template>
    </GalleryStage>
    <UiDialog v-model:open="dialog" title="确认操作示例" description="此处演示确认与反馈的交互，确认后关闭弹窗，示例价格保持原值。">
      <template #footer><UiButton @click="dialog = false">取消</UiButton><UiButton variant="primary" @click="dialog = false; toast.success('演示确认完成')">确认</UiButton></template>
    </UiDialog>
    <UiDrawer v-model:open="drawer" :title="inspected.name">
      <DescriptionList :items="[{ label: 'SKU', value: inspected.sku }, { label: '门店', value: inspected.store }, { label: '原价', value: `${inspected.orig.toFixed(2)} 元` }, { label: '活动价', value: `${inspected.act.toFixed(2)} 元` }]" />
      <template #footer><UiButton @click="drawer = false">关闭</UiButton><UiButton variant="primary" @click="selectInspected">选中商品</UiButton></template>
    </UiDrawer>
  </PageFrame>
</template>
