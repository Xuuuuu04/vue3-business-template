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
  return [
    "src",
    "tools",
    "tests",
    "doc",
    "design",
    ".agents/skills",
    ".github/workflows",
  ]
    .flatMap((name) => filesBelow(resolve(root, name)))
    .concat(
      [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "vitest.config.ts",
        "playwright.config.ts",
        "build-budget.json",
        "AGENTS.md",
        "README.md",
        "framework.lock",
        "scaffold.json",
        "project-plan.json",
        ".env.example",
        "index.html",
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

export function usageError(message: string, usage: string): never {
  console.error(`${message}\n\n${usage}`);
  process.exit(1);
}
const npmHint =
  "\n通过 npm 运行时，参数要写在 -- 后面，例如 npm run check -- --module 包名。";

export function parseArgs(
  usage: string,
  spec: { flags?: string[]; options?: string[]; positionals?: number },
  argv = process.argv.slice(2),
) {
  const flagNames = spec.flags ?? [];
  const optionNames = spec.options ?? [];
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage);
    process.exit(0);
  }
  const eaten = [...flagNames, ...optionNames].filter(
    (name) =>
      process.env[`npm_config_${name.slice(2).replaceAll("-", "_")}`] ===
      "true",
  );
  if (eaten.length)
    usageError(
      `${eaten.join("、")} 被 npm 当成了它自己的参数${npmHint}`,
      usage,
    );
  const flags = new Set<string>();
  const options = new Map<string, string>();
  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]!;
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }
    const equal = token.indexOf("=");
    const name = equal < 0 ? token : token.slice(0, equal);
    if (flagNames.includes(name) && equal < 0) flags.add(name);
    else if (optionNames.includes(name)) {
      const value = (
        equal < 0 ? argv[++index] : token.slice(equal + 1)
      )?.trim();
      if (!value || value.startsWith("--"))
        usageError(`${name} 后面要写值`, usage);
      if (options.has(name)) usageError(`${name} 只能写一次`, usage);
      options.set(name, value);
    } else usageError(`不认识的参数 ${token}${npmHint}`, usage);
  }
  const allowed = spec.positionals ?? 0;
  if (positionals.length > allowed)
    usageError(
      `多余的参数 ${positionals.slice(allowed).join(" ")}${npmHint}`,
      usage,
    );
  return { flags, options, positionals };
}
