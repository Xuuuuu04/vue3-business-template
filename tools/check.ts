/** 同一套结构检查在开发启动、打包、本机交付与 CI 中执行。 */
import { mkdirSync, writeFileSync } from "node:fs";
import { modules } from "../src/app/catalog";
import { inspectProject, sourceIndex } from "./inspect";
import { verifyLock } from "./framework-lock";
import { fingerprint, run } from "./lib";
import { exportDocs } from "./export-docs";
const structural = process.argv.includes("--structure");
const moduleIndex = process.argv.indexOf("--module");
const moduleName = moduleIndex >= 0 ? process.argv[moduleIndex + 1] : undefined;
const errors = [...inspectProject(process.cwd(), modules), ...verifyLock()];
const index = sourceIndex();
for (const module of modules)
  for (const action of module.actions)
    for (const step of action.steps)
      if (!index[step.id]) errors.push(`${step.id} 没有命名函数位置`);
if (errors.length) throw new Error(errors.join("\n"));
exportDocs(true);
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
