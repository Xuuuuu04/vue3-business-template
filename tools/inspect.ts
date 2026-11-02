import { inspectScript } from "./inspect-imports";
import { inspectRuleLinks } from "./inspect-rules";
import { inspectVueFile } from "./inspect-vue";
import ts from "typescript";
import { endpointProblems } from "../src/shared/http/endpoint";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
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
function inspectModuleFiles(
  root: string,
  module: BusinessModule,
): { files: string[]; errors: string[] } {
  const errors: string[] = [];
  const dir = resolve(root, "src/modules", module.name);
  const files = filesBelow(dir).map((file) => relative(dir, file));
  for (const file of files)
    if (!module.files.includes(file))
      errors.push(`${module.name}/${file}：文件没有经过生成器登记`);
  for (const file of module.files)
    if (!existsSync(resolve(dir, file)))
      errors.push(`${module.name}/${file}：登记文件不存在`);
  for (const name of files.filter((file) => /\.(ts|vue)$/.test(file))) {
    const file = resolve(dir, name);
    const text = readFileSync(file, "utf8");
    const inspected = name.endsWith(".vue")
      ? inspectVueFile(text, file, name, module)
      : { scripts: [text], errors: [] };
    errors.push(...inspected.errors);
    for (const script of inspected.scripts)
      errors.push(...inspectScript(script, file, name, dir, module));
  }
  return { files, errors };
}

function inspectModuleActions(module: BusinessModule): {
  stepIds: Set<string>;
  errors: string[];
} {
  const errors: string[] = [];
  const stepIds = new Set<string>();
  for (const action of module.actions) {
    if (!action.permission?.trim())
      errors.push(`${action.id}：动作必须声明自身权限，公开操作写 public`);
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
        if (!module.endpoints.some((entry) => entry.id === id))
          errors.push(`${step.id}：接口 ${id} 未登记`);
    }
  }
  return { stepIds, errors };
}

export function inspectModule(
  root: string,
  module: BusinessModule,
  index = sourceIndex(root),
): string[] {
  const { files, errors } = inspectModuleFiles(root, module);
  const actions = inspectModuleActions(module);
  errors.push(...actions.errors, ...inspectRuleLinks(root, module));
  for (const endpoint of module.endpoints)
    errors.push(
      ...endpointProblems(endpoint).map(
        (problem) => `${endpoint.id}：${problem}`,
      ),
    );
  for (const page of module.pages)
    for (const id of page.actions)
      if (!module.actions.some((action) => action.id === id))
        errors.push(`${page.id}：动作 ${id} 未登记`);
  for (const name of files.filter(
    (file) => file.startsWith("steps/") && file.endsWith(".ts"),
  )) {
    for (const [id, source] of Object.entries(index))
      if (
        source.file === `src/modules/${module.name}/${name}` &&
        !actions.stepIds.has(id)
      )
        errors.push(`${id}：生成的步骤尚未加入动作`);
  }
  return [...new Set(errors)];
}
export function inspectProject(
  root: string,
  modules: BusinessModule[],
  index = sourceIndex(root),
): string[] {
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
