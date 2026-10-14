/** 同一套结构检查在开发启动、打包、本机交付与 CI 中执行。 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  validateEnabledModules,
  loadBusinessModules,
} from "../src/shared/modules/definitions";
import { modules as registeredModules } from "../src/app/catalog";
import { inspectProject, sourceIndex } from "./inspect";
import { verifyLock } from "./framework-lock";
import { fingerprint, run, parseArgs, usageError } from "./lib";
import { refreshDerived } from "./export-docs";
const usage = `用法：npm run check [-- --module 包名]
  不带参数        检查全部框架和业务包
  --module 包名   只跑这个包的测试，类型检查仍覆盖全仓
  --structure     只做结构检查（开发服务和打包会自动运行）`;
const args = parseArgs(usage, {
  flags: ["--structure"],
  options: ["--module"],
});
const modules = await loadBusinessModules(registeredModules);
validateEnabledModules(
  modules,
  new Set((process.env.VITE_DISABLED_MODULES || "").split(",").filter(Boolean)),
);
const structural = args.flags.has("--structure");
const moduleName = args.options.get("--module");
if (moduleName && !modules.some((m) => m.name === moduleName))
  usageError(
    `未登记模块 ${moduleName}；已登记：${modules.map((m) => m.name).join("、") || "无"}`,
    usage,
  );
/** 整仓和每个包各存一份记录，单包通过不会盖掉整仓失败。 */
const record = moduleName
  ? `var/checks/module-${moduleName}.json`
  : "var/checks/full.json";
function save(fields: Record<string, unknown>) {
  mkdirSync("var/checks", { recursive: true });
  writeFileSync(
    record,
    JSON.stringify(
      {
        fingerprint: fingerprint(),
        scope: moduleName || "全部框架和业务包",
        checkedAt: new Date().toISOString(),
        ...fields,
      },
      null,
      2,
    ) + "\n",
  );
}
// 先重写派生指纹，本轮记录的指纹才和检查结束时的代码一致。
const stale = await refreshDerived();
if (!structural) save({ status: "本轮尚未通过" });
const errors = [...inspectProject(process.cwd(), modules), ...verifyLock()];
const index = sourceIndex();
for (const [id, source] of Object.entries(index))
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(source.symbol))
    errors.push(`${id} 必须使用命名函数作为步骤或条件`);
for (const module of modules)
  for (const action of module.actions)
    for (const step of action.steps)
      if (!index[step.id]) errors.push(`${step.id} 没有命名函数位置`);
      else if (step.when && !index[step.when.id])
        errors.push(`${step.when.id} 没有条件函数位置`);
if (stale.length)
  errors.push(
    `${stale.join("、")} 和当前登记不一致：请运行 npm run docs 重新生成`,
  );
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("文件登记、依赖方向、步骤、页面样式和框架保护检查通过。");
if (!structural) {
  const testOutput = "var/checks/tests.json";
  try {
    run("npx", ["vue-tsc", "--noEmit"]);
    run("npx", [
      "vitest",
      "run",
      ...(moduleName ? [`src/modules/${moduleName}/tests`] : []),
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${testOutput}`,
    ]);
  } catch (error) {
    console.error(
      `${error instanceof Error ? error.message : error}；${record} 记为本轮尚未通过。`,
    );
    process.exit(1);
  }
  save({
    status: "通过",
    typeCheck: "通过",
    structure: "通过",
    tests: JSON.parse(readFileSync(testOutput, "utf8")),
  });
  console.log(`实际检查结果已写入 ${record}；浏览器和真实后台测试另行运行。`);
}
