import { format } from "prettier";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { verifyLock } from "./framework-lock";
export interface Registry {
  version: 1;
  modules: Record<string, { files: string[]; generator: string }>;
}
export function registry(): Registry {
  return existsSync("scaffold.json")
    ? JSON.parse(readFileSync("scaffold.json", "utf8"))
    : { version: 1, modules: {} };
}
export function assertFramework() {
  const errors = verifyLock();
  if (errors.length) throw new Error(errors.join("\n"));
}
export function saveRegistry(data: Registry) {
  const content = JSON.stringify(data, null, 2) + "\n";
  writeFileSync("scaffold.json", content);
  const lock = JSON.parse(readFileSync("framework.lock", "utf8")) as Record<
    string,
    string
  >;
  lock["scaffold.json"] = createHash("sha256").update(content).digest("hex");
  writeFileSync("framework.lock", JSON.stringify(lock, null, 2) + "\n");
}
export function nameOf(value: string | undefined) {
  if (!value || !/^[a-z][a-z0-9_]{1,40}$/.test(value))
    throw new Error("名称使用 2—41 个小写字母、数字或下划线，以字母开头");
  if (
    new Set([
      "class",
      "default",
      "const",
      "import",
      "export",
      "extends",
      "function",
      "var",
      "let",
      "new",
      "return",
      "null",
      "true",
      "false",
      "delete",
      "void",
      "while",
      "for",
      "with",
      "await",
      "enum",
      "package",
      "private",
      "public",
      "implements",
      "interface",
      "constructor",
      "prototype",
    ]).has(value)
  )
    throw new Error("名称不能使用语言保留字");
  return value;
}
export function htmlTitle(value: string) {
  return value.replace(
    /[&"<>]/g,
    (part) =>
      ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[part]!,
  );
}

export async function formatSource(file: string, content: string) {
  return /\.(ts|vue|json)$/.test(file)
    ? format(content, { filepath: file })
    : content;
}
