/** 页面结构检查：先有唯一任务，再允许一个主区和一个主要操作；不把卡片堆叠当布局。 */
import { NodeTypes, type ElementNode, type RootNode } from "@vue/compiler-dom";
import ts from "typescript";
import type { Page } from "../src/shared/modules/definitions";

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
