# 界面系统

业务页面只从 `@/shared/ui/public` 取组件，不写颜色、字号、`style` 和局部样式。组件统一管理颜色和尺寸；页面是否清楚，还要根据用户任务安排内容。业务页必须通过单一任务的结构检查。

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
- 新增配色：在 `presets.ts` 加一项，再运行 `npx playwright test tests/browser/theme-contrast.spec.ts`。它检查每套配色在浅色、深色和三种侧栏下的普通文字、辅助文字与占位文字对比度，均至少 4.5:1，不达标就失败。

## 多级侧栏与页面表面

`AppShell` 的 `nav` 接受 `NavGroup[]`。每个 `NavItem` 可以有 `children`，目录可以只展开，也可以同时有 `to` 页面入口；可继续嵌套。当前页面自动展开全部祖先，链接与展开按钮分开操作，收起为图标后仍能重新打开目录。手机导航始终显示完整菜单，支持遮罩关闭、Esc 和键盘焦点返回。

业务菜单在 `module.ts` 的 `navigation` 声明，`page` 引用已登记的固定页面编号，`children` 声明下级目录。未配置时沿用模块入口。应用按页面权限隐藏不可访问入口，没有可访问页面的目录会一并隐藏。参数详情页不进入菜单。

```ts
navigation: [{
  label: "订单处理",
  children: [
    { label: "全部订单", page: "orders.list_page" },
    { label: "新建订单", page: "orders.create_page" },
  ],
}]
```

默认外观为墨黑浅色、轻侧栏和宽松间距。页面使用实色表面、细边框和清晰的文字层级，不加背景纹理、光照或逐行出现的动画。原来保存过的主题继续保留，偏好设置里的“恢复默认”可查看新的默认效果。

## 视觉与操作细节

正文和输入值保持 16px，导航与字段名称 14px，帮助 13px，标注最小 12px。紧凑模式控件 34px、数据行 44px；宽松模式控件 38px、数据行 48px。边框只划分内容，焦点和错误使用明确但较轻的颜色。

正文行高 24px，14px 名称与 13px 帮助使用 20px 行高。图文间距 8px、内容间距 16px、分组间距 24px；桌面边距 24px、手机 16px。相邻 `FormSection` 使用 `Stack gap="none"`，分隔线两侧的 24px 留白由区块提供，不重复叠加外层间距。

静态内容不逐项飞入，图表和关键数字立即呈现真实数据。保留表达读取、提交和展开状态的动效，并尊重减少动态效果设置。登录页使用实色品牌区，不用假表格、漂浮图形和渐变装饰。

动效统一为轻反馈 110ms、小位移 150ms、侧栏与抽屉 240ms，并区分入场与离场。减少动态效果时，持续动画只播放一次。文件拖入保留稳定高亮；点击选择、重复选择和键盘操作等效可用。处理中或结果未知时停用替换与移除。品牌色滑条保持 32px 操作高度，8px 轨道可直接点击。

设计依据和操作要求见项目 Skill `vue-ui/references/component-standards.md`，区分设计建议与 WCAG 的具体要求。

菜单、提示、弹窗和抽屉共用轻阴影。标签、头像与文件图标默认克制；颜色用于状态和确实需要区分的类别。墨黑深色模式使用亮色主要按钮，主要入口不会融入背景。

键盘操作与鼠标等效：分段选择支持方向键、Home 和 End；表格排序、分组折叠与行内展开支持 Enter 和空格；日期清除有独立按钮。日期范围在手机显示一个月，长代码和宽表只在自身区域滚动。手机列表保留工具条与分页，字段一起横向滚动，避免左右固定列盖住内容；分页显示当前页与总页数。

页面与公共样式的最终比较见项目 Skill `vue-ui/references/visual-review.md`。数据行以实际渲染高度检查，行内控件不会撑高所选疏密；类型和时间使用辅助层级。Markdown 文件预览按文档显示，文件类型用轮廓图标区分。上传页的工作区利用屏幕，文件选择区保持表单行宽与适当高度。

## 品牌与字体

