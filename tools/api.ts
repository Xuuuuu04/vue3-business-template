/** 前后端接口对照与生成：npm run api -- check|gen --openapi 文档路径 [--prefix /api/v1/xxx --module 包名]。 */
import { readFileSync } from "node:fs";
import { modules } from "../src/app/catalog";
import { loadBusinessModules } from "../src/shared/modules/definitions";
import { checkEndpoints, generateApi, type OpenApi } from "./openapi";

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const command = args[0];
const file = option("--openapi");
if (!file || !["check", "gen"].includes(command ?? ""))
  throw new Error("用法：npm run api -- check --openapi 后端/doc/api/openapi.json [--module 包名]\n　　　npm run api -- gen --openapi 文档 --prefix /api/v1/files --module 包名");
const spec = JSON.parse(readFileSync(file, "utf8")) as OpenApi;

if (command === "gen") {
  const prefix = option("--prefix");
  const module = option("--module");
  if (!prefix || !module) throw new Error("生成需要 --prefix 路径前缀与 --module 包名");
  process.stdout.write(generateApi(spec, prefix, module));
} else {
  const only = option("--module");
  const loaded = (await loadBusinessModules(modules)).filter((m) => !only || m.name === only);
  let total = 0;
  for (const m of loaded) {
    const problems = checkEndpoints(spec, m.endpoints);
    total += problems.length;
    console.log(problems.length ? `✗ ${m.title}（${m.name}）：${problems.length} 处对不上` : `✓ ${m.title}（${m.name}）：${m.endpoints.length} 个接口都对得上`);
    for (const p of problems) console.log(`  - ${p.endpoint}：${p.message}`);
  }
  if (total) process.exitCode = 1;
}
