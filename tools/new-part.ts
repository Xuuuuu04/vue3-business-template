/** 增加页面或步骤使用相同生成器登记，拒绝覆写已经存在的文件。 */
import ts from "typescript";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import {
  registry,
  saveRegistry,
  assertFramework,
  nameOf,
  titleOf,
} from "./scaffold";
const args = process.argv.slice(2);
const kind = args[0];
if (kind !== "page" && kind !== "step") throw new Error("只支持 page 或 step");
const module = nameOf(args[1]);
const name = nameOf(args[2]);
const title = titleOf(args, name);
assertFramework();
const data = registry();
const entry = data.modules[module];
if (!entry) throw new Error("开发包未由生成器登记");
const file = kind === "page" ? `pages/${name}.vue` : `steps/${name}.ts`;
const target = `src/modules/${module}/${file}`;
if (existsSync(target)) throw new Error("目标文件已存在");
function updateObject(
  text: string,
  call: string,
  property: string,
  item: string,
) {
  const source = ts.createSourceFile(
    "module.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  let found: ts.ArrayLiteralExpression | undefined;
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === call &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const value = node.arguments[0].properties
        .filter(ts.isPropertyAssignment)
        .find((p) => p.name.getText(source) === property)?.initializer;
      if (value && ts.isArrayLiteralExpression(value)) found = value;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error(`缺少 ${call}.${property} 数组`);
  const at = (found as ts.ArrayLiteralExpression).getEnd() - 1;
  const prefix = (found as ts.ArrayLiteralExpression).elements.length
    ? ","
    : "";
  return text.slice(0, at) + prefix + item + text.slice(at);
}
let definition = readFileSync(`src/modules/${module}/module.ts`, "utf8");
let flow: string | undefined;
if (kind === "page") {
  definition = updateObject(
    definition,
    "defineModule",
    "pages",
    `{id:'${module}.${name}',title:${JSON.stringify(title)},path:'/${module}/${name}',file:'${file}',actions:[],components:['PageFrame'],load:()=>import('./${file}')}`,
  );
} else {
  const ai = args.indexOf("--action");
  const action = ai >= 0 ? args[ai + 1] : undefined;
  if (!action)
    throw new Error(
      "新增步骤必须指定 --action 动作编号，以便主代理先确定所属动作",
    );
  flow = readFileSync(`src/modules/${module}/flow.ts`, "utf8");
  const source = ts.createSourceFile(
    "flow.ts",
    flow,
    ts.ScriptTarget.Latest,
    true,
  );
  let array: ts.ArrayLiteralExpression | undefined;
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "defineAction" &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const props = node.arguments[0].properties.filter(
        ts.isPropertyAssignment,
      );
      const id = props.find(
        (p) => p.name.getText(source) === "id",
      )?.initializer;
      if (id && ts.isStringLiteral(id) && id.text === action) {
        const steps = props.find(
          (p) => p.name.getText(source) === "steps",
        )?.initializer;
        if (steps && ts.isArrayLiteralExpression(steps)) array = steps;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!array) throw new Error(`未找到动作 ${action}`);
  const at = (array as ts.ArrayLiteralExpression).getEnd() - 1;
  flow =
    `import { ${name}Step } from './steps/${name}';\n` +
    flow.slice(0, at) +
    `,${name}Step` +
    flow.slice(at);
}
definition = updateObject(
  definition,
  "defineModule",
  "files",
  JSON.stringify(file),
);
const content =
  kind === "page"
    ? `<script setup lang="ts">\nimport { PageFrame } from '@/shared/ui/public';\n</script>\n<template><PageFrame title=${JSON.stringify(title)} description="页面结构已生成，请先写清使用者任务，再填写内容。" /></template>\n`
    : `/** 该步骤已加入指定动作，填入真实业务之前明确失败。 */\nimport { defineStep } from '@/shared/public';\nfunction execute${name}(){throw new Error('步骤 ${name} 尚未实现');}\nexport const ${name}Step=defineStep({id:'${module}.${name}',title:${JSON.stringify(title)},rule:'R-待确认',reads:[],writes:[],uses:[],run:execute${name}});\n`;
mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true });
writeFileSync(target, content);
writeFileSync(`src/modules/${module}/module.ts`, definition);
if (flow) writeFileSync(`src/modules/${module}/flow.ts`, flow);
entry.files.push(file);
saveRegistry(data);
console.log(`已生成并登记 ${target}。步骤骨架在实现前会明确失败。`);
