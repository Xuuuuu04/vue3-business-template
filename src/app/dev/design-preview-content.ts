export const tokens = [
  ["canvas", "页面底色"],
  ["surface", "卡片、表格"],
  ["muted", "悬停、分隔"],
  ["line", "边框"],
  ["fg", "正文"],
  ["fg-muted", "次要文字"],
  ["primary", "品牌色"],
  ["primary-soft", "品牌浅底"],
  ["ok", "成功"],
  ["warn", "待处理"],
  ["bad", "失败"],
  ["info", "提示"],
];
export const types = [
  [
    "展示标题",
    "32 / 600 / 字距 -1%",
    "text-[32px] leading-tight font-semibold tracking-tight",
    "每一步都看得见结果",
  ],
  [
    "页面标题",
    "24 / 600",
    "text-[24px] font-semibold tracking-tight",
    "客户管理 Customers 1,284,630",
  ],
  [
    "区块标题",
    "18 / 600",
    "text-[18px] leading-6 font-semibold",
    "团队文件与最近上传",
  ],
  [
    "正文",
    "16 / 400",
    "",
    "表格、表单与说明都使用这个大小，中文用系统黑体，数字与英文用 Inter。",
  ],
  [
    "辅助说明",
    "13 / 400",
    "text-help text-fg-muted",
    "次要信息、字段提示、时间",
  ],
  [
    "标注",
    "12 / 500",
    "text-xs font-medium text-fg-faint",
    "标签、页脚、快捷键",
  ],
  [
    "数字",
    "等宽数字",
    "text-[26px] font-semibold tracking-tight tabular-nums",
    "1,284,630.50",
  ],
];
export const recipes = [
  [
    "列表页",
    "PageFrame workspace → DataTable fill flat。一个列表占满主区，主要操作放右上，筛选放表格工具条。",
  ],
  [
    "详情页",
    "PageFrame workspace → WorkArea fill。围绕同一个对象展示，次要字段按需展开，主要操作只保留一个。",
  ],
  [
    "表单页",
    "PageFrame workspace → WorkArea form → 表单。说明贴近字段，保存入口放页头，不另做须知卡片。",
  ],
  [
    "设置页",
    "同一类设置使用一个主区；外观、账号、关于通过标签切换，不同时堆在首屏。",
  ],
  [
    "登录页",
    "AuthLayout → 字段 → 登录。只负责进入产品，品牌信息来自 app.config.ts。",
  ],
];

export const people = [
  { value: "lin", label: "林知远", hint: "运营" },
  { value: "zhou", label: "周晓", hint: "采购" },
  { value: "chen", label: "陈一鸣", hint: "财务" },
  { value: "wu", label: "吴越", hint: "商品" },
  { value: "he", label: "何静", hint: "门店" },
];

export const sample = [
  { key: "a", label: "2026 第三季度经营报告.pdf", status: "ok" },
  { key: "b", label: "客户名单.xlsx", status: "failed", error: "没有删除权限" },
  {
    key: "c",
    label: "品牌素材包.zip",
    status: "unknown",
    error: "网络中断，结果未确认",
  },
  { key: "d", label: "会议纪要.md", status: "skipped" },
];

export const mdSample =
  "**粗体**、`行内代码` 和 [链接](https://example.com)。\n\n- 列表第一项\n- 列表第二项\n\n> 引用的说明文字";
export const codeSample =
  "npm run new:module -- orders --title 订单管理\nnpm run docs\nnpm run check -- --module orders";
