/** 增加页面或步骤使用相同生成器登记，拒绝覆写已经存在的文件。 */
import ts from "typescript";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import {
  registry,
  saveRegistry,
  assertFramework,
  htmlTitle,
  nameOf,
  titleOf,
} from "./scaffold";
const args = process.argv.slice(2);
const kind = args[0];
if (kind !== "page" && kind !== "step") throw new Error("只支持 page 或 step");
const module = nameOf(args[1]);
const name = nameOf(args[2]);
const pageLayouts = ["blank", "list", "form", "detail", "overview"] as const;
type PageLayout = (typeof pageLayouts)[number];
/** 页面所有带值参数在写入前检查，错拼或缺值不能成为页面内容。 */
function pageOptions() {
  const options = new Map<string, string>();
  for (let index = 3; index < args.length; index++) {
    const token = args[index]!;
    const equal = token.indexOf("=");
    const option = equal < 0 ? token : token.slice(0, equal);
    if (!["--title", "--layout", "--task"].includes(option))
      throw new Error(
        `未知页面参数 ${option}；只支持 --title、--layout、--task`,
      );
    if (options.has(option)) throw new Error(`${option} 只能指定一次`);
    const value = (equal < 0 ? args[++index] : token.slice(equal + 1))?.trim();
    if (!value || value.startsWith("--"))
      throw new Error(`${option} 必须填写参数值，不能使用另一个选项作为值`);
    options.set(option, value);
  }
  return options;
}
const options = kind === "page" ? pageOptions() : undefined;
const title = options?.get("--title") ?? titleOf(args, name);
const layoutOption = options?.get("--layout") ?? "blank";
if (!pageLayouts.includes(layoutOption as PageLayout))
  throw new Error(
    `未知页面布局 ${layoutOption}；可用值：${pageLayouts.join("、")}`,
  );
const layout = layoutOption as PageLayout;
const task = options?.get("--task") ?? "填写此页唯一的用户任务";
if (/[\r\n\u0000]/.test(task))
  throw new Error("--task 请用一句话说明此页唯一的用户任务");

