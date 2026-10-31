import type { GalleryExample } from "./GalleryStage.vue";

export const examples: Record<string, GalleryExample[]> = {
  theme: [
    { value: "palettes", label: "产品配色", components: "useTheme" },
    { value: "tokens", label: "语义颜色", components: "theme/tokens.css" },
    {
      value: "typography",
      label: "字体与层级",
      components: "Inter · 系统黑体",
    },
  ],
  forms: [
    {
      value: "inputs",
      label: "文本输入",
      components: "UiInput · UiTextarea",
      form: true,
    },
    {
      value: "choices",
      label: "下拉与多选",
      components: "UiSelect · UiCombobox",
      form: true,
    },
    {
      value: "dates",
      label: "数字与日期",
      components: "UiNumberInput · UiDatePicker",
      form: true,
    },
    {
      value: "toggles",
      label: "开关与分段",
      components: "UiSwitch · UiSegmented",
      form: true,
    },
    { value: "plans", label: "方案选择", components: "UiRadioGroup" },
    {
      value: "form-sections",
      label: "设置表单",
      components: "FormSection",
      form: true,
    },
    {
      value: "upload",
      label: "文件选择",
      components: "UiFileDrop",
      form: true,
    },
  ],
  feedback: [
    { value: "buttons", label: "按钮", components: "UiButton", form: true },
    {
      value: "tags",
      label: "标签与图标",
      components: "UiTag · UiAvatar · UiFileIcon",
      form: true,
    },
    { value: "alerts", label: "就近提示", components: "UiAlert", form: true },
    {
      value: "overlays",
      label: "弹层与确认",
      components: "UiDialog · UiDrawer",
      form: true,
    },
    {
      value: "progress",
      label: "进度与用量",
      components: "UiProgress · UsageMeter",
      form: true,
    },
    { value: "steps", label: "步骤条", components: "UiSteps" },
    {
      value: "batch",
      label: "逐项执行结果",
      components: "BatchProgress",
      form: true,
    },
    {
      value: "states",
      label: "读取状态",
      components: "UiSkeleton · UiEmpty",
      form: true,
    },
    {
      value: "accordion",
      label: "按需展开",
      components: "UiAccordion",
      form: true,
    },
    { value: "result", label: "操作结果", components: "UiResult", form: true },
  ],
  data: [
    { value: "table", label: "数据表格", components: "DataTable" },
    {
      value: "table-states",
      label: "查询状态",
      components: "DataTable · UiSegmented",
    },
    { value: "line", label: "趋势图", components: "LineChart" },
    { value: "bars", label: "柱状图", components: "BarChart" },
    { value: "donut", label: "构成比例", components: "DonutChart", form: true },
    { value: "ranking", label: "排名", components: "BarList", form: true },
    { value: "metrics", label: "关键数字", components: "MetricStrip" },
    {
      value: "activity",
      label: "动态记录",
      components: "ActivityFeed",
      form: true,
    },
    {
      value: "description",
      label: "对象信息",
      components: "DescriptionList · Sparkline",
      form: true,
    },
    { value: "timeline", label: "时间线", components: "Timeline", form: true },
  ],
  ai: [
    {
      value: "conversation",
      label: "对话",
      components: "ChatThread · PromptInput",
    },
    {
      value: "markdown",
      label: "文档排版",
      components: "Markdown",
      form: true,
    },
    { value: "code", label: "代码块", components: "CodeBlock" },
    { value: "usage", label: "使用情况", components: "UsageMeter", form: true },
  ],
  pages: [
    { value: "recipes", label: "页面结构", components: "PageFrame · WorkArea" },
  ],
};
