/** 共用执行器、主题、工具与检查的版本保护；不是操作系统权限隔离。 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { filesBelow, direct } from "./lib";
import { safeTemplatePath } from "./template-paths";
const trees = [
  "src/shared",
  "src/app",
  "deploy",
  "tools",
  "tests/framework",
  "tests/architecture",
  ".agents/skills",
];
const singles = [
  "scaffold.json",
  "src/env.d.ts",
  "src/main.ts",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  "tsconfig.json",
  ".github/workflows/check.yml",
];
const productFiles = ["src/app/catalog.ts", "src/app/app.config.ts"];

/** 旧版本清单也只能指向框架范围，不能把业务或任意文件交给更新器。 */
export function isFrameworkPath(name: string) {
  return (
    !productFiles.includes(name) &&
    (singles.includes(name) ||
      trees.some((tree) => name.startsWith(tree + "/")))
  );
}
export function protectedFiles(root = process.cwd()) {
  return trees
    .flatMap((name) => filesBelow(safeTemplatePath(root, name)))
    .filter((file) => !productFiles.includes(relative(root, file)))
    .concat(
      singles.map((name) => safeTemplatePath(root, name)).filter(existsSync),
    )
    .sort()
    .map((file) => safeTemplatePath(root, relative(root, file)));
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
  const path = safeTemplatePath(root, "framework.lock");
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
