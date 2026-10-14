/** 主代理读总图，局部代理读指定包；明确区分定义、真实检查和过期结果。 */
import { readFileSync, existsSync } from "node:fs";
import generatedGraph from "../src/generated/graph.json";
import type { describe } from "../src/shared/modules/graph";
import { fingerprint, parseArgs, usageError } from "./lib";
const usage = `用法：npm run project [-- --module 包名] [--json]
  不带参数        列出全部包、页面、动作和检查情况
  --module 包名   只看一个包
  --json          输出完整 JSON`;
const args = parseArgs(usage, { flags: ["--json"], options: ["--module"] });
const name = args.options.get("--module");
const modules = generatedGraph as unknown as ReturnType<typeof describe>;
if (name && !modules.some((m) => m.name === name))
  usageError(
    `未登记模块 ${name}；已登记：${modules.map((m) => m.name).join("、") || "无"}`,
    usage,
  );
function resultOf(file: string) {
  if (!existsSync(file)) return { status: "未运行" };
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const current = saved.fingerprint === fingerprint();
  if (saved.tests) {
    const tests = saved.tests;
    const files = (tests.testResults || [])
      .filter(
        (entry: { name: string }) =>
          !name || entry.name.includes(`/modules/${name}/`),
      )
      .map(
        (entry: {
          name: string;
          assertionResults: {
            fullName: string;
            status: string;
            duration: number;
          }[];
        }) => ({
          file: entry.name.replace(process.cwd() + "/", ""),
          cases: entry.assertionResults.map((item) => ({
            name: item.fullName,
            status: item.status,
            duration: item.duration,
          })),
        }),
      );
    return {
      status: current ? "与当前代码一致" : "代码已改变，旧检查过期",
      scope: saved.scope,
      checkedAt: saved.checkedAt,
      typeCheck: saved.typeCheck,
      structure: saved.structure,
      files,
    };
  }
  return {
    ...saved,
    status: current
      ? saved.status || "与当前代码一致"
      : "代码已改变，旧检查过期",
  };
}
const check = {
  frameworkAndBusiness: resultOf("var/checks/latest.json"),
  browser: resultOf("var/checks/browser.json"),
  backend: resultOf("var/checks/backend.json"),
};
const graph = name ? modules.filter((m) => m.name === name) : modules;
const plan = existsSync("project-plan.json")
  ? JSON.parse(readFileSync("project-plan.json", "utf8"))
  : [];
const result = {
  purpose: "按业务包与动作定位；图的存在不证明业务已经正确",
  plan,
  modules: graph,
  checks: check,
};
if (args.flags.has("--json")) console.log(JSON.stringify(result, null, 2));
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
