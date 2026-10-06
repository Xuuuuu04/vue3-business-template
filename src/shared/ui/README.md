# 界面系统

业务页面只从 `@/shared/ui/public` 取组件，不写颜色、字号、`style` 和局部样式。同一套组件在任何配色下都协调，所以页面怎么拼都好看。

## 三层

| 层 | 在哪里 | 谁改 |
| --- | --- | --- |
| 主题输入 | `theme/presets.ts`、`theme/theme.ts` | 换产品气质时改 |
| 语义色与尺寸 | `theme/tokens.css` | 改色阶推导规则时改 |
| 组件 | `base/` 基础控件、`layout/` 版式、`data/` 数据展示 | 新增通用能力时改 |

组件只使用语义色（`bg-surface`、`text-fg-muted`、`border-line`、`bg-primary` 等）。组件里写 `#fff`、`oklch(...)` 或固定灰色，就是错的。

## 主题

七套配色：石墨、暖砂、海盐、松林、绛红、墨黑、夜航。每套只给出中性色色相与色度、品牌色色相、色度与亮度，其余色阶由 `tokens.css` 推出。

配色之外有三个独立开关：圆角（方正 / 适中 / 圆润）、疏密（紧凑 / 宽松）、侧栏（深色 / 浅色 / 品牌色）。也可以在主题面板里拖一个色相，作为自定义品牌色。

- 产品默认主题：`setDefaultTheme({ palette: "sand", sidebar: "dark" })`，在 `main.ts` 的 `initTheme()` 之前调用。
- 用户选择保存在浏览器，换设备不会跟随。
- 新增配色：在 `presets.ts` 加一项，再运行 `npx playwright test tests/browser/theme-contrast.spec.ts`。它检查每套配色在浅色、深色和三种侧栏下的文字对比度（正文 4.5:1，提示 3:1），不达标就失败。

## 品牌与字体

- 产品名称、logo、标语、产品亮点、公司名、备案号、联系方式都在 `src/app/app.config.ts`。`BrandMark` 会按尺寸（sm、md、lg、xl）显示图片 logo，没有图片就用一个字做成圆角方块。浏览器标签页图标跟随品牌色自动生成。
- 字体：西文与数字用 Inter（随包提供，不依赖网络），中文用系统黑体。层级：展示 32、页面标题 22、区块标题 15、正文 14、说明 13、标注 12；标题字重 600、字距略收；数字一律等宽（`tabular-nums`）。实际效果见「设计预览 → 配色与主题」。
- 法律与标识：登录页和应用页脚显示版权、备案号、用户协议、隐私政策与版本。协议文本在 `src/app/legal.ts`，是结构骨架，不是法律意见；`legal.reviewed` 改为 true 之前，协议页顶部会显示提醒。

## 组件

基础控件带 `Ui` 前缀。

| 用途 | 组件 |
| --- | --- |
| 操作 | `UiButton`（primary、secondary、ghost、danger-quiet、danger、link 行内操作、text 表格里可点开的名称；`icon="download"` 加图标；每个区域最多一个 primary）、`UiMenu`、`UiPopconfirm`（影响小的就近确认）、`UiKbd` |
| 文本输入 | `UiInput`、`UiPasswordInput`（显示密码、大写提醒）、`UiSearchInput`、`UiTextarea`（随内容长高、字数） |
| 选择 | `UiSelect`（少于 10 项）、`UiCombobox`（可搜索、可多选）、`UiTagsInput`、`UiCheckbox`、`UiSwitch`（立即生效）、`UiRadioGroup`（含卡片样式）、`UiSegmented` |
| 数字与日期 | `UiNumberInput`（加减、上下限、单位）、`UiDatePicker`、`UiDateRangePicker`（含常用范围）、`UiFileDrop` |
| 表单版式 | `Field`（名称、提示、错误）、`FormSection`（设置类：左标题右控件） |
| 标记 | `UiTag`（状态 ok、warn、bad；编码 code）、`UiAvatar`、`UiAvatarGroup`、`UiFileIcon`、`UiTime`（“3 小时前”，悬停看完整时间）、`UiCopy` |
| 浮层 | `UiDialog`（短决定）、`UiDrawer`（从列表快速查看）、`useToast()`、`UiTip` |
| 状态与反馈 | `UiAlert`（提示条）、`UiResult`（结果页）、`UiProgress`、`UiSteps`、`UiSkeleton`、`UiEmpty`、`StatusMessage`（动作失败或结果未知）、`BatchProgress`（批量逐项结果，配合 `useBatch`） |
| 版式 | `PageFrame`（`back` 返回、`#icon`、`#actions`、`#tabs`、`#status`）、`Stack`、`Row`、`Grid`、`Card`、`StatusLine`、`UiTabs`、`UiAccordion` |
| 数据 | `DataTable`、`CellText`、`FilterBar`、`FilterItem`、`MetricStrip`、`DescriptionList`、`Timeline`、`ActivityFeed`、`FilePreview`、`SelectList` |
| 图表 | `LineChart`、`BarChart`、`DonutChart`、`BarList`、`Sparkline` |
| AI 应用 | `ChatThread`（对话）、`PromptInput`（回车发送、停止生成）、`Markdown`（不执行 HTML）、`CodeBlock`、`UsageMeter` |
| 外壳 | `AppShell`、`AuthLayout`、`BrandMark`、`AppFooter`、`TopProgress`、`CommandPalette`（⌘K）、`UserMenu`、`NotificationBell`（`notify()`）、`ThemePanel` |

