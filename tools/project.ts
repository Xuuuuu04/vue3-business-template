/** 主代理读总图，局部代理读指定包；明确区分定义、真实检查和过期结果。 */
import { readFileSync, existsSync } from "node:fs";
import { modules } from "../src/app/catalog";
import { describe } from "../src/shared/modules/graph";
import { fingerprint } from "./lib";
const args = process.argv.slice(2);
const named = args.indexOf("--module");
const name = named >= 0 ? args[named + 1] : undefined;
if (name && !modules.some((m) => m.name === name))
  throw new Error(`未登记模块 ${name}`);
let check: unknown = { status: "未运行" };
if (existsSync("var/checks/latest.json")) {
  const saved = JSON.parse(readFileSync("var/checks/latest.json", "utf8")) as {
    fingerprint: string;
  };
  check = {
    ...saved,
    status:
      saved.fingerprint === fingerprint()
        ? "与当前代码一致"
        : "代码已改变，旧检查过期",
  };
}
const graph = describe(name ? modules.filter((m) => m.name === name) : modules);
const plan = existsSync("project-plan.json")
  ? JSON.parse(readFileSync("project-plan.json", "utf8"))
  : [];
const result = {
  purpose: "按业务包与动作定位；图的存在不证明业务已经正确",
  plan,
  modules: graph,
  checks: check,
};
if (args.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`开发包 ${graph.length} 个；检查情况：${JSON.stringify(check)}`);
  for (const module of graph) {
    console.log(`\n${module.title} (${module.name})：${module.description}`);
    for (const page of module.pages)
      console.log(`  页面 ${page.title} → ${page.file}`);
    for (const action of module.actions)
      console.log(
        `  ${action.title}：${action.steps.map((s) => s.title).join(" → ")}`,
      );
  }
  console.log(
    "\n完整结构：npm run project -- --json；局部：npm run project -- --module 包名 --json",
  );
}
