import { afterEach, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { inspectRuleLinks } from "../../tools/inspect-rules";
import { lockData } from "../../tools/framework-lock";
import { inspectModule } from "../../tools/inspect";
import { z } from "zod";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const parent = mkdtempSync(join(tmpdir(), "vue-rule-links-"));
  roots.push(parent);
  const root = join(parent, "product");
  mkdirSync(join(root, "doc/orders"), { recursive: true });
  return { root, parent };
}
function write(root: string, path: string, text = "") {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
function moduleWith(rule = "R-01") {
  return {
    name: "orders",
    actions: [{ steps: [{ id: "orders.create", rule }] }],
  };
}
function rules(
  root: string,
  mapping = "`src/modules/orders/tests/create.test.ts`",
) {
  write(
    root,
    "doc/orders/rules.md",
    `# 订单规则\n\n- R-01：确认后保存一次。\n\n## 验证位置\n\n| 规则 | 测试路径 |\n| --- | --- |\n| R-01 | ${mapping} |\n`,
  );
}

test("步骤、规则和存在的测试文件连通，只检查路径、不执行测试", () => {
  const { root } = fixture();
  rules(root);
  write(
    root,
    "src/modules/orders/tests/create.test.ts",
    'throw new Error("不应执行");',
  );
  expect(inspectRuleLinks(root, moduleWith())).toEqual([]);
});

test("未知步骤规则与缺少规则文档明确失败", () => {
  const { root } = fixture();
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "无法读取业务规则",
  );
  rules(root);
  expect(inspectRuleLinks(root, moduleWith("R-02")).join("\n")).toContain(
    "R-02 未在",
  );
});

test("编号按完整值匹配，R-010 不会替代 R-01", () => {
  const { root } = fixture();
  rules(root);
  write(root, "src/modules/orders/tests/create.test.ts");
  const path = join(root, "doc/orders/rules.md");
  writeFileSync(path, readFileSync(path, "utf8").replaceAll("R-01", "R-010"));
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "R-01 未在",
  );
  expect(inspectRuleLinks(root, moduleWith("R-010"))).toEqual([]);
});

test("规则存在但验证表漏映射、漏文件或非测试文件均失败", () => {
  const { root } = fixture();
  write(root, "doc/orders/rules.md", "R-01：确认后保存一次。\n");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "缺少验证位置",
  );
  rules(root);
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "测试文件不存在",
  );
  rules(root, "`src/modules/orders/flow.ts`");
  write(root, "src/modules/orders/flow.ts");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "必须引用测试文件",
  );
});

test("映射须有反引号中的完整路径，不能只列文字或文件简称", () => {
  const { root } = fixture();
  rules(root, "人工确认");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "需要写在反引号中",
  );
  rules(root, "`create.test.ts`");
  write(root, "src/modules/orders/tests/create.test.ts");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "测试文件不存在",
  );
});

test.each([
  "../outside.test.ts",
  "/outside.test.ts",
  "tests/../outside.test.ts",
  "C:\\outside.test.ts",
])("验证路径 %s 不得越界或使用含糊路径", (path) => {
  const { root, parent } = fixture();
  write(parent, "outside.test.ts");
  rules(root, `\`${path}\``);
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "路径不安全",
  );
});

test("验证文件是符号链接时拒绝，不能指向项目外", () => {
  const { root, parent } = fixture();
  write(parent, "outside.test.ts");
  mkdirSync(join(root, "tests"));
  symlinkSync(
    join(parent, "outside.test.ts"),
    join(root, "tests/outside.test.ts"),
  );
  rules(root, "`tests/outside.test.ts`");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "不处理链接",
  );
});

test.each(["R-01 至 R-02", "R-01、R-02"])(
  "验证表编号 %s 被拒绝，每条规则须独占一行",
  (ids) => {
    const { root } = fixture();
    write(root, "tests/create.test.ts");
    rules(root, "`tests/create.test.ts`");
    const path = join(root, "doc/orders/rules.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace("| R-01 |", `| ${ids} |`),
    );
    expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
      "每行填写一个完整规则编号",
    );
  },
);