- 产品名称、logo、标语、产品亮点、公司名、备案号、联系方式都在 `src/app/app.config.ts`。`BrandMark` 会按尺寸（sm、md、lg、xl）显示图片 logo，没有图片就用一个字做成圆角方块。浏览器标签页图标跟随品牌色自动生成。
- 字体：西文与数字用 Inter（随包提供，不依赖网络），中文用系统黑体。层级：展示 32、页面标题 24、区块标题 18、默认正文与输入控件 16、说明 13、标注 12；标题字重 600、字距略收；数字一律等宽（`tabular-nums`）。实际效果见设计预览中的配色与字体。
- 法律与标识：登录页和应用页脚显示版权、备案号、用户协议、隐私政策与版本。协议文本在 `src/app/legal.ts`，是结构骨架，不是法律意见；`legal.reviewed` 改为 true 之前，协议页顶部会显示提醒。

## 组件

基础控件带 `Ui` 前缀。

| 用途 | 组件 |
| --- | --- |
| 操作 | `UiButton`（primary、secondary、ghost、danger-quiet、danger、link 行内操作、text 表格里可点开的名称；`icon="download"` 加图标；整页最多一个 primary，独立确认弹层另算）、`UiMenu`、`UiPopconfirm`（影响小的就近确认）、`UiKbd` |
| 文本输入 | `UiInput`、`UiPasswordInput`（显示密码、大写提醒）、`UiSearchInput`、`UiTextarea`（随内容长高、字数） |
| 选择 | `UiSelect`（少于 10 项）、`UiCombobox`（可搜索、可多选）、`UiTagsInput`、`UiCheckbox`、`UiSwitch`（立即生效）、`UiRadioGroup`（含卡片样式）、`UiSegmented` |
| 数字与日期 | `UiNumberInput`（加减、上下限、单位）、`UiDatePicker`、`UiDateRangePicker`（含常用范围）、`UiFileDrop` |
| 表单版式 | `Field`（名称、提示、错误）、`FormSection`（设置类：左标题右控件） |
| 标记 | `UiTag`（状态 ok、warn、bad；编码 code）、`UiAvatar`、`UiAvatarGroup`、`UiFileIcon`、`UiTime`（“3 小时前”，悬停看完整时间）、`UiCopy` |
| 浮层 | `UiDialog`（短决定）、`UiDrawer`（从列表快速查看）、`useToast()`、`UiTip` |
| 状态与反馈 | `UiAlert`（提示条）、`UiResult`（结果页）、`UiProgress`、`UiSteps`、`UiSkeleton`、`UiEmpty`、`StatusMessage`（动作失败或结果未知）、`BatchProgress`（批量逐项结果，配合 `useBatch`） |
| 版式 | `PageFrame`（`back` 返回、`#icon`、`#actions`、`#tabs`、`#status`）、`Stack`、`Row`、`Grid`、`WorkArea`、`StatusLine`、`UiTabs`、`UiAccordion` |
| 数据 | `DataTable`（`fill flat` 占满主区）、`CellText`、`FilterBar`、`FilterItem`、`MetricStrip`、`DescriptionList`、`Timeline`、`ActivityFeed`、`FilePreview`、`SelectList` |
| 图表 | `LineChart`、`BarChart`、`DonutChart`、`BarList`、`Sparkline` |
| AI 应用 | `ChatThread`（对话）、`PromptInput`（回车发送、停止生成）、`Markdown`（不执行 HTML）、`CodeBlock`、`UsageMeter` |
| 外壳 | `AppShell`、`AuthLayout`、`BrandMark`、`AppFooter`、`TopProgress`、`CommandPalette`（⌘K）、`UserMenu`、`NotificationBell`（`notify()`）、`ThemePanel` |

批量操作用 `@/shared/public` 的 `useBatch`：按顺序逐个执行同一动作，明确失败继续，结果未知立即停止，任何一项都不自动重试。

完整的实际效果看开发时的「设计预览」页（`/dev/design`），点配色即时切换。

## 单一任务的页面规则

