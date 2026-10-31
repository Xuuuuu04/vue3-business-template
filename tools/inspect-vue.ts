import { parse } from "@vue/compiler-sfc";
import { baseParse, NodeTypes, type ElementNode } from "@vue/compiler-dom";
import type { BusinessModule } from "../src/shared/modules/definitions";
import { inspectPageLayout } from "./page-layout";

function inspectTemplate(
  text: string,
  name: string,
  scripts: string[],
  module: BusinessModule,
): string[] {
  const errors: string[] = [];
  const tree = baseParse(text);
  const used = new Set<string>();
  function visit(node: typeof tree | ElementNode) {
    if (node.type === NodeTypes.ELEMENT) {
      if (/^[A-Z]/.test(node.tag) && node.tag !== "RouterLink")
        used.add(node.tag);
      for (const prop of node.props) {
        if (
          (prop.type === NodeTypes.ATTRIBUTE &&
            (prop.name === "style" || prop.name === "class")) ||
          (prop.type === NodeTypes.DIRECTIVE &&
            prop.name === "bind" &&
            prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
            (prop.arg.content === "style" || prop.arg.content === "class"))
        )
          errors.push(`${name}：不能在页面内写样式或类名，请使用公共版式组件`);
      }
    }
    for (const child of node.children)
      if (child.type === NodeTypes.ELEMENT) visit(child);
  }
  visit(tree);
  const page = module.pages.find((entry) => entry.file === name);
  if (page) {
    errors.push(
      ...inspectPageLayout(tree, scripts, page).map(
        (message) => `${name}：${message}`,
      ),
    );
    for (const component of used)
      if (!page.components.includes(component))
        errors.push(`${name}：组件 ${component} 没有登记`);
  }
  return errors;
}

export function inspectVueFile(
  text: string,
  file: string,
  name: string,
  module: BusinessModule,
): { scripts: string[]; errors: string[] } {
  const { descriptor, errors: parseErrors } = parse(text, { filename: file });
  const errors: string[] = [];
  if (parseErrors.length) errors.push(`${name}：Vue 文件无法解析`);
  if (descriptor.styles.length)
    errors.push(`${name}：样式必须使用统一主题与公共布局`);
  const scripts = [
    descriptor.script?.content || "",
    descriptor.scriptSetup?.content || "",
  ];
  if (descriptor.template)
    errors.push(
      ...inspectTemplate(descriptor.template.content, name, scripts, module),
    );
  return { scripts, errors };
}
