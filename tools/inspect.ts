/** 源码结构检查使用 TS 和 Vue 语法树，发现违规后拒绝启动与打包。 */
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import { baseParse, NodeTypes, type ElementNode } from "@vue/compiler-dom";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import type { BusinessModule } from "../src/shared/modules/definitions";
import { validateAction } from "../src/shared/actions/definitions";
import { filesBelow } from "./lib";
export interface Source {
  file: string;
  line: number;
  symbol: string;
}
export function sourceIndex(root = process.cwd()): Record<string, Source> {
  const index: Record<string, Source> = {};
  for (const file of filesBelow(resolve(root, "src")).filter((name) =>
    name.endsWith(".ts"),
  )) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const functions = new Map<string, ts.Node>();
    function scan(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name)
        functions.set(node.name.text, node);
      ts.forEachChild(node, scan);
    }
    scan(source);
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        ["defineStep", "defineCondition"].includes(
          node.expression.getText(source),
        ) &&
        node.arguments[0] &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        const properties = node.arguments[0].properties.filter(
          ts.isPropertyAssignment,
        );
        const id = properties.find(
          (p) => p.name.getText(source) === "id",
        )?.initializer;
        const handler = properties.find(
          (p) => p.name.getText(source) === "run",
        )?.initializer;
        if (id && ts.isStringLiteral(id) && handler) {
          const symbol = handler.getText(source);
          const actual = functions.get(symbol) || handler;
          if (index[id.text]) throw new Error(`步骤编号 ${id.text} 重复`);
          index[id.text] = {
            file: relative(root, file),
            line:
              source.getLineAndCharacterOfPosition(actual.getStart(source))
                .line + 1,
            symbol,
          };
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return index;
}
const forbidden = new Set([
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "axios",
  "setInterval",
  "setTimeout",
  "eval",
  "Function",
  "globalThis",
  "window",
  "document",
  "navigator",
]);
export function inspectModule(
  root: string,
  module: BusinessModule,
  index = sourceIndex(root),
): string[] {
  const errors: string[] = [];
  const dir = resolve(root, "src/modules", module.name);
  const actual = filesBelow(dir).map((file) => relative(dir, file));
  for (const file of actual)
    if (!module.files.includes(file))
      errors.push(`${module.name}/${file}：文件没有经过生成器登记`);
  for (const file of module.files)
    if (!existsSync(resolve(dir, file)))
      errors.push(`${module.name}/${file}：登记文件不存在`);
  for (const name of actual.filter((file) => /\.(ts|vue)$/.test(file))) {
    const file = resolve(dir, name);
    const text = readFileSync(file, "utf8");
    let scripts = [text];
    if (name.endsWith(".vue")) {
      const { descriptor, errors: parseErrors } = parse(text, {
        filename: file,
      });
      if (parseErrors.length) errors.push(`${name}：Vue 文件无法解析`);
      if (descriptor.styles.length)
        errors.push(`${name}：样式必须使用统一主题与公共布局`);
      scripts = [
        descriptor.script?.content || "",
        descriptor.scriptSetup?.content || "",
      ];
      if (descriptor.template) {
        const tree = baseParse(descriptor.template.content);
        const used = new Set<string>();
        function visitTemplate(node: typeof tree | ElementNode) {
          if (node.type === NodeTypes.ELEMENT) {
            if (/^[A-Z]/.test(node.tag) && node.tag !== "RouterLink")
              used.add(node.tag);
            for (const prop of node.props) {
              if (
                (prop.type === NodeTypes.ATTRIBUTE && prop.name === "style") ||
                (prop.type === NodeTypes.DIRECTIVE &&
                  prop.name === "bind" &&
                  prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
                  prop.arg.content === "style")
              )
                errors.push(`${name}：不能在页面内写样式`);
            }
          }
          for (const child of node.children) {
            if (child.type === NodeTypes.ELEMENT) visitTemplate(child);
          }
        }
        visitTemplate(tree);
        const page = module.pages.find((p) => p.file === name);
        if (page)
          for (const component of used)
            if (!page.components.includes(component))
              errors.push(`${name}：组件 ${component} 没有登记`);
      }
    }
    for (const script of scripts) {
      const source = ts.createSourceFile(
        file,
        script,
        ts.ScriptTarget.Latest,
        true,
      );
      function inspect(node: ts.Node) {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          if (spec.startsWith("@/shared/")) {
            if (!["@/shared/public", "@/shared/ui/public"].includes(spec))
              errors.push(`${name}：不能导入共用内部文件 ${spec}`);
          } else if (spec.startsWith("@/modules/")) {
            const other = spec.split("/")[2];
            if (
              other !== module.name &&
              (!module.dependsOn.includes(other || "") ||
                !spec.endsWith("/public"))
            )
              errors.push(`${name}：跨模块只能导入已声明依赖的 public`);
          } else if (spec.startsWith(".")) {
            const target = resolve(dirname(file), spec);
            if (!target.startsWith(dir + "/"))
              errors.push(`${name}：相对导入越过业务包范围`);
          } else if (spec.startsWith("@/")) {
            errors.push(`${name}：业务包不能导入应用内部 ${spec}`);
          } else if (
            !spec.startsWith("@/") &&
            !["vue", "vue-router", "vitest"].includes(spec)
          )
            errors.push(`${name}：业务包不能自行引入依赖 ${spec}`);
          if (
            spec === "vue" &&
            !name.startsWith("pages/") &&
            name !== "state.ts" &&
            !name.startsWith("tests/")
          )
            errors.push(`${name}：Vue 状态只允许在 state.ts 或页面中使用`);
          if (spec === "@/shared/ui/public" && !name.startsWith("pages/"))
            errors.push(`${name}：UI 组件只在页面中使用`);
          if (spec === "vue-router" && !name.startsWith("pages/"))
            errors.push(`${name}：路由操作只能在页面中`);
          if (name === "module.ts" && spec !== "@/shared/public")
            errors.push(
              `${name}：模块登记只能导入共用入口，业务代码必须按需加载`,
            );
        }
        if (
          ts.isIdentifier(node) &&
          forbidden.has(node.text) &&
          !(
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node
          ) &&
          !(
            ts.isPropertyAssignment(node.parent) && node.parent.name === node
          ) &&
          !name.startsWith("tests/")
        )
          errors.push(`${name}：效果 ${node.text} 必须经过框架`);
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          (name !== "module.ts" ||
            !node.arguments[0] ||
            !ts.isStringLiteral(node.arguments[0]) ||
            !/^\.\/(?:pages\/[a-zA-Z0-9_]+\.vue|flow|api)$/.test(
              node.arguments[0].text,
            ))
        )
          errors.push(`${name}：动态加载只在模块清单中声明`);
        ts.forEachChild(node, inspect);
      }
      inspect(source);
    }
  }
  const stepIds = new Set<string>();
  for (const action of module.actions) {
    try {
      validateAction(action);
    } catch (error) {
      errors.push(String(error));
    }
    for (const step of action.steps) {
      if (!step.rule) errors.push(`${step.id}：缺少业务规则编号`);
      if (!step.title || !step.id.startsWith(module.name + "."))
        errors.push(`${step.id}：缺少名称或模块前缀`);
      stepIds.add(step.id);
      for (const id of step.uses)
        if (!module.endpoints.some((e) => e.id === id))
          errors.push(`${step.id}：接口 ${id} 未登记`);
    }
  }
  for (const endpoint of module.endpoints)
    if (!endpoint.path.startsWith("/api/") || endpoint.path.includes("://"))
      errors.push(`${endpoint.id}：接口必须使用同源 /api/ 路径`);
  for (const page of module.pages)
    for (const id of page.actions)
      if (!module.actions.some((a) => a.id === id))
        errors.push(`${page.id}：动作 ${id} 未登记`);
  for (const name of actual.filter(
    (file) => file.startsWith("steps/") && file.endsWith(".ts"),
  )) {
    for (const [id, source] of Object.entries(index))
      if (
        source.file === `src/modules/${module.name}/${name}` &&
        !stepIds.has(id)
      )
        errors.push(`${id}：生成的步骤尚未加入动作`);
  }
  return [...new Set(errors)];
}
export function inspectProject(
  root: string,
  modules: BusinessModule[],
): string[] {
  const index = sourceIndex(root);
  const errors = modules.flatMap((m) => inspectModule(root, m, index));
  const registryPath = resolve(root, "scaffold.json");
  if (!existsSync(registryPath)) errors.push("缺少生成器登记表");
  else {
    const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
      modules: Record<string, { files: string[] }>;
    };
    for (const module of modules) {
      const entry = registry.modules[module.name];
      if (!entry) errors.push(`${module.name}：开发包没有由生成器创建`);
      else if (
        [...entry.files].sort().join("|") !== [...module.files].sort().join("|")
      )
        errors.push(`${module.name}：文件清单与生成器登记表不一致`);
    }
  }
  const registered = new Set(modules.map((m) => m.name));
  for (const file of filesBelow(resolve(root, "src/modules"))) {
    const name = relative(resolve(root, "src/modules"), file).split("/")[0];
    if (name && !registered.has(name))
      errors.push(`${name}：开发包未登记，不能运行`);
  }
  const routes = new Set<string>();
  const actionIds = new Set<string>();
  for (const module of modules) {
    for (const dependency of module.dependsOn)
      if (!registered.has(dependency))
        errors.push(`${module.name}：依赖 ${dependency} 未登记`);
    for (const page of module.pages) {
      if (routes.has(page.path)) errors.push(`页面路径 ${page.path} 重复`);
      routes.add(page.path);
    }
    for (const action of module.actions) {
      if (actionIds.has(action.id)) errors.push(`动作 ${action.id} 重复`);
      actionIds.add(action.id);
    }
  }
  function walk(name: string, seen: Set<string>) {
    if (seen.has(name)) {
      errors.push(`模块依赖成环：${[...seen, name].join(" → ")}`);
      return;
    }
    const next = new Set([...seen, name]);
    for (const dependency of modules.find((m) => m.name === name)?.dependsOn ||
      [])
      walk(dependency, next);
  }
  for (const name of registered) walk(name, new Set());
  return [...new Set(errors)];
}