/** 只给展示结构，不生成虚假数据、请求或保存动作。 */
function pageSource() {
  const frameTitle = htmlTitle(title);
  const empty = (heading: string, hint: string) =>
    `<UiEmpty title="${heading}" hint="${hint}" />`;
  const starters = {
    blank: {
      components: ["PageFrame", "WorkArea", "UiEmpty"],
      script: "",
      body: `<WorkArea>${empty("页面尚未实现", "请按页面任务填写真实业务内容。")}</WorkArea>`,
    },
    list: {
      components: ["PageFrame", "DataTable"],
      script: `import type { DataColumn } from '@/shared/ui/public';
/** 按业务规则替换行类型与列；接入查询前不填入模拟记录。 */
interface ListRow { id: string; name: string }
const rows: ListRow[] = [];
const columns: DataColumn[] = [{ key: 'name', title: '名称', minWidth: 240 }];`,
      body: `<DataTable fill flat row-key="id" :rows="rows" :columns="columns" :settings="false" :fullscreenable="false" empty-title="列表尚未接入数据" empty-hint="请先声明查询动作，再根据真实结果、加载和失败状态显示列表。" />`,
    },
    form: {
      components: [
        "PageFrame",
        "WorkArea",
        "Stack",
        "Field",
        "FormSection",
        "UiInput",
        "UiEmpty",
      ],
      script: `import { ref } from 'vue';
/** 仅为表单结构的本地样板；字段和保存规则确定后替换。 */
const draft = ref('');`,
      body: `<WorkArea form fill>
      <form id="${module}-${name}-form" @submit.prevent>
        <Stack>
          <FormSection title="基本信息">
          <Field label="样板字段" for="${module}-${name}-input" hint="请按已确认规则替换字段、校验与输入状态。">
            <UiInput id="${module}-${name}-input" v-model="draft" placeholder="字段尚未实现" disabled />
          </Field>
          </FormSection>
          ${empty("表单尚未接入保存", "声明真实提交动作后，再添加保存入口和结果提示。")}
        </Stack>
      </form>
    </WorkArea>`,
    },
    overview: {
      components: ["PageFrame", "OverviewBoard", "Panel", "LineChart", "ActionList"],
      script: `/** 按 doc/ui-recipes.md 的总览配方替换：先确定本页最重要的一个问题，再声明查询动作。 */
const labels: string[] = [];
const values: number[] = [];
const todos: { label: string; count: number; to: string; tone?: 'bad' | 'warn' }[] = [];`,
      body: `<OverviewBoard>
      <Panel title="重点趋势" focus :empty="!values.length" empty-title="重点指标尚未接入">
        <LineChart :labels="labels" :series="[{ name: '数量', values }]" />
      </Panel>
      <Panel title="待处理" flush>
        <ActionList :items="todos" />
      </Panel>
    </OverviewBoard>`,
    },
    detail: {
      components: ["PageFrame", "WorkArea", "UiEmpty"],
      script: "",
      body: `<WorkArea fill>${empty("详情尚未接入对象", "请根据对象编号声明查询动作，并区分加载、失败和对象不存在。")}</WorkArea>`,
    },
  };
  const starter = starters[layout];
  return {
    components: starter.components,
    content: `<script setup lang="ts">
import { ${starter.components.join(", ")} } from '@/shared/ui/public';
${starter.script ? `${starter.script}\n` : ""}</script>
<template>
  <PageFrame title="${frameTitle}" workspace>
    ${starter.body}
  </PageFrame>
</template>
`,
  };
}
const page = kind === "page" ? pageSource() : undefined;
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
  return appendItem(text, found, item);
}
/** 空数组或已有结尾逗号时不再补逗号，否则会写出 [,item] 这样的空位。 */
function appendItem(
  text: string,
  array: ts.ArrayLiteralExpression,
  item: string,
) {
  const at = array.getEnd() - 1;
  const prefix =
    array.elements.length && !array.elements.hasTrailingComma ? "," : "";
  return text.slice(0, at) + prefix + item + text.slice(at);
}
/** import 放在已有 import 之后；没有 import 时放在文件头注释之后。 */
function addImport(text: string, line: string) {
  const source = ts.createSourceFile(
    "flow.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = source.statements.filter(ts.isImportDeclaration);
  const last = imports[imports.length - 1];
  const at = last
    ? last.getEnd()
    : (ts.getLeadingCommentRanges(text, 0) ?? []).reduce(
        (end, range) => Math.max(end, range.end),
        0,
      );
  const before = text.slice(0, at);
  const after = text.slice(at).replace(/^\r?\n/, "");
  return `${before}${before && !before.endsWith("\n") ? "\n" : ""}${line}\n${after}`;
}
let definition = readFileSync(`src/modules/${module}/module.ts`, "utf8");
let flow: string | undefined;
if (kind === "page") {
  definition = updateObject(
    definition,
    "defineModule",
    "pages",
    `{id:'${module}.${name}',task:${JSON.stringify(task)},title:${JSON.stringify(title)},path:'/${module}/${name}',file:'${file}',actions:[],components:${JSON.stringify(page!.components)},load:()=>import('./${file}')}`,
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
  flow = addImport(
    appendItem(flow, array, `${name}Step`),
    `import { ${name}Step } from './steps/${name}';`,
  );
}
definition = updateObject(
  definition,
  "defineModule",
  "files",
  JSON.stringify(file),
);
const content =
  kind === "page"
    ? page!.content
    : `/** 该步骤已加入指定动作，填入真实业务之前明确失败。 */\nimport { defineStep } from '@/shared/public';\nfunction execute${name}(){throw new Error('步骤 ${name} 尚未实现');}\nexport const ${name}Step=defineStep({id:'${module}.${name}',title:${JSON.stringify(title)},rule:'R-待确认',reads:[],writes:[],uses:[],run:execute${name}});\n`;
mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true });
writeFileSync(target, content);
writeFileSync(`src/modules/${module}/module.ts`, definition);
if (flow) writeFileSync(`src/modules/${module}/flow.ts`, flow);
entry.files.push(file);
saveRegistry(data);
console.log(
  kind === "page"
    ? `已生成并登记 ${target}（${layout} 布局）。请填写真实业务规则与动作；样板尚未实现业务操作。`
    : `已生成并登记 ${target}。步骤骨架在实现前会明确失败。`,
);