1. 在 `module.ts` 的页面登记中写 `task`，用一句话说明用户要完成什么。不能把互不相关的任务都叫“总览”。
2. 页面只有一个 `PageFrame workspace`。标题由它提供，主操作放 `#actions`，整页最多一个 `primary`。独立确认弹层另算。
3. 正文只有一个 `DataTable` 或 `WorkArea` 主区。业务页不能导入 `Card`，也不能在主区之前加说明段落或重复大标题。
4. `#status` 只接受 `StatusMessage` 或 `StatusLine`。它表达实际失败、未知结果或必要业务状态，不承载页面宣传和开发说明。
5. 低频信息按需展示：字段提示贴近字段，同一对象的补充信息用折叠区域，快速查看用抽屉；复杂处理用独立页。导航默认一到两层，需要更深时先说明实际用途。
6. 主工作区使用可用宽高。表格只有表体滚动，分页留在底部；表单限制文字行宽，避免把输入框无限拉长。公共入口不提供 `Card`；组件目录也逐项展示示例，不拼成多面板页面。

生成器直接生成上述结构。`npm run check`、开发保存和打包检查会阻止卡片导入（包括改名导入）、多个主区、正文前的说明段落、重复 h1 和多个主要按钮。它检查结构，不能代替人判断任务是否清楚。

| 页面 | 推荐结构 |
| --- | --- |
| 列表 | `PageFrame workspace` → `DataTable fill flat`；筛选放表格工具条，新增入口放页头 |
| 详情 | `PageFrame workspace` → `WorkArea fill`；围绕同一个对象，次要信息按需展开 |
| 表单 | `PageFrame workspace` → `WorkArea form fill` → 表单；保存入口放页头，字段说明留在字段附近 |
| 设置 | `PageFrame workspace` → 标签切换 → 一个 `WorkArea form fill` |
| 总览 | 先明确是比较数据、查看地图还是处理异常，再选择一个主视图；不默认堆指标、图表和卡片 |
| 登录 | `AuthLayout` → 登录字段 → 一个登录按钮 |

可直接查看文件管理的列表、详情、上传页，以及 `/settings`。开发者组件目录为了比较组件而集中展示，不是业务页面布局样板。

## 按钮图标与模块图标

业务页面不能自己导入图标库：按钮写 `<UiButton icon="download">`，可用名称见 `lib/icons.ts` 的 `actionIcons`；侧栏图标在 `module.ts` 写 `icon: "folder"`，可用名称见 `moduleIcons`。

## 表格怎么用

列用 `columns` 声明，特殊单元格用 `#cell-列名` 插槽。

- 数字列写 `kind: "number"`，自动右对齐、等宽数字；涨跌写 `kind: "delta"`，自动加 ▲▼ 和颜色。
- 表头单位写 `unit: "元"`，显示在列名下方的小字。
- 固定列写 `sticky: "left" | "right"` 并给出 `width`。
- 勾选 `selectable`，选中后底部出现批量操作条，按钮放 `#bulk` 插槽。
- 分组 `group-by`，分组标题按钮可点击、按 Enter 或空格折叠；行内展开 `#expanded` 插槽，会在首列提供展开按钮，并保留该列的左右或居中排版。未启用 `row-clickable` 时，非交互单元格也可双击展开；可导航行只用独立按钮展开，双击不同时展开内容。两类按钮报告展开状态，不会误触整行跳转。列设置与全屏默认带。
- 整行可点进入详情用 `row-clickable` 加 `@row-click`；行内按钮、链接点击不会触发整行。
- 分页写 `v-model:page`、`v-model:page-size`、`:total`、`:sizes`，底部显示“第 1–20 条，共 N 条”和每页条数；列表页把页码、条数、排序写进地址。
- 读取中用 `loading`（骨架行），没有数据用 `#empty` 或 `empty-title`，不要用空数组替换失败。

## 表单名称与文件预览

把一个控件放进 `Field`，名称、提示与错误会自动关联到真实输入框或触发按钮。`required` 与 `error` 同时传入控件的可访问状态；它们不代替业务校验。显式 `id`、`aria-label` 与 `aria-describedby` 仍然保留；额外描述会与字段提示合并。一个 Field 对应一个控件，多个字段分别使用各自的 Field。

`FilePreview` 只在 1 MiB 限制内预览文本，按文件声明大小与实际 Blob 大小共同检查；更大的文件保留下载入口。切换文件或离开页面会作废旧读取并释放预览地址。Markdown 不执行 HTML 或不安全链接协议，长文本的解析保持线性扫描。

## 新增组件前

先看已有组件能否表达这个任务。确需新增：放进 `base/`、`layout/` 或 `data/`，只用语义色，补进 `public.ts` 和上面的表，在「设计预览」页加一个例子，然后更新框架保护记录。
