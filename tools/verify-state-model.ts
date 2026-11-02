import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { direct, parseArgs } from "./lib";

export interface SourceMapping {
  file: string;
  symbol: string;
  sha256: string;
  actions: string[];
}
export interface ModelManifest {
  tool: { version: string; sha256: string; download: string };
  reviewedAt: string;
  scope: string;
  sources: SourceMapping[];
}

export function symbolHash(source: string, symbol: string) {
  const tree = ts.createSourceFile("mapped.ts", source, ts.ScriptTarget.Latest);
  const node = tree.statements.find(
    (item) => ts.isFunctionDeclaration(item) && item.name?.text === symbol,
  );
  if (!node) throw new Error(`找不到状态模型对应函数 ${symbol}`);
  return createHash("sha256").update(node.getText(tree)).digest("hex");
}

export function checkModelSources(root: string, manifest: ModelManifest) {
  for (const source of manifest.sources) {
    const path = resolve(root, source.file);
    if (symbolHash(readFileSync(path, "utf8"), source.symbol) !== source.sha256)
      throw new Error(
        `${source.file}:${source.symbol} 已变化；先核对状态模型与真实测试，再更新映射摘要，不能只接受新摘要。`,
      );
  }
}

export function checkModelTool(jar: string, manifest: ModelManifest) {
  const actual = createHash("sha256").update(readFileSync(jar)).digest("hex");
  if (actual !== manifest.tool.sha256)
    throw new Error(
      `TLC 工具摘要不符，需要 ${manifest.tool.version} 的固定版本`,
    );
}

export function checkedModelOutput(
  result: SpawnSyncReturns<string>,
  mutation: boolean,
) {
  const text = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.error) throw result.error;
  const passed = mutation
    ? result.status === 12 &&
      text.includes("Invariant NoStaleCompletion is violated.")
    : result.status === 0 &&
      text.includes("Model checking completed. No error has been found.");
  if (!passed)
    throw new Error(
      mutation
        ? "错误模型没有产生预期的旧结果覆盖反例；查看 mutation.log。"
        : "状态模型未通过；查看 model.log。",
    );
  return text.match(/(\d+) distinct states found/)?.[1];
}

function runModel(
  root: string,
  jar: string,
  output: string,
  mutation: boolean,
) {
  const name = mutation ? "mutation" : "model";
  const result = spawnSync(
    "java",
    [
      "-XX:+UseParallelGC",
      "-Xmx512m",
      "-cp",
      jar,
      "tlc2.TLC",
      "-workers",
      "1",
      "-metadir",
      resolve(output, `${name}-states`),
      "-config",
      `tests/formal/LatestQuery${mutation ? "Broken" : ""}.cfg`,
      "tests/formal/LatestQuery.tla",
    ],
    { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
  );
  writeFileSync(
    resolve(output, `${name}.log`),
    (result.stdout ?? "") + (result.stderr ?? ""),
  );
  return checkedModelOutput(result, mutation);
}

function runImplementation(root: string, output: string) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/framework/concurrency.test.ts",
      "tests/framework/field-errors.test.ts",
    ],
    { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 },
  );
  writeFileSync(
    resolve(output, "implementation.log"),
    (result.stdout ?? "") + (result.stderr ?? ""),
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("真实实现回归未通过，查看 implementation.log。");
}

export function verifyStateModel(root: string, jar: string) {
  const output = resolve(
    root,
    "var/formal",
    new Date().toISOString().replaceAll(":", "-"),
  );
  mkdirSync(output, { recursive: true });
  const manifest = JSON.parse(
    readFileSync(resolve(root, "tests/formal/manifest.json"), "utf8"),
  ) as ModelManifest;
  const summary = {
    scope: manifest.scope,
    tool: manifest.tool.version,
    status: "本轮尚未通过",
    checkedAt: new Date().toISOString(),
    states: undefined as string | undefined,
    mutationStates: undefined as string | undefined,
    implementation: "未执行",
    error: undefined as string | undefined,
  };
  try {
    checkModelSources(root, manifest);
    checkModelTool(resolve(jar), manifest);
    summary.states = runModel(root, resolve(jar), output, false);
    summary.mutationStates = runModel(root, resolve(jar), output, true);
    runImplementation(root, output);
    summary.implementation = "通过";
    checkModelSources(root, manifest);
    summary.status = "通过";
    console.log(
      `限定状态模型通过：${summary.states} 个状态，故意错误模型产生反例，真实实现回归通过。`,
    );
    console.log(`范围：${manifest.scope}；结果保存在 ${output}`);
  } catch (error) {
    summary.status = "失败";
    summary.error = error instanceof Error ? error.message : "状态模型检查失败";
    throw error;
  } finally {
    writeFileSync(
      resolve(output, "result.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
  }
}

if (direct(fileURLToPath(import.meta.url))) {
  const args = parseArgs(
    "用法：npm run verify:state -- --jar /绝对路径/tla2tools-1.7.4.jar\n只使用校验通过的本地工具，不会自动下载；Java 11 以上。",
    { options: ["--jar"] },
  );
  const jar = args.options.get("--jar");
  if (!jar)
    throw new Error(
      "缺少 --jar；固定版本与下载方式见 doc/formal-verification.md。",
    );
  verifyStateModel(process.cwd(), jar);
}
