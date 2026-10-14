/** 同一套结构检查在开发启动、打包、本机交付与 CI 中执行。 */
import { mkdirSync, writeFileSync } from "node:fs";
import {
  validateEnabledModules,
  loadBusinessModules,
} from "../src/shared/modules/definitions";
import { modules as registeredModules } from "../src/app/catalog";
import { inspectProject, sourceIndex } from "./inspect";
import { verifyLock } from "./framework-lock";
import { fingerprint, run, parseArgs } from "./lib";
import { refreshDerived } from "./export-docs";
const args = parseArgs(
  `用法：npm run check [-- --module 包名]
  不带参数        检查全部框架和业务包
  --module 包名   只跑这个包的测试，类型检查仍覆盖全仓
  --structure     只做结构检查（开发服务和打包会自动运行）`,
  { flags: ["--structure"], options: ["--module"] },
);
const modules = await loadBusinessModules(registeredModules);
validateEnabledModules(
  modules,
  new Set((process.env.VITE_DISABLED_MODULES || "").split(",").filter(Boolean)),
);
const structural = args.flags.has("--structure");
const moduleName = args.options.get("--module");
if (!structural) {
  mkdirSync("var/checks", { recursive: true });
  writeFileSync(
    "var/checks/latest.json",
    JSON.stringify(
      {
        fingerprint: fingerprint(),
        scope: moduleName || "全部框架和业务包",
        checkedAt: new Date().toISOString(),
        status: "本轮尚未通过",
      },
      null,
      2,
    ) + "\n",
  );
}
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
const stale = await refreshDerived();
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
  if (moduleName && !modules.some((m) => m.name === moduleName))
    throw new Error(`未登记模块 ${moduleName}`);
  run("npx", ["vue-tsc", "--noEmit"]);
  mkdirSync("var/checks", { recursive: true });
  run("npx", [
    "vitest",
    "run",
    ...(moduleName ? [`src/modules/${moduleName}/tests`] : []),
    "--reporter=default",
    "--reporter=json",
    "--outputFile=var/checks/tests.json",
  ]);
  writeFileSync(
    "var/checks/latest.json",
    JSON.stringify(
      {
        fingerprint: fingerprint(),
        scope: moduleName || "全部框架和业务包",
        checkedAt: new Date().toISOString(),
        status: "通过",
        typeCheck: "通过",
        structure: "通过",
        tests: JSON.parse(
          (await import("node:fs")).readFileSync(
            "var/checks/tests.json",
            "utf8",
          ),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("实际检查结果已写入 var/checks；浏览器和真实后台测试另行运行。");
}
