import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  validateEnabledModules,
  loadBusinessModules,
} from "../src/shared/modules/definitions";
import { modules as registeredModules } from "../src/app/catalog";
import { inspectProject, sourceIndex } from "./inspect";
import {
  verifyLock,
  templateToolTests,
  unchangedTemplateSource,
} from "./framework-lock";
import { fingerprint, run, parseArgs, usageError } from "./lib";
import { inspectQuality } from "./code-quality";
import { refreshDerived } from "./export-docs";
const usage = `用法：npm run check [-- --module 包名]
  不带参数        检查全部框架和业务包
  --module 包名   只跑这个包的测试，类型检查仍覆盖全仓
  --quick         配合 --module，仅检查代码规则、格式和相关测试，不做类型检查
  --structure     只做结构检查（开发服务和打包会自动运行）`;
const args = parseArgs(usage, {
  flags: ["--structure", "--quick"],
  options: ["--module"],
});
const modules = await loadBusinessModules(registeredModules);
validateEnabledModules(
  modules,
  new Set((process.env.VITE_DISABLED_MODULES || "").split(",").filter(Boolean)),
);
const structural = args.flags.has("--structure");
const moduleName = args.options.get("--module");
const quick = args.flags.has("--quick");
if (quick && (!moduleName || structural))
  usageError(
    "--quick 必须和 --module 一起使用，不能和 --structure 一起使用",
    usage,
  );
let checkedFingerprint = fingerprint();
const started = performance.now();
const durations: Record<string, number> = {};
if (moduleName && !modules.some((m) => m.name === moduleName))
  usageError(
    `未登记模块 ${moduleName}；已登记：${modules.map((m) => m.name).join("、") || "无"}`,
    usage,
  );

const record = moduleName
  ? `var/checks/${quick ? "quick-" : ""}module-${moduleName}.json`
  : "var/checks/full.json";
function save(fields: Record<string, unknown>) {
  mkdirSync("var/checks", { recursive: true });
  writeFileSync(
    record,
    JSON.stringify(
      {
        fingerprint: checkedFingerprint,
        scope: moduleName || "全部框架和业务包",
        checkedAt: new Date().toISOString(),
        mode: quick ? "quick" : "full",
        durations,
        ...fields,
      },
      null,
      2,
    ) + "\n",
  );
}

if (!structural) save({ status: "本轮尚未通过" });
const index = sourceIndex();
const stale = await refreshDerived(index);
checkedFingerprint = fingerprint();
const errors = [
  ...inspectProject(process.cwd(), modules, index),
  ...verifyLock(),
];
if (!structural) errors.push(...inspectQuality(process.cwd(), moduleName));
durations.structure = Math.round(performance.now() - started);
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
  const testOutput = `var/checks/${quick ? "quick-" : ""}${moduleName ?? "full"}-tests.json`;

  const inherited = moduleName ? undefined : unchangedTemplateSource();
  const skipped = inherited
    ? {
        files: templateToolTests,
        reason: `框架文件与模板来源 ${inherited} 一致，沿用模板验证`,
      }
    : undefined;
  if (skipped)
    console.log(
      `${skipped.reason}：跳过 ${templateToolTests.join("、")}。改过框架后会照常运行。`,
    );
  try {
    let stage = performance.now();
    run("npx", [
      "prettier",
      "--check",
      ...(moduleName
        ? [`src/modules/${moduleName}/**/*.{ts,vue}`]
        : [
            "src/**/*.{ts,vue,css}",
            "tools/**/*.ts",
            "tests/**/*.ts",
            "*.ts",
            "package.json",
            "tsconfig.json",
            "index.html",
            ".github/workflows/*.yml",
          ]),
    ]);
    durations.format = Math.round(performance.now() - stage);
    stage = performance.now();
    if (!quick) run("npx", ["vue-tsc", "--noEmit"]);
    durations.types = Math.round(performance.now() - stage);
    stage = performance.now();
    run("npx", [
      "vitest",
      "run",
      ...(moduleName
        ? [
            `src/modules/${moduleName}/tests`,
            "tests/architecture/code-quality.test.ts",
          ]
        : []),
      ...(skipped ? skipped.files.flatMap((file) => ["--exclude", file]) : []),
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${testOutput}`,
    ]);
    durations.tests = Math.round(performance.now() - stage);
  } catch (error) {
    save({ status: "失败" });
    console.error(
      `${error instanceof Error ? error.message : error}；${record} 记为本轮尚未通过。`,
    );
    process.exit(1);
  }
  if (fingerprint() !== checkedFingerprint) {
    save({ status: "失败", error: "检查期间代码发生变化，请重新检查" });
    console.error("检查期间代码发生变化，请重新检查");
    process.exit(1);
  }
  save({
    status: "通过",
    typeCheck: quick ? "未运行（快速检查）" : "通过",
    quality: "通过",
    format: "通过",
    structure: "通过",
    skipped,
    tests: JSON.parse(readFileSync(testOutput, "utf8")),
  });
  console.log(`实际检查结果已写入 ${record}；浏览器和真实后台测试另行运行。`);
}
