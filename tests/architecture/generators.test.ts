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
  readdirSync,
  mkdirSync,
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
  mkdirSync(join(root, ".agents"), { recursive: true });
  cpSync(".agents/skills", join(root, ".agents/skills"), { recursive: true });
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
    execFileSync(resolve("node_modules/.bin/vue-tsc"), ["--noEmit"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30000,
    });
    expect(() => command(root, "tools/new-module.ts", "class")).toThrow();
    expect(existsSync(join(root, "src/modules/class"))).toBe(false);
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
    // 新产品带上项目 Skill，但不带本机的任务与记录。
    expect(existsSync(join(product, ".agents/skills/vue-guide/SKILL.md"))).toBe(
      true,
    );
    expect(readdirSync(join(product, ".agents"))).toEqual(["skills"]);
    expect(
      readFileSync(join(product, "src/generated/graph.json"), "utf8"),
    ).toBe("[]\n");
    symlinkSync(resolve("node_modules"), join(product, "node_modules"), "dir");
    command(product, "tools/export-docs.ts");
    command(product, "tools/check.ts", "--structure");
    const file = "src/shared/ui/theme/tokens.css";
    writeFileSync(
      join(product, file),
      readFileSync(join(product, file), "utf8") + "\n/* 产品修改 */\n",
    );
    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), "utf8") + "\n/* 模板修改 */\n",
    );
    writeFileSync(
      join(root, "framework.lock"),
      JSON.stringify(lockData(root), null, 2) + "\n",
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
test("框架更新先预览，执行时保留业务和产品单独修改", () => {
  const root = clone();
  const parent = mkdtempSync(join(tmpdir(), "vue-update-"));
  const product = join(parent, "product");
  try {
    command(root, "tools/start-project.ts", product);
    symlinkSync(resolve("node_modules"), join(product, "node_modules"), "dir");
    const theme = "src/shared/ui/theme/tokens.css";
    const local = "src/shared/ui/theme/presets.ts";
    const original = readFileSync(join(product, theme), "utf8");
    const changed = original + "\n/* 新版主题 */\n";
    writeFileSync(join(root, theme), changed);
    const customization =
      readFileSync(join(product, local), "utf8") + "\n/* 产品单独修改 */\n";
    writeFileSync(join(product, local), customization);
    writeFileSync(
      join(root, "framework.lock"),
      JSON.stringify(lockData(root), null, 2) + "\n",
    );
    const catalog = readFileSync(join(product, "src/app/catalog.ts"), "utf8");
    command(product, "tools/update-framework.ts", "--source", root);
    expect(readFileSync(join(product, theme), "utf8")).toBe(original);
    command(product, "tools/update-framework.ts", "--source", root, "--apply");
    expect(readFileSync(join(product, theme), "utf8")).toBe(changed);
    expect(readFileSync(join(product, local), "utf8")).toBe(customization);
    expect(readFileSync(join(product, "src/app/catalog.ts"), "utf8")).toBe(
      catalog,
    );
    expect(
      JSON.parse(readFileSync(join(product, ".template/source.json"), "utf8"))
        .sourceFingerprint,
    ).toBeTruthy();
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(parent, { recursive: true, force: true });
  }
}, 60000);
