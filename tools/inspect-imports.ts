import ts from "typescript";
import { dirname, resolve } from "node:path";
import type { BusinessModule } from "../src/shared/modules/definitions";

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

function importBoundaryProblems(
  spec: string,
  name: string,
  file: string,
  dir: string,
  module: BusinessModule,
): string[] {
  const errors: string[] = [];
  if (spec.startsWith("@/shared/")) {
    if (!["@/shared/public", "@/shared/ui/public"].includes(spec))
      errors.push(`${name}：不能导入共用内部文件 ${spec}`);
  } else if (spec.startsWith("@/modules/")) {
    const other = spec.split("/")[2];
    if (
      other !== module.name &&
      (!module.dependsOn.includes(other || "") || !spec.endsWith("/public"))
    )
      errors.push(`${name}：跨模块只能导入已声明依赖的 public`);
  } else if (spec.startsWith(".")) {
    const target = resolve(dirname(file), spec);
    if (!target.startsWith(dir + "/"))
      errors.push(`${name}：相对导入越过业务包范围`);
    else if (target.replace(/\.ts$/, "") === resolve(dir, "demo"))
      errors.push(
        `${name}：demo.ts 只给演示服务用，不能导入，否则演示数据会打进生产包`,
      );
  } else if (spec.startsWith("@/")) {
    errors.push(`${name}：业务包不能导入应用内部 ${spec}`);
  } else if (!["vue", "vue-router", "vitest"].includes(spec))
    errors.push(`${name}：业务包不能自行引入依赖 ${spec}`);
  return errors;
}

function importUsageProblems(spec: string, name: string): string[] {
  const errors: string[] = [];
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
    errors.push(`${name}：模块登记只能导入共用入口，业务代码必须按需加载`);
  return errors;
}

function isForbiddenEffect(node: ts.Node, name: string): node is ts.Identifier {
  return (
    ts.isIdentifier(node) &&
    forbidden.has(node.text) &&
    !(
      ts.isPropertyAccessExpression(node.parent) && node.parent.name === node
    ) &&
    !(ts.isPropertyAssignment(node.parent) && node.parent.name === node) &&
    !name.startsWith("tests/")
  );
}

function isAllowedDynamicImport(
  node: ts.CallExpression,
  name: string,
): boolean {
  const argument = node.arguments[0];
  return (
    name === "module.ts" &&
    !!argument &&
    ts.isStringLiteral(argument) &&
    /^\.\/(?:pages\/[a-zA-Z0-9_]+\.vue|flow|api)$/.test(argument.text)
  );
}

export function inspectScript(
  script: string,
  file: string,
  name: string,
  dir: string,
  module: BusinessModule,
): string[] {
  const errors: string[] = [];
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
      errors.push(
        ...importBoundaryProblems(spec, name, file, dir, module),
        ...importUsageProblems(spec, name),
      );
    }
    if (isForbiddenEffect(node, name))
      errors.push(`${name}：效果 ${node.text} 必须经过框架`);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      !isAllowedDynamicImport(node, name)
    )
      errors.push(`${name}：动态加载只在模块清单中声明`);
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return errors;
}
