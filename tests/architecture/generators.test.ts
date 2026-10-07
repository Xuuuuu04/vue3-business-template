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
import { createHash } from "node:crypto";
import { parse } from "@vue/compiler-sfc";
import { baseParse, NodeTypes } from "@vue/compiler-dom";
import { lockData } from "../../tools/framework-lock";
function clone() {
  const root = mkdtempSync(join(tmpdir(), "vue-generator-"));
  for (const name of [
    "src",
    "tools",
    "tests",
    "doc",
    "design",
    "deploy",
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
/** 比较完整隔离副本，参数错误不能修改页面、登记、图或框架记录。 */
function filesSnapshot(root: string) {
  const files: Record<string, string> = {};
  function visit(directory: string) {
    for (const entry of readdirSync(join(root, directory), {
      withFileTypes: true,
    })) {
      const name = join(directory, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile())
        files[name] = createHash("sha256")
          .update(readFileSync(join(root, name)))
          .digest("hex");
    }
  }
  visit("");
  return files;
}
test("页面生成器提供四种单一任务起点，并登记真实组件与传入任务", () => {
  const root = clone();
  try {
    command(root, "tools/new-module.ts", "contacts", "--title", "联系人");
    const task = '查看 "待联系" 对象的资料与下一步';
    const title = '联系人 "资料" & <记录>';
    command(root, "tools/new-part.ts", "page", "contacts", "blank_default");
    for (const layout of ["blank", "list", "form", "detail"])
      command(
        root,
        "tools/new-part.ts",
        "page",
        "contacts",
        `${layout}_page`,
        "--layout",
        layout,
        "--task",
        task,
        "--title",
        title,
      );
    const pages = JSON.parse(
      command(
        root,
        "--input-type=module",
        "--eval",
        "const {default:module}=await import('./src/modules/contacts/module.ts');console.log(JSON.stringify(module.pages));",
      ),
    ) as Array<{
      id: string;
      task: string;
      title: string;
      actions: string[];
      components: string[];
    }>;
    expect(
      pages.find((page) => page.id === "contacts.blank_default")?.task,
    ).toBe("填写此页唯一的用户任务");
    for (const layout of ["blank", "list", "form", "detail"]) {
      const page = pages.find((item) => item.id === `contacts.${layout}_page`)!;
      expect(page.task).toBe(task);
      expect(page.title).toBe(title);
      expect(page.actions).toEqual([]);
      const source = readFileSync(
        join(root, `src/modules/contacts/pages/${layout}_page.vue`),
        "utf8",
      );
      const { descriptor, errors } = parse(source);
      expect(errors).toEqual([]);
      const template = baseParse(descriptor.template!.content);
      const frame = template.children.find(
        (node) => node.type === NodeTypes.ELEMENT,
      );
      expect(frame?.tag).toBe("PageFrame");
      if (!frame) throw new Error("页面缺少主框架");
      expect(
        frame.props.some(
          (prop) =>
            prop.type === NodeTypes.ATTRIBUTE && prop.name === "workspace",
        ),
      ).toBe(true);
      const main = frame.children.find(
        (node) => node.type === NodeTypes.ELEMENT,
      )!;
      expect(main.tag).toBe(layout === "list" ? "DataTable" : "WorkArea");
      expect(page.components).toContain(main.tag);
      if (layout !== "blank")
        expect(
          main.props.some(
            (prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === "fill",
          ),
        ).toBe(true);
      if (layout === "list" || layout === "form")
        expect(
          main.props.some(
            (prop) =>
              prop.type === NodeTypes.ATTRIBUTE &&
              prop.name === (layout === "list" ? "flat" : "form"),
          ),
        ).toBe(true);
    }
    command(root, "tools/export-docs.ts");
    command(root, "tools/check.ts", "--structure");
    execFileSync(resolve("node_modules/.bin/vue-tsc"), ["--noEmit"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30000,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);
test("未知布局与不完整页面参数在写入前失败，隔离副本所有文件保持原样", () => {
  const root = clone();
  try {
    command(root, "tools/new-module.ts", "contacts");
    const before = filesSnapshot(root);
    for (const options of [
      ["--layout", "board"],
      ["--layout=board"],
      ["--layout"],
      ["--layout", "--task", "查看联系人"],
      ["--layout", "list", "--layout", "form"],
      ["--title", "--layout"],
      ["--title"],
      ["--title", "   "],
      ["--title", "历史", "--title", "记录"],
      ["--task"],
      ["--task", "  "],
      ["--task", "查看联系人\n修改账单"],
      ["--task", "查看联系人", "--task", "修改联系人"],
      ["--unknown", "list"],
      ["--layuot", "list"],
      ["unexpected_argument"],
    ]) {
      expect(() =>
        command(
          root,
          "tools/new-part.ts",
          "page",
          "contacts",
          "invalid_page",
          ...options,
        ),
      ).toThrow();
      expect(filesSnapshot(root)).toEqual(before);
    }
    expect(() =>
      command(
        root,
        "tools/new-part.ts",
        "page",
        "contacts",
        "class",
        "--layout",
        "form",
      ),
    ).toThrow();
    expect(filesSnapshot(root)).toEqual(before);
    command(
      root,
      "tools/new-part.ts",
      "page",
      "contacts",
      "history",
      "--layout=detail",
      "--task=查看联系人记录",
    );
    const after = filesSnapshot(root);
    expect(() =>
      command(
        root,
        "tools/new-part.ts",
        "page",
        "contacts",
        "history",
        "--layout",
        "form",
      ),
    ).toThrow();
    expect(filesSnapshot(root)).toEqual(after);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);
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