test("规则声明不能重复，代码块中的样例不算业务声明", () => {
  const { root } = fixture();
  rules(root, "`tests/create.test.ts`");
  write(root, "tests/create.test.ts");
  const path = join(root, "doc/orders/rules.md");
  const text = readFileSync(path, "utf8");
  writeFileSync(path, text + "\nR-01：重复。\n");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain("重复声明");
  writeFileSync(
    path,
    text.replace("- R-01：确认后保存一次。", "```text\nR-01：仅为例子。\n```"),
  );
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain("未在");
});

test("未被步骤引用的规则不强制映射，已给的映射仍检查路径", () => {
  const { root } = fixture();
  rules(root, "`tests/create.test.ts`");
  write(root, "tests/create.test.ts");
  const path = join(root, "doc/orders/rules.md");
  let text = readFileSync(path, "utf8").replace(
    "## 验证位置",
    "R-02：显示提示。\n\n## 验证位置",
  );
  writeFileSync(path, text);
  expect(inspectRuleLinks(root, moduleWith())).toEqual([]);
  writeFileSync(path, text + "| R-02 | `tests/missing.test.ts` |\n");
  expect(inspectRuleLinks(root, moduleWith()).join("\n")).toContain(
    "R-02：验证位置的测试文件不存在",
  );
});

test("模块默认结构检查实际执行规则追踪", () => {
  const { root } = fixture();
  rules(root, "`tests/create.test.ts`");
  write(root, "tests/create.test.ts");
  const module = {
    name: "orders",
    title: "订单",
    description: "测试",
    dependsOn: [],
    files: [],
    endpoints: [],
    pages: [],
    actions: [
      {
        id: "orders.create",
        title: "保存",
        permission: "public",
        input: z.object({}),
        inputFields: [],
        result: "result",
        fields: { result: { title: "结果", schema: z.string() } },
        steps: [
          {
            id: "orders.create",
            title: "保存",
            rule: "R-99",
            reads: [],
            writes: ["result"],
            uses: [],
            run() {},
          },
        ],
      },
    ],
  };
  expect(inspectModule(root, module, {}).join("\n")).toContain(
    "业务规则 R-99 未在",
  );
  module.actions[0]!.steps[0]!.rule = "R-01";
  expect(inspectModule(root, module, {})).toEqual([]);
});

test("生成器写入 R-00 与实际生成的测试文件映射", () => {
  const { root } = fixture();
  cpSync(resolve("tools"), join(root, "tools"), { recursive: true });
  cpSync(resolve("package.json"), join(root, "package.json"));
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
  write(
    root,
    "src/app/catalog.ts",
    "import type { Module } from '@/shared/public';\nexport const modules:Module[]=[];\n",
  );
  write(root, "scaffold.json", JSON.stringify({ version: 1, modules: {} }));
  write(root, "framework.lock", JSON.stringify(lockData(root)));
  execFileSync(
    process.execPath,
    [
      "--import",
      import.meta.resolve("tsx"),
      join(root, "tools/new-module.ts"),
      "contacts",
      "--title",
      "联系人",
    ],
    { cwd: root, stdio: "pipe", timeout: 10000 },
  );
  const document = readFileSync(join(root, "doc/contacts/rules.md"), "utf8");
  expect(document).toContain(
    "| R-00 | `src/modules/contacts/tests/behavior.test.ts` |",
  );
  expect(
    existsSync(join(root, "src/modules/contacts/tests/behavior.test.ts")),
  ).toBe(true);
  expect(
    inspectRuleLinks(root, {
      name: "contacts",
      actions: [{ steps: [{ id: "contacts.prepare", rule: "R-00" }] }],
    }),
  ).toEqual([]);
});
