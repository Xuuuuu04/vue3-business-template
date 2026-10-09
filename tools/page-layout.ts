/** 页面结构检查：先有唯一任务，再允许一个主区和一个主要操作；不把卡片堆叠当布局。 */
import { NodeTypes, type ElementNode, type RootNode } from "@vue/compiler-dom";
import ts from "typescript";
import type { Page } from "../src/shared/modules/definitions";

/** 总览面板里允许的展示组件：每个 Panel 只放其中一个。 */
const PANEL_CONTENT = ["LineChart", "BarChart", "BarList", "DonutChart", "DataTable", "ActionList", "StatList", "ActivityFeed", "Timeline", "TraceWaterfall"];
const FOCUS_CONTENT = ["LineChart", "BarChart", "BarList", "DonutChart", "DataTable"];
/** 原生表单控件与对应的公共组件。 */
const NATIVE_CONTROLS: Record<string, string> = {
  input: "UiInput、UiSearchInput、UiNumberInput、UiDatePicker、UiDateRangePicker、UiCheckbox 或 UiSwitch",
  select: "UiSelect 或 UiCombobox",
  textarea: "UiTextarea",
  button: "UiButton",
};
const FILTER_CONTROLS = ["UiSelect", "UiCombobox", "UiSearchInput", "UiDatePicker", "UiDateRangePicker", "UiSegmented"];

