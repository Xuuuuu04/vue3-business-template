/** 从实际 Git 差异与模块依赖找需要检查的业务范围。 */
import { execFileSync } from "node:child_process";
import { modules } from "../src/app/catalog";
import { parseArgs, usageError } from "./lib";
const usage = `用法：npm run impact [-- --base 比较版本]
  不带参数        和最近一次提交（HEAD）比较，包括未提交和未跟踪的文件
  --base 版本     和指定分支或提交比较，例如 --base main`;
const args = parseArgs(usage, { options: ["--base"] });
const base = args.options.get("--base") ?? "HEAD";
/** 产品常放在仓库子目录里，git 输出的路径一律换成相对当前目录，并只看当前目录下的改动。 */
function git(...gitArgs: string[]) {
  try {
    return execFileSync("git", gitArgs, { encoding: "utf8", stdio: "pipe" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    const detail = String((error as { stderr?: string }).stderr ?? "").trim();
    return usageError(
      `git ${gitArgs[0]} 失败：${detail.split("\n")[0] || "没有输出"}`,
      usage,
    );
  }
}
try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
    stdio: "pipe",
  });
} catch {
  usageError(
    "当前目录不在 Git 仓库里，impact 找不到改动。先 git init 并提交一次，或者直接运行 npm run check 做完整检查。",
    usage,
  );
}
const diff = git("diff", "--name-only", "--relative", base, "--");
const untracked = git("ls-files", "--others", "--exclude-standard");
const changed = [...new Set([...diff, ...untracked])];
const framework = changed.some((file) =>
  /^(src\/(shared|app)\/|tools\/|vite\.config|framework\.lock)/.test(file),
);
const affected = new Set<string>(
  framework
    ? modules.map((m) => m.name)
    : changed
        .map((file) => /^src\/modules\/([^/]+)\//.exec(file)?.[1])
        .filter((name): name is string => !!name),
);
let added = true;
while (added) {
  added = false;
  for (const module of modules)
    if (
      !affected.has(module.name) &&
      module.dependsOn.some((name) => affected.has(name))
    ) {
      affected.add(module.name);
      added = true;
    }
}
console.log(
  JSON.stringify(
    {
      base,
      changed,
      framework,
      modules: [...affected],
      reason: framework
        ? "共用部分改变，所有包需要检查"
        : "包括直接修改包和使用它们的包",
      commands: framework
        ? ["npm run check"]
        : [...affected].map((name) => `npm run check -- --module ${name}`),
    },
    null,
    2,
  ),
);
