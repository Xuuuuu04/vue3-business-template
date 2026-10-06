/** 共用执行器、主题、工具与检查的版本保护；不是操作系统权限隔离。 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { filesBelow, direct } from "./lib";
export function protectedFiles(root = process.cwd()) {
  return [
    "src/shared",
    "src/app",
    "tools",
    "tests/framework",
    "tests/architecture",
    ".agents/skills",
  ]
    .flatMap((name) => filesBelow(resolve(root, name)))
    .filter((file) => relative(root, file) !== "src/app/catalog.ts")
    .concat(
      [
        "scaffold.json",
        "src/env.d.ts",
        "src/main.ts",
        "vite.config.ts",
        "vitest.config.ts",
        "playwright.config.ts",
        "tsconfig.json",
        ".github/workflows/check.yml",
      ]
        .map((name) => resolve(root, name))
        .filter(existsSync),
    )
    .sort();
}
export function lockData(root = process.cwd()) {
  return Object.fromEntries(
    protectedFiles(root).map((file) => [
      relative(root, file),
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]),
  );
}
export function verifyLock(root = process.cwd()) {
  const path = resolve(root, "framework.lock");
  if (!existsSync(path)) return ["缺少 framework.lock"];
  const saved = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    string
  >;
  const current = lockData(root);
  return [...new Set([...Object.keys(saved), ...Object.keys(current)])]
    .filter((name) => saved[name] !== current[name])
    .map((name) => `框架文件 ${name} 已改变，需要单独检查并更新保护记录`);
}
if (direct(fileURLToPath(import.meta.url))) {
  if (process.argv[2] !== "--accept")
    throw new Error(
      "修改共用文件后，先单独检查差异，再用 npm run framework -- --accept 更新保护记录",
    );
  writeFileSync("framework.lock", JSON.stringify(lockData(), null, 2) + "\n");
  console.log("已更新框架文件保护记录；这不代表业务测试通过。");
}
