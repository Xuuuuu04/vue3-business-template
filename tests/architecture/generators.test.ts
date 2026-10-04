/** 在隔离副本中实际生成开发包、检查和执行，并验证更新冲突不写文件。 */
import { expect, test } from "vitest";
import {
  mkdtempSync,
  cpSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { lockData } from "../../tools/framework-lock";
function clone() {
  const root = mkdtempSync(join(tmpdir(), "vue-generator-"));
  for (const name of [
    "src",
    "tools",
    "tests",
    "doc",
    "design",
    "package.json",
    "tsconfig.json",
    "vitest.config.ts",
    "vite.config.ts",
    "framework.lock",
    "scaffold.json",
  ])
    if (existsSync(name)) cpSync(name, join(root, name), { recursive: true });
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
  writeFileSync(
    join(root, "framework.lock"),
    JSON.stringify(lockData(root), null, 2) + "\n",
  );
  return root;
}
function command(root: string, ...args: string[]) {
  return execFileSync(process.execPath, ["--import", "tsx", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 30000,
  });
}
test("生成器产生真实可执行的开发包，重复名称不覆盖", () => {
  const root = clone();
  try {
    command(root, "tools/new-module.ts", "contacts", "--title", "联系人");
    expect(
      existsSync(join(root, "src/modules/contacts/steps/prepare.ts")),
    ).toBe(true);
    command(root, "tools/export-docs.ts");
    command(root, "tools/check.ts", "--structure");
    const output = execFileSync(
      resolve("node_modules/.bin/vitest"),
      ["run", "src/modules/contacts/tests/behavior.test.ts"],
      { cwd: root, encoding: "utf8", timeout: 30000 },
    );
    expect(output).toContain("1 passed");
    const before = readFileSync(
      join(root, "src/modules/contacts/data.ts"),
      "utf8",
    );
    expect(() => command(root, "tools/new-module.ts", "contacts")).toThrow();
    expect(
      readFileSync(join(root, "src/modules/contacts/data.ts"), "utf8"),
    ).toBe(before);
    command(
      root,
      "tools/new-part.ts",
      "page",
      "contacts",
      "history",
      "--title",
      "历史",
    );
    command(root, "tools/export-docs.ts");
    command(root, "tools/check.ts", "--structure");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);
test("产品初始化清理样板业务，框架三份比较遇到冲突不写入", () => {
  const root = clone();
  const parent = mkdtempSync(join(tmpdir(), "vue-product-"));
  const product = join(parent, "product");
  try {
    command(root, "tools/start-project.ts", product);
    expect(existsSync(join(product, "src/modules/file_library"))).toBe(false);
    expect(
      readFileSync(join(product, "src/generated/graph.json"), "utf8"),
    ).toBe("[]\n");
    symlinkSync(resolve("node_modules"), join(product, "node_modules"), "dir");
    command(product, "tools/export-docs.ts");
    command(product, "tools/check.ts", "--structure");
    const file = "src/shared/theme/tokens.css";
    writeFileSync(
      join(product, file),
      readFileSync(join(product, file), "utf8") + "\n/* 产品修改 */\n",
    );
    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), "utf8") + "\n/* 模板修改 */\n",
    );
    const before = readFileSync(join(product, file), "utf8");
    expect(() =>
      command(
        product,
        "tools/update-framework.ts",
        "--source",
        root,
        "--apply",
      ),
    ).toThrow();
    expect(readFileSync(join(product, file), "utf8")).toBe(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
}, 60000);
