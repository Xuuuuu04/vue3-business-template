import { spawnSync } from "node:child_process";
import { sourceFingerprint } from "./lib";

export function readTemplateSource(root = process.cwd()) {
  function git(args: string[]) {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.error || result.signal)
      throw new Error("无法读取模板来源：Git 没有正常运行");
    return result;
  }
  const head = git(["rev-parse", "--verify", "HEAD"]);
  if (head.status !== 0 && head.status !== 128)
    throw new Error("无法读取模板来源提交");
  const commit = head.status === 0 ? head.stdout.trim() : "uncommitted";
  const status =
    head.status === 0 ? git(["status", "--porcelain", "--", "."]) : undefined;
  if (status && status.status !== 0)
    throw new Error("无法读取模板未提交的改动");
  const dirty = status ? status.stdout.length > 0 : true;
  return { commit, dirty, sourceFingerprint: sourceFingerprint(root) };
}
