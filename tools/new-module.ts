import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  htmlTitle,
  formatSource,
  nameOf,
  registry,
  saveRegistry,
  assertFramework,
} from "./scaffold";
import { parseArgs } from "./lib";
const args = parseArgs("用法：npm run new:module -- 包名 [--title 中文名]", {
  options: ["--title"],
  positionals: 1,
});
const name = nameOf(args.positionals[0]);
const title = args.options.get("--title") ?? name;
const dir = resolve("src/modules", name);
assertFramework();
if (existsSync(dir) || registry().modules[name])
  throw new Error(`开发包 ${name} 已存在`);
const catalog = readFileSync("src/app/catalog.ts", "utf8");
if (!/export const modules:\s*Module\[\]\s*=\s*\[/.test(catalog))
  throw new Error("catalog.ts 格式改变，请先恢复生成器可维护的模块数组");
if (existsSync(`doc/${name}`))
  throw new Error("对应业务说明目录已经存在，请先确定用途");
const files: Record<string, string> = {
  "README.md": `# ${title}\n\n固定入口是 module.ts。业务规则见 doc/${name}/rules.md；计算见 flow.ts 与 steps/，页面只能调用 state.ts 中的动作。\n\n生成的是结构样板。请先确定真实业务规则，再填写输入、输出和步骤。\n`,
  "data.ts": `import { z } from '@/shared/public';\nexport const Input=z.object({value:z.string()}).strict();\nexport type Work=z.infer<typeof Input>&{result:string};\n`,
  "api.ts": `import type { Endpoint } from '@/shared/public';\nexport const endpoints:Endpoint[]=[];\n`,
  "demo.ts": `import { defineDemo } from '@/shared/public';\nexport default defineDemo({});\n`,
  "steps/prepare.ts": `import { defineStep } from '@/shared/public';\nimport type { Work } from '../data';\nfunction prepare(data:Work){data.result=data.value;}\nexport const prepareStep=defineStep<Work>({id:'${name}.prepare',title:'接收样板输入',rule:'R-00',reads:['value'],writes:['result'],uses:[],run:prepare});\n`,
  "flow.ts": `import { z,defineAction } from '@/shared/public';\nimport { Input } from './data';\nimport { prepareStep } from './steps/prepare';\nexport const prepare=defineAction<z.infer<typeof Input>,string>({id:'${name}.prepare',title:'验证开发包结构',permission:'${name}.run',input:Input,inputFields:['value'],result:'result',fields:{value:{title:'样板输入',schema:z.string()},result:{title:'样板输出',schema:z.string()}},steps:[prepareStep]});\nexport const actions=[prepare];\n`,
  "state.ts": `import { onBeforeUnmount } from 'vue';\nimport { createTask } from '@/shared/public';\nimport { prepare } from './flow';\nimport { endpoints } from './api';\nexport function use${name.replace(/(^|_)([a-z])/g, (_, _a, b) => b.toUpperCase())}(){const task=createTask(prepare,endpoints,'submit');onBeforeUnmount(task.dispose);return task;}\n`,
  "public.ts": `export { use${name.replace(/(^|_)([a-z])/g, (_, _a, b) => b.toUpperCase())} } from './state';\n`,
  "pages/MainPage.vue": `<script setup lang="ts">\nimport { ref } from 'vue';\nimport { PageFrame,WorkArea,Stack,Field,StatusMessage,UiInput,UiButton } from '@/shared/ui/public';\nimport { use${name.replace(/(^|_)([a-z])/g, (_, _a, b) => b.toUpperCase())} } from '../public';\nconst draft=ref('');const task=use${name.replace(/(^|_)([a-z])/g, (_, _a, b) => b.toUpperCase())}();const state=task.state;\n</script>\n<template><PageFrame title="${htmlTitle(title)}" workspace><template #actions><UiButton type="submit" form="${name}-form" variant="primary" :loading="state.status==='loading'" :disabled="state.status==='unknown'">验证输入输出</UiButton></template><WorkArea form><form id="${name}-form" @submit.prevent="task.run({value:draft})"><Stack><Field label="样板输入" for="sample-input" :error="state.fieldErrors?.value" hint="这是生成的结构样板，业务规则确定后填写真实操作。"><UiInput id="sample-input" v-model="draft" :disabled="state.status==='loading'||state.status==='unknown'" /></Field><p v-if="state.status==='success'">结果：{{state.data}}</p></Stack></form></WorkArea><template #status><StatusMessage :status="state.status" :error="state.error" /></template></PageFrame></template>\n`,
  "tests/behavior.test.ts": `import { expect,test } from 'vitest';\nimport { createTask } from '@/shared/public';\nimport { prepare } from '../flow';\nimport { endpoints } from '../api';\ntest('R-00：生成的开发包能够按声明传递输入输出',async()=>{const task=createTask(prepare,endpoints,'submit');expect(await task.run({value:'结构样板'})).toBe('结构样板');expect(task.state.value.status).toBe('success');});\n`,
};
files["module.ts"] =
  `import { defineModule } from '@/shared/public';\nexport default defineModule({name:'${name}',title:${JSON.stringify(title)},description:'待填写真实业务',dependsOn:[],files:${JSON.stringify([...Object.keys(files), "module.ts"])},load:async()=>{const [{actions},{endpoints}]=await Promise.all([import('./flow'),import('./api')]);return {actions,endpoints};},pages:[{id:'${name}.main',task:'填写此页唯一的用户任务',title:${JSON.stringify(title)},path:'/${name}',file:'pages/MainPage.vue',actions:['${name}.prepare'],components:['PageFrame','WorkArea','Stack','Field','StatusMessage','UiInput','UiButton'],load:()=>import('./pages/MainPage.vue')}]});\n`;
for (const [file, content] of Object.entries(files)) {
  mkdirSync(join(dir, file, ".."), { recursive: true });
  writeFileSync(join(dir, file), await formatSource(file, content));
}

writeFileSync(
  "src/app/catalog.ts",
  await formatSource(
    "src/app/catalog.ts",
    `import ${name} from '@/modules/${name}/module';\n` +
      catalog.replace(
        /(export const modules:\s*Module\[\]\s*=\s*\[)/,
        `$1${name},`,
      ),
  ),
);
mkdirSync(`doc/${name}`, { recursive: true });
writeFileSync(
  `doc/${name}/rules.md`,
  `# ${title}规则\n\nR-00：生成器结构样板，输入文本原样成为输出。此项只用于验证框架，需按真实业务改写。\n\n真实业务：待确认。\n\n## 验证位置\n\n| 规则 | 测试路径 |\n| --- | --- |\n| R-00 | \`src/modules/${name}/tests/behavior.test.ts\` |\n`,
);
writeFileSync(
  `doc/${name}/needs.md`,
  `# ${title}\n\n使用者、目标与验收样例：待填写。\n`,
);
const data = registry();
data.modules[name] = { files: Object.keys(files), generator: "new-module/1" };
saveRegistry(data);
console.log(
  `已生成 ${name}。先写业务规则，再填步骤；运行 npm run docs 和 npm run check -- --module ${name}。`,
);
