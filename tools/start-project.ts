/** 新产品复制框架，删除样板业务、检查历史和 Git 历史。 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { protectedFiles, lockData } from "./framework-lock";
import { sourceFingerprint } from "./lib";
import { sourceIndex } from "./inspect";
import { assertFramework } from "./scaffold";
const destination = process.argv[2];
if (!destination)
  throw new Error("用法：npm run start:project -- /绝对路径/新产品");
const target = resolve(destination);
const source = process.cwd();
assertFramework();
if (
  target === source ||
  target.startsWith(source + "/") ||
  (existsSync(target) && readdirSync(target).length)
)
  throw new Error("目标必须是本项目之外的空目录");
mkdirSync(target, { recursive: true });
for (const entry of readdirSync(source)) {
  if (
    [
      ".git",
      ".agents",
      "node_modules",
      "dist",
      "var",
      "playwright-report",
      "test-results",
      ".env",
    ].includes(entry) ||
    (entry.startsWith(".env.") && entry !== ".env.example")
  )
    continue;
  cpSync(resolve(source, entry), resolve(target, entry), { recursive: true });
}
// 本机的 .agents 内容不复制，只带项目 Skill。
if (existsSync(resolve(source, ".agents/skills")))
  cpSync(resolve(source, ".agents/skills"), resolve(target, ".agents/skills"), {
    recursive: true,
  });
const { rmSync } = await import("node:fs");
rmSync(resolve(target, "src/modules"), { recursive: true, force: true });
mkdirSync(resolve(target, "src/modules"), { recursive: true });
rmSync(resolve(target, "doc/file_library"), { recursive: true, force: true });
rmSync(resolve(target, "tests/browser/files.spec.ts"), { force: true });
writeFileSync(
  resolve(target, "src/app/catalog.ts"),
  `import type { Module } from '@/shared/public';\nexport const modules: Module[] = [];\n`,
);
writeFileSync(
  resolve(target, "scaffold.json"),
  JSON.stringify({ version: 1, modules: {} }, null, 2) + "\n",
);
writeFileSync(
  resolve(target, "project-plan.json"),
  JSON.stringify({ product: "待填写", businessLines: [] }, null, 2) + "\n",
);
const originals: Record<string, string> = {};
for (const file of protectedFiles(source)) {
  const name = relative(source, file);
  originals[name] = readFileSync(file, "utf8");
}
mkdirSync(resolve(target, ".template"), { recursive: true });
writeFileSync(
  resolve(target, ".template/base.json"),
  JSON.stringify(originals, null, 2) + "\n",
);
let commit = "uncommitted";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
} catch {
  /* 没有提交时明确记录来源尚未提交。 */
}
writeFileSync(
  resolve(target, ".template/source.json"),
  JSON.stringify(
    {
      repository: "https://github.com/Xuuuuu04/vue3-business-template",
      commit,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  resolve(target, "framework.lock"),
  JSON.stringify(lockData(target), null, 2) + "\n",
);
writeFileSync(
  resolve(target, "src/generated/sources.json"),
  JSON.stringify(sourceIndex(target), null, 2) + "\n",
);
writeFileSync(resolve(target, "src/generated/graph.json"), "[]\n");
writeFileSync(
  resolve(target, "src/generated/version.json"),
  JSON.stringify(
    { sourceFingerprint: sourceFingerprint(target).slice(0, 16) },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  resolve(target, "doc/structure.md"),
  "# 开发包与页面\n\n这份文件来自实际登记内容。运行是否成功，使用 project 命令和浏览器运行详情查看。\n\n",
);
console.log(
  `新产品已创建：${target}\n进入新目录运行 npm install、npm run docs、npm run framework -- --accept，再创建业务包。`,
);
