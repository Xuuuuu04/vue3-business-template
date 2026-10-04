/** 从实际 Git 差异与模块依赖找需要检查的业务范围。 */
import { execFileSync } from "node:child_process";
import { modules } from "../src/app/catalog";
const args = process.argv.slice(2);
const at = args.indexOf("--base");
const base = at >= 0 ? args[at + 1] : "HEAD";
if (!base) throw new Error("缺少比较版本");
const diff = execFileSync("git", ["diff", "--name-only", base, "--"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
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
