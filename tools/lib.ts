/** 文件遍历、版本指纹与子进程共用工具，不在业务包中开放。 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
export function filesBelow(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesBelow(resolve(root, entry.name))
      : [resolve(root, entry.name)],
  );
}
export function projectFiles(root = process.cwd()) {
  return ["src", "tools", "tests", "doc", "design"]
    .flatMap((name) => filesBelow(resolve(root, name)))
    .concat(
      [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "vitest.config.ts",
        "playwright.config.ts",
        "AGENTS.md",
        "README.md",
        "framework.lock",
        "scaffold.json",
        "project-plan.json",
      ]
        .map((name) => resolve(root, name))
        .filter(existsSync),
    )
    .sort();
}
export function fingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  for (const file of projectFiles(root)) {
    hash.update(relative(root, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}
export function run(command: string, args: string[], root = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} 失败`);
}
export function direct(file: string) {
  return process.argv[1] && resolve(process.argv[1]) === resolve(file);
}

/** 发布与开发运行保存实际源码指纹，不用固定 development 冒充版本。 */
export function sourceFingerprint(root = process.cwd()) {
  const hash = createHash("sha256");
  for (const file of ["src", "tools"]
    .flatMap((name) => filesBelow(resolve(root, name)))
    .filter((file) => !file.includes("/generated/"))
    .sort()) {
    hash.update(relative(root, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}
