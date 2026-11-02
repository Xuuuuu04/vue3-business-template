import { readFileSync, existsSync, readdirSync } from "node:fs";
import { backendFingerprint } from "./acceptance/context";
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
const currentFingerprint = fingerprint();

function resultOf(file: string, missing = "未运行") {
  if (!existsSync(file)) return { status: missing };
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const backendCurrent =
    !saved.backend ||
    (existsSync(saved.backend.root) &&
      backendFingerprint(saved.backend.root) === saved.backend.fingerprint);
  const current = saved.fingerprint === currentFingerprint && backendCurrent;
  const status = current
    ? saved.status
    : `代码已改变，旧检查过期（当时${saved.status}）`;
  if (!saved.tests) return { ...saved, status, current };
  const files = (saved.tests.testResults || [])
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
    status,
    current,
    scope: saved.scope,
    checkedAt: saved.checkedAt,
    typeCheck: saved.typeCheck,
    mode: saved.mode,
    quality: saved.quality,
    format: saved.format,
    durations: saved.durations,
    structure: saved.structure,
    skipped: saved.skipped,
    files,
  };
}

const full = resultOf("var/checks/full.json");
const recorded = existsSync("var/checks")
  ? readdirSync("var/checks")
      .map((file) => /^module-(.+)\.json$/.exec(file)?.[1])
      .filter(
        (module): module is string => !!module && (!name || module === name),
      )
  : [];
const check = {
  full:
    "current" in full && full.current
      ? full
      : {
          ...full,
          note: "没有当前的整仓检查记录；单包检查不能代替，交付前运行 npm run check",
        },
  modules: Object.fromEntries(
    recorded.map((module) => [
      module,
      resultOf(`var/checks/module-${module}.json`),
    ]),
  ),
  quick: Object.fromEntries(
    modules.map((module) => [
      module.name,
      resultOf(`var/checks/quick-module-${module.name}.json`),
    ]),
  ),
  browser: resultOf("var/checks/browser.json"),
  acceptance: resultOf("var/checks/acceptance.json"),
  acceptanceInfrastructure: resultOf(
    "var/checks/acceptance-infrastructure.json",
  ),
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
  console.log(`开发包 ${graph.length} 个`);
  console.log(
    `整仓检查：${check.full.status}${"skipped" in check.full && check.full.skipped ? `（${check.full.skipped.reason}）` : ""}${"note" in check.full ? `。${check.full.note}` : ""}`,
  );
  console.log(
    `单包检查：${
      recorded
        .map((module) => `${module} ${check.modules[module]!.status}`)
        .join("；") || "没有"
    }`,
  );
  console.log(`浏览器检查：${check.browser.status}`);
  console.log(`隔离业务验收：${check.acceptance.status}`);
  console.log(`隔离设施检查：${check.acceptanceInfrastructure.status}`);
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
