import { existsSync, readFileSync } from "node:fs";
import { modules } from "../src/app/catalog";
import { loadBusinessModules } from "../src/shared/modules/definitions";
import { checkEndpoints, generateApi, type OpenApi } from "./openapi";
import { parseArgs, usageError } from "./lib";

const usage = `用法：npm run api -- check --openapi 后端/doc/api/openapi.json [--module 包名]
      npm run api -- gen --openapi 后端/doc/api/openapi.json --prefix /api/v1/orders --module 包名
  check  对照已登记接口和后端文档
  gen    按路径前缀生成接口登记和类型代码，打印到屏幕`;
const args = parseArgs(usage, {
  options: ["--openapi", "--prefix", "--module"],
  positionals: 1,
});
const command = args.positionals[0];
const file = args.options.get("--openapi");
if (command !== "check" && command !== "gen")
  usageError(
    command ? `不认识的子命令 ${command}` : "缺少子命令 check 或 gen",
    usage,
  );
if (!file) usageError("缺少 --openapi", usage);
if (!existsSync(file)) usageError(`找不到接口文档 ${file}`, usage);
const spec = JSON.parse(readFileSync(file, "utf8")) as OpenApi;

if (command === "gen") {
  const prefix = args.options.get("--prefix");
  const module = args.options.get("--module");
  if (!prefix || !module)
    usageError("生成需要 --prefix 路径前缀与 --module 包名", usage);
  process.stdout.write(generateApi(spec, prefix, module));
} else {
  if (args.options.has("--prefix")) usageError("check 不使用 --prefix", usage);
  const only = args.options.get("--module");
  const loaded = (await loadBusinessModules(modules)).filter(
    (m) => !only || m.name === only,
  );
  if (only && !loaded.length) usageError(`未登记模块 ${only}`, usage);
  let total = 0;
  for (const m of loaded) {
    const problems = checkEndpoints(spec, m.endpoints);
    total += problems.length;
    console.log(
      problems.length
        ? `✗ ${m.title}（${m.name}）：${problems.length} 处对不上`
        : `✓ ${m.title}（${m.name}）：${m.endpoints.length} 个接口都对得上`,
    );
    for (const p of problems) console.log(`  - ${p.endpoint}：${p.message}`);
  }
  if (total) process.exitCode = 1;
}
