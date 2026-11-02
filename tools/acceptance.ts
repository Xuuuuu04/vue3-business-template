import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
import { resolve } from "node:path";
import { filesBelow, fingerprint, parseArgs, run } from "./lib";
import {
  backendFingerprint,
  portNumber,
  type AcceptanceContext,
} from "./acceptance/context";
import { requireFreePort, portOpen, runPlaywright } from "./acceptance/process";

const usage =
  "用法：npm run test:acceptance -- --backend 后端根目录 [--frontend-port 5196] [--backend-port 8159] [--seed] [--infrastructure]";
const args = parseArgs(usage, {
  flags: ["--seed", "--infrastructure"],
  options: ["--backend", "--frontend-port", "--backend-port"],
});
const backendPath = args.options.get("--backend");
if (!backendPath) throw new Error(usage);
const context: AcceptanceContext = {
  runId: randomUUID(),
  backend: realpathSync(backendPath),
  frontendPort: portNumber(args.options.get("--frontend-port"), 5196),
  backendPort: portNumber(args.options.get("--backend-port"), 8159),
  output: "",
  infrastructure: args.flags.has("--infrastructure"),
  seed: args.flags.has("--seed"),
};
if (context.frontendPort === context.backendPort)
  throw new Error("前后端不能使用同一端口");
if (!existsSync(resolve(context.backend, "server/pyproject.toml")))
  throw new Error("后端目录不含 server/pyproject.toml");
context.output = resolve("var/acceptance", context.runId);
mkdirSync(context.output, { recursive: true });
mkdirSync("var/checks", { recursive: true });
let source = fingerprint();
const backendSource = backendFingerprint(context.backend);
const report = {
  runId: context.runId,
  checkedAt: new Date().toISOString(),
  status: "未通过",
  scope: context.infrastructure
    ? "本地隔离设施，不含业务验收"
    : "本地真实HTTP与SQLite业务验收",
  backend: {
    root: context.backend,
    fingerprint: backendSource,
    templateVersion:
      /^version = "([^"]+)"/m.exec(
        readFileSync(resolve(context.backend, "server/pyproject.toml"), "utf8"),
      )?.[1] ?? "unknown",
  },
  frontendVersion: (
    JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
  ).version,
  limitations: [
    "未验证迁移",
    "未验证PostgreSQL",
    "未验证外部服务",
    "未启动后台worker",
  ],
  output: context.output,
};
function save(fields: Record<string, unknown>) {
  const value =
    JSON.stringify({ ...report, fingerprint: source, ...fields }, null, 2) +
    "\n";
  writeFileSync(resolve(context.output, "result.json"), value);
  writeFileSync(
    `var/checks/${context.infrastructure ? "acceptance-infrastructure" : "acceptance"}.json`,
    value,
  );
}
async function verify() {
  save({ status: "运行中" });
  try {
    const tests = filesBelow(resolve("tests/acceptance")).filter((name) =>
      name.endsWith(".spec.ts"),
    );
    if (!context.infrastructure && !tests.length)
      throw new Error(
        "无业务验收场景，请按 vue-backend Skill 添加 tests/acceptance/*.spec.ts；设施检查使用 --infrastructure",
      );
    await requireFreePort(context.frontendPort);
    await requireFreePort(context.backendPort);
    run(process.execPath, ["--import", "tsx", "tools/check.ts", "--structure"]);
    source = fingerprint();
    const exit = await runPlaywright({
      ...process.env,
      TEMPLATE_ACCEPTANCE_CONTEXT: JSON.stringify(context),
      ACCEPTANCE_BACKEND_URL: `http://127.0.0.1:${context.backendPort}`,
      ACCEPTANCE_RUN_ID: context.runId,
    });
    const file = resolve(context.output, "cases.json");
    const result = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf8")) as {
          status: string;
          cases: Array<{ status: string }>;
        })
      : undefined;
    const ports = await Promise.all([
      portOpen(context.frontendPort),
      portOpen(context.backendPort),
    ]);
    const unchanged =
      source === fingerprint() &&
      backendSource === backendFingerprint(context.backend);
    const lifecycleFile = resolve(context.output, "backend-lifecycle.json");
    const lifecycle = existsSync(lifecycleFile)
      ? (JSON.parse(readFileSync(lifecycleFile, "utf8")) as {
          run_id?: string;
          phase?: string;
          folder?: string;
        })
      : undefined;
    const dataCleaned =
      lifecycle?.run_id === context.runId &&
      lifecycle.phase === "cleanup_complete" &&
      typeof lifecycle.folder === "string" &&
      !existsSync(lifecycle.folder);
    const passed =
      exit === 0 &&
      result?.status === "passed" &&
      result.cases.length > 0 &&
      result.cases.every((test) => test.status === "passed") &&
      !ports.some(Boolean) &&
      dataCleaned &&
      unchanged;
    save({
      status: passed ? "通过" : "失败",
      exitCode: exit,
      cases: result?.cases ?? [],
      sourceUnchanged: unchanged,
      dataCleaned,
      cleanup: ports.some(Boolean)
        ? "端口仍占用，未终止未知进程"
        : dataCleaned
          ? "两端服务已退出，临时数据已删除"
          : "服务已退出，临时数据清理未确认",
    });
    process.exitCode = passed ? 0 : 1;
    console.log(
      `${report.scope}：${passed ? "通过" : "失败"}；报告 ${context.output}/result.json`,
    );
  } catch (error) {
    save({
      status: "失败",
      error: error instanceof Error ? error.message : "验收失败",
    });
    console.error(error instanceof Error ? error.message : "验收失败");
    process.exitCode = 1;
  }
}
await verify();