export function inspectPageLayout(
  tree: RootNode,
  scripts: string[],
  page: Page,
): string[] {
  const errors: string[] = [];
  const names = new Map<string, string>();
  for (const text of scripts) {
    const source = ts.createSourceFile(
      "page.ts",
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of source.statements) {
      if (
        !ts.isImportDeclaration(node) ||
        !ts.isStringLiteral(node.moduleSpecifier) ||
        node.moduleSpecifier.text !== "@/shared/ui/public"
      )
        continue;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings))
        errors.push("公共 UI 必须具名导入，不能用命名空间绕过页面布局检查");
      if (bindings && ts.isNamedImports(bindings))
        for (const imported of bindings.elements) {
          const name = (imported.propertyName ?? imported.name).text;
          names.set(imported.name.text, name);
          if (name === "Card")
            errors.push(
              "业务页面不能导入 Card；请按单一任务使用 WorkArea 或 DataTable",
            );
        }
    }
  }
  const tag = (node: ElementNode) => names.get(node.tag) ?? node.tag;
  const elements = (node: RootNode | ElementNode) =>
    node.children.filter(
      (child): child is ElementNode => child.type === NodeTypes.ELEMENT,
    );
  const attr = (node: ElementNode, name: string) =>
    node.props.find((p) => p.type === NodeTypes.ATTRIBUTE && p.name === name);
  const slot = (node: ElementNode) =>
    node.props.find((p) => p.type === NodeTypes.DIRECTIVE && p.name === "slot");
  const slotName = (node: ElementNode) => {
    const declared = slot(node);
    return declared?.type === NodeTypes.DIRECTIVE && declared.arg?.type === NodeTypes.SIMPLE_EXPRESSION ? declared.arg.content : undefined;
  };
  const roots = elements(tree);
  if (roots.length !== 1 || tag(roots[0]!) !== "PageFrame")
    return ["业务页必须只有一个 PageFrame 入口"];
  const frame = roots[0]!;
  if (!page.task?.trim())
    errors.push("页面登记必须写 task，说明此页唯一的主要任务");
  if (!attr(frame, "workspace"))
    errors.push("业务页使用 PageFrame workspace，让主区占满可用空间");
  const bodies = elements(frame).filter(
    (child) => !slot(child) && !["UiDialog", "UiDrawer"].includes(tag(child)),
  );
  if (
    bodies.length !== 1 ||
    !["WorkArea", "DataTable", "OverviewBoard"].includes(tag(bodies[0]!))
  )
    errors.push(
      "页面必须只有一个 WorkArea、DataTable 或 OverviewBoard 主区；禁止在标题下堆说明段落、卡片或独立面板",
    );
  const board = bodies.length === 1 && tag(bodies[0]!) === "OverviewBoard" ? bodies[0]! : undefined;
  if (board) {
    const panels = elements(board);
    if (elements(frame).some((c) => slotName(c) === "tabs"))
      errors.push("总览不分标签页：每个视角各占一个 Panel，用户一眼看全");
    const titles = new Set<string>();
    for (const panel of panels.filter((p) => tag(p) === "Panel")) {
      const title = attr(panel, "title");
      const label = title?.type === NodeTypes.ATTRIBUTE ? title.value?.content ?? "" : "";
      if (!label)
        errors.push("Panel 的 title 写成固定文字，说明这一块回答什么问题，不随状态切换");
      else if (titles.has(label)) errors.push(`Panel 标题“${label}”重复`);
      else titles.add(label);
      if (panel.children.some((c) => c.type === NodeTypes.TEXT && c.content.trim()) || panel.children.some((c) => c.type === NodeTypes.INTERPOLATION))
        errors.push(`Panel“${label}”里不能直接写文字；没有数据用 Panel 的 empty 与 empty-title`);
      const inner = elements(panel).filter((c) => slotName(c) !== "actions");
      if (inner.length > 1)
        errors.push(`Panel“${label}”只放一个展示组件；读取中和无数据用 Panel 的 loading、empty，不用 v-if/v-else 拼占位`);
      for (const child of inner)
        if (!PANEL_CONTENT.includes(tag(child)))
          errors.push(`Panel“${label}”里不能放 ${tag(child)}；只能放 ${PANEL_CONTENT.join("、")} 之一。筛选放 PageFrame 的 #filters，说明文字删掉`);
      if (attr(panel, "focus") && inner[0] && !FOCUS_CONTENT.includes(tag(inner[0])))
        errors.push(`focus 面板要放趋势、分布或排名（${FOCUS_CONTENT.join("、")}），不能放 ${tag(inner[0])}`);
    }
    if (panels.some((p) => tag(p) !== "Panel"))
      errors.push("OverviewBoard 里只能直接放 Panel，每块回答一个问题");
    if (panels.length < 2 || panels.length > 6)
      errors.push("总览放 2–6 个 Panel；更多内容拆到对应列表或详情页");
    const focus = panels.filter((p) => p.props.some((x) => (x.type === NodeTypes.ATTRIBUTE && x.name === "focus")));
    if (focus.length !== 1)
      errors.push("总览必须且只能有一个 focus 面板，放本页最重要的趋势、地图或对比");
    else if (panels[0] !== focus[0])
      errors.push("focus 面板放在 OverviewBoard 第一个，用户先看到最重要的内容");
  }
  for (const filters of elements(frame).filter((c) => slotName(c) === "filters")) {
    const bars = elements(filters);
    if (bars.length !== 1 || tag(bars[0]!) !== "FilterBar")
      errors.push("#filters 里只放一个 FilterBar");
    for (const control of bars[0] ? elements(bars[0]) : [])
      if (!FILTER_CONTROLS.includes(tag(control)))
        errors.push(`FilterBar 里只放筛选控件（${FILTER_CONTROLS.join("、")}），不能放 ${tag(control)}；控件用 aria-label 或占位文字说明，不套 Field`);
  }
  for (const child of elements(frame)) {
    const declared = slot(child);
    if (
      declared?.type === NodeTypes.DIRECTIVE &&
      declared.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
      declared.arg.content === "status"
    )
      if (
        elements(child).some(
          (status) => !["StatusMessage", "StatusLine"].includes(tag(status)),
        )
      )
        errors.push(
          "status 只展示 StatusMessage 或 StatusLine 状态，不放标题说明段落",
        );
  }
  let primary = 0;
  function visit(node: ElementNode) {
    if (["UiDialog", "UiDrawer"].includes(tag(node))) return;
    if (NATIVE_CONTROLS[node.tag])
      errors.push(`业务页不能直接写原生 <${node.tag}>：改用 ${NATIVE_CONTROLS[node.tag]}；原生控件不跟主题、不统一日期格式，也不接字段错误`);
    if (node.tag === "h1")
      errors.push("业务页标题由 PageFrame 提供，正文不能重复 h1");
    if (tag(node) === "Card") errors.push("业务页不能用 Card 拼接多个内容区");
    if (tag(node) === "Panel" && !board?.children.includes(node))
      errors.push("Panel 只能作为 OverviewBoard 的直接子项");
    const variant = attr(node, "variant");
    if (
      tag(node) === "UiButton" &&
      variant?.type === NodeTypes.ATTRIBUTE &&
      variant.value?.content === "primary"
    )
      primary++;
    const dynamicVariant = node.props.find(
      (p) =>
        p.type === NodeTypes.DIRECTIVE &&
        p.name === "bind" &&
        p.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        p.arg.content === "variant",
    );
    if (tag(node) === "UiButton" && dynamicVariant)
      errors.push(
        "主要按钮使用明确的 variant，不能通过动态样式绕过单一主要操作检查",
      );
    for (const child of elements(node)) visit(child);
  }
  visit(frame);
  if (primary > 1)
    errors.push(
      "一个页面只能有一个 primary 主要操作；辅助操作使用 secondary、ghost 或 link",
    );
  return errors;
}
