import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { filesBelow } from "../lib";

export interface AcceptanceContext {
  runId: string;
  backend: string;
  backendPort: number;
  frontendPort: number;
  output: string;
  infrastructure: boolean;
  seed: boolean;
}
export function portNumber(value: string | undefined, fallback: number) {
  const port = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("验收端口必须是 1024–65535 的整数");
  return port;
}
export function shellArgument(value: string) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}
export function backendFingerprint(root: string) {
  const hash = createHash("sha256");
  const files = [
    "server/app",
    "server/shared",
    "server/service",
    "server/library",
    "server/migrations",
    "server/devtools/src",
    "server/tests/acceptance",
    ".agents/skills",
  ]
    .flatMap((path) => filesBelow(resolve(root, path)))
    .filter(
      (path) => !path.includes("/__pycache__/") && !path.endsWith(".pyc"),
    );
  for (const name of ["server/pyproject.toml", "server/uv.lock"])
    if (existsSync(resolve(root, name))) files.push(resolve(root, name));
  for (const file of files.sort()) {
    hash.update(relative(root, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}
export function context(): AcceptanceContext {
  const raw = process.env.TEMPLATE_ACCEPTANCE_CONTEXT;
  if (!raw) throw new Error("请通过 npm run test:acceptance 启动验收");
  return JSON.parse(raw) as AcceptanceContext;
}
export function assertIdentity(
  status: number,
  runId: string | null,
  expected: string,
) {
  if (status !== 200 || runId !== expected)
    throw new Error("后端不是本轮创建的可用隔离实例，停止验收");
}
