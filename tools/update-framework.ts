/** 比较模板旧版、新版和产品修改；默认预览，有冲突时一项都不写。 */
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { resolve } from "node:path";
import { protectedFiles, lockData } from "./framework-lock";
import { relative } from "node:path";
const args = process.argv.slice(2);
const at = args.indexOf("--source");
const location = at >= 0 ? args[at + 1] : undefined;
if (!location)
  throw new Error(
    "用法：npm run update:framework -- --source /新版模板目录 [--apply]",
  );
const source = resolve(location);
if (source === process.cwd()) throw new Error("新版模板目录不能是当前产品");
if (!existsSync(".template/base.json"))
  throw new Error(
    "缺少原模板内容。请使用 start:project 创建产品，或先恢复其 .template/base.json。",
  );
const base = JSON.parse(readFileSync(".template/base.json", "utf8")) as Record<
  string,
  string
>;
const incoming = Object.fromEntries(
  protectedFiles(source)
    .filter((file) => relative(source, file) !== "scaffold.json")
    .map((file) => [relative(source, file), readFileSync(file, "utf8")]),
);
const changes: { file: string; content?: string }[] = [];
const conflicts: string[] = [];
for (const file of new Set([...Object.keys(base), ...Object.keys(incoming)])) {
  if (file === "scaffold.json") continue;
  const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
  const old = base[file];
  const next = incoming[file];
  if (current === next || old === next) continue;
  if (current !== old) {
    conflicts.push(file);
    continue;
  }
  changes.push({ file, content: next });
}
console.log(
  JSON.stringify(
    {
      mode: args.includes("--apply") ? "执行" : "预览",
      changes: changes.map((c) => ({
        file: c.file,
        operation: c.content === undefined ? "删除" : "更新",
      })),
      conflicts,
    },
    null,
    2,
  ),
);
if (conflicts.length)
  throw new Error(
    "产品与模板同时改变了这些文件，请先逐项处理冲突。没有修改任何文件。",
  );
if (args.includes("--apply")) {
  const backup: Record<string, string | undefined> = {};
  try {
    for (const item of changes) {
      backup[item.file] = existsSync(item.file)
        ? readFileSync(item.file, "utf8")
        : undefined;
      if (item.content === undefined) rmSync(item.file);
      else {
        mkdirSync(resolve(item.file, ".."), { recursive: true });
        writeFileSync(item.file, item.content);
      }
    }
    writeFileSync(
      ".template/base.json",
      JSON.stringify(incoming, null, 2) + "\n",
    );
    writeFileSync("framework.lock", JSON.stringify(lockData(), null, 2) + "\n");
  } catch (error) {
    for (const [file, content] of Object.entries(backup)) {
      if (content === undefined) rmSync(file, { force: true });
      else writeFileSync(file, content);
    }
    throw error;
  }
  console.log("框架文件已更新。业务包和登记内容保留，下一步运行全部检查。");
}
