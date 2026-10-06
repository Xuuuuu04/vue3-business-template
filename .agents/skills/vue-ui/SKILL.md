---
name: vue-ui
description: 新建、调整或评审页面，选择配色与组件，拼列表页、详情页、表单页、总览页、登录页，或需要新增通用组件、新配色时使用。
---

# 界面系统

先读 `src/shared/ui/README.md`（组件清单、拼装规则、表格用法），再看开发时的「设计预览」页（`npm run dev` 后在侧栏左下角进入「开发者工具」，或访问 `/dev/design`），点配色即时切换。

## 业务页面的规矩

- 只从 `@/shared/ui/public` 取组件；用版式组件（`Stack`、`Row`、`Grid`、`Card`、`Field`）拼页面。
- 不写 `style`、`class`、`<style>`、颜色值。检查会拦下，需要新样式就改界面系统，不在页面里绕。
- 用到的组件名要登记进 `module.ts` 里该页面的 `components`。
- 页面标题下面不放说明小字。需要让人知道的事实（来源是否齐备、业务日、汇总数量）放进 `#status` 的 `StatusLine`。
- 每个区域最多一个 primary 按钮。页面上的删除入口用 `danger-quiet`，确认弹窗里最后一步才用 `danger`。
- 字号 14px 起，辅助文字不小于 12px，由组件保证，页面不改。

## 拼页面

| 页面 | 拼法 |
| --- | --- |
| 列表 | `PageFrame` → `StatusLine` → `FilterBar` → `DataTable`；快速查看用 `UiDrawer`，可分享的详情用独立页 |
| 详情 | `PageFrame`（操作放右上）→ `Card` → `DescriptionList`；相关记录用 `Timeline`、`DataTable` |
| 表单 | `PageFrame narrow` → `Card` → `Stack` → `Field` + 控件 → 提交按钮放 `Row justify="end"` |
| 总览 | `PageFrame` → `MetricStrip` → `Grid ratio="3:2"`（`LineChart`、`BarList`）→ `DataTable` |
| 登录 | `AuthLayout` → 标题 → `Field` + `UiInput size="lg"` → 主按钮 |

读取、空、失败、结果未知四种状态都要有表现：读取用 `loading`（表格骨架）；没有数据用 `UiEmpty` 或表格的空状态并给出下一步；失败和结果未知用 `StatusMessage`，补救按钮放在它的插槽里。筛选、分页、返回后的位置按 `vue-module` 的规则保持在 URL 里。

## 表格

列用 `columns` 声明，特殊单元格用 `#cell-列名`。数字列 `kind: "number"`，涨跌 `kind: "delta"`，单位写 `unit`，固定列写 `sticky` 和 `width`。需要批量操作加 `selectable` 并用 `#bulk`，分组用 `group-by`，行内展开用 `#expanded`。表格自带卡片、列设置、全屏和分页，不再外套 `Card`。

## 配色与主题

七套配色（石墨、暖砂、海盐、松林、绛红、墨黑、夜航），圆角、疏密、侧栏风格独立可选。产品默认主题在 `src/app/app.config.ts` 的 `theme` 里设置。不要照着某个现有业务的颜色定主题；按产品气质选，再让用户看实际页面确认。

新增配色：在 `theme/presets.ts` 加一项，运行 `npx playwright test tests/browser/theme-contrast.spec.ts`，它检查每套配色在浅色、深色与三种侧栏下的文字对比度。

## 新增通用组件

先看已有组件能否表达这个任务。确需新增：放进 `base/`、`layout/` 或 `data/`，只用语义色（`bg-surface`、`text-fg-muted`、`border-line`、`bg-primary` 等），在 `public.ts` 导出，补进 `README.md` 的表，在「设计预览」页加一个例子，再按 `vue-check` 更新框架保护记录。弹出层的触发器外面包 `UiTip` 是安全的（它不依赖定位库）；但 Reka UI 的触发器不要互相嵌套，否则定位会失效。

## 完成前

在真实浏览器里走一遍主要操作：键盘能进能出、窄屏不横向滚动、至少换两套配色和深色模式各看一遍。截图好看不等于业务可用，演示数据与未连接真实后台的部分要如实说明。
