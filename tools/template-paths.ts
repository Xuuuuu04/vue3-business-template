import { lstatSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function safeTemplatePath(root: string, name: string): string {
  const parts = name.split("/");
  if (
    !name ||
    isAbsolute(name) ||
    name.includes("\\") ||
    parts.some((part) => !part || part === "." || part === "..")
  )
    throw new Error(`模板文件路径不安全：${name}`);
  let path = resolve(root);
  for (const part of ["", ...parts]) {
    if (part) path = resolve(path, part);
    try {
      if (lstatSync(path).isSymbolicLink())
        throw new Error(`模板工具不处理链接：${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return path;
}
