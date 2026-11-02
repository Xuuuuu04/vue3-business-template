import { afterEach, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { SpawnSyncReturns } from "node:child_process";
import {
  checkedModelOutput,
  checkModelSources,
  checkModelInputs,
  checkModelTool,
  symbolHash,
  type ModelManifest,
} from "../../tools/verify-state-model";

import { fingerprint } from "../../tools/lib";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true });
});
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "verify-state-test-"));
  folders.push(root);
  mkdirSync(resolve(root, "src"));
  const code = "export function createTask() { return 1; }";
  writeFileSync(resolve(root, "src/task.ts"), code);
  const manifest: ModelManifest = {
    tool: {
      version: "pinned",
      sha256: createHash("sha256").update("tool").digest("hex"),
      download: "https://example.test/tool.jar",
    },
    reviewedAt: "2026-11-02",
    scope: "fixture",
    models: [
      { id: "LatestQuery", scope: "fixture", invariant: "NoStaleCompletion" },
    ],
    sources: [
      {
        file: "src/task.ts",
        symbol: "createTask",
        sha256: symbolHash(code, "createTask"),
        actions: ["Start"],
      },
    ],
  };
  return { root, manifest };
}
function result(status: number, stdout: string): SpawnSyncReturns<string> {
  return { status, stdout, stderr: "", pid: 0, signal: null, output: [] };
}

test("对应函数变化或删除会要求重新核对模型，其他函数不制造漂移", () => {
  const { root, manifest } = fixture();
  expect(() => checkModelSources(root, manifest)).not.toThrow();
  writeFileSync(
    resolve(root, "src/task.ts"),
    "export function createTask() { return 1; }\nfunction unrelated() {}",
  );
  expect(() => checkModelSources(root, manifest)).not.toThrow();
  writeFileSync(
    resolve(root, "src/task.ts"),
    "export function createTask() { return 2; }",
  );
  expect(() => checkModelSources(root, manifest)).toThrow("已变化");
  writeFileSync(resolve(root, "src/task.ts"), "export function renamed() {}");
  expect(() => checkModelSources(root, manifest)).toThrow("找不到");
});

test("工具必须匹配固定摘要，失败时不尝试下载", () => {
  const { root, manifest } = fixture();
  const jar = resolve(root, "tool.jar");
  writeFileSync(jar, "tool");
  expect(() => checkModelTool(jar, manifest)).not.toThrow();
  writeFileSync(jar, "different");
  expect(() => checkModelTool(jar, manifest)).toThrow("摘要不符");
});

test("错误模型必须以指定不变量反例失败，语法错误或普通退出不算成功", () => {
  expect(() =>
    checkedModelOutput(
      result(12, "Invariant NoStaleCompletion is violated."),
      true,
    ),
  ).not.toThrow();
  expect(() =>
    checkedModelOutput(
      result(0, "Model checking completed. No error has been found."),
      true,
    ),
  ).toThrow();
  expect(() =>
    checkedModelOutput(
      result(75, "Invariant NoStaleCompletion is violated."),
      true,
    ),
  ).toThrow();
  expect(() =>
    checkedModelOutput(result(12, "Invariant TypeOK is violated."), true),
  ).toThrow();
});

test("正常模型既需要成功退出也需要检查完成，启动失败明确抛错", () => {
  expect(() =>
    checkedModelOutput(
      result(
        0,
        "Model checking completed. No error has been found.\n32 distinct states found",
      ),
      false,
    ),
  ).not.toThrow();
  expect(() => checkedModelOutput(result(0, "started"), false)).toThrow();
  expect(() =>
    checkedModelOutput(
      { ...result(1, ""), error: new Error("java missing") },
      false,
    ),
  ).toThrow("java missing");
});

test("新增提交模型只接受自身不变量，不能拿查询反例冒充提交验证", () => {
  expect(() =>
    checkedModelOutput(
      result(12, "Invariant NoUnknownResend is violated."),
      true,
      "NoUnknownResend",
    ),
  ).not.toThrow();
  expect(() =>
    checkedModelOutput(
      result(12, "Invariant NoStaleCompletion is violated."),
      true,
      "NoUnknownResend",
    ),
  ).toThrow();
  expect(() =>
    checkedModelOutput(
      result(12, "Invariant PartialFailureWitnessAbsent is violated."),
      true,
      "PartialFailureWitnessAbsent",
    ),
  ).not.toThrow();
});

test.each(["manifest.json", "LatestQuery.tla", "LatestQuery.cfg"])(
  "检查期间 %s 变化不能仍宣称通过",
  (file) => {
    const { root } = fixture();
    mkdirSync(resolve(root, "tests/formal"), { recursive: true });
    const path = resolve(root, "tests/formal", file);
    writeFileSync(path, "original");
    const initial = fingerprint(root);
    expect(() => checkModelInputs(root, initial)).not.toThrow();
    writeFileSync(path, "changed");
    expect(() => checkModelInputs(root, initial)).toThrow("输入发生变化");
  },
);