批量操作用 `@/shared/public` 的 `useBatch`：按顺序逐个执行同一动作，明确失败继续，结果未知立即停止，任何一项都不自动重试。

完整的实际效果看开发时的「设计预览」页（`/dev/design`），点配色即时切换。

## 拼装规则

页面按下面的顺序拼，间距由组件决定，页面不调整：

1. `PageFrame`：标题和主要操作。标题下面不放说明文字；需要让人知道的事实放进 `#status` 的 `StatusLine`（来源是否齐备、业务日、汇总数量）。
2. 同一对象的相关内容用 `#tabs` 的 `UiTabs`。
3. 内容用 `Stack` 竖排，横向并列用 `Grid`（等分或 3:2、2:1 比例）、`Row`（一排操作）。
4. 需要独立浏览的一组信息放 `Card`；表格自带卡片，不再套 `Card`。

常见页面：

| 页面 | 拼法 |
| --- | --- |
| 列表 | `PageFrame` → `StatusLine` → `FilterBar` → `DataTable`；详情用 `UiDrawer` 或独立页 |
| 详情 | `PageFrame back="上一级"`（标题左边放 `#icon`，操作放右上）→ `Grid ratio="2:1"`：左边主体（预览、内容），右边 `Card` + `DescriptionList`（编号、校验值配 `UiCopy`） |
| 表单 | `PageFrame narrow` → `Card` → `Stack` → `Field` + 控件 → 提交按钮放 `Row justify="end"` |
| 总览 | `PageFrame` → `MetricStrip` → `Grid ratio="3:2"`（`LineChart`、`BarList`）→ `DataTable` |
| 登录 | `AuthLayout` → 标题 → `Field` 与 `UiInput size="lg"` → 主按钮 |

## 按钮图标与模块图标

业务页面不能自己导入图标库：按钮写 `<UiButton icon="download">`，可用名称见 `lib/icons.ts` 的 `actionIcons`；侧栏图标在 `module.ts` 写 `icon: "folder"`，可用名称见 `moduleIcons`。

## 表格怎么用

列用 `columns` 声明，特殊单元格用 `#cell-列名` 插槽。

- 数字列写 `kind: "number"`，自动右对齐、等宽数字；涨跌写 `kind: "delta"`，自动加 ▲▼ 和颜色。
- 表头单位写 `unit: "元"`，显示在列名下方的小字。
- 固定列写 `sticky: "left" | "right"` 并给出 `width`。
- 勾选 `selectable`，选中后底部出现批量操作条，按钮放 `#bulk` 插槽。
- 分组 `group-by`，行内展开 `#expanded` 插槽，列设置与全屏默认带。
- 整行可点进入详情用 `row-clickable` 加 `@row-click`；行内按钮、链接点击不会触发整行。
- 分页写 `v-model:page`、`v-model:page-size`、`:total`、`:sizes`，底部显示“第 1–20 条，共 N 条”和每页条数；列表页把页码、条数、排序写进地址。
- 读取中用 `loading`（骨架行），没有数据用 `#empty` 或 `empty-title`，不要用空数组替换失败。

## 新增组件前

先看已有组件能否表达这个任务。确需新增：放进 `base/`、`layout/` 或 `data/`，只用语义色，补进 `public.ts` 和上面的表，在「设计预览」页加一个例子，然后更新框架保护记录。
