/** 生成器登记表受到框架保护，业务代理不能靠手改清单接纳任意文件。 */
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
  return value;
}
export function titleOf(args: string[], fallback: string) {
  const position = args.indexOf("--title");
  return position >= 0 ? args[position + 1] || fallback : fallback;
}
