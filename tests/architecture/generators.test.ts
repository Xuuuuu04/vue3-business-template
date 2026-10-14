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
import { lockData, unchangedTemplateSource } from "../../tools/framework-lock";
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
    "package-lock.json",
    "AGENTS.md",
    "CLAUDE.md",
    "CHANGELOG.md",
    "README.md",
    "index.html",
    ".env.example",
    "tsconfig.json",
    "vitest.config.ts",
    "vite.config.ts",
    "playwright.config.ts",
    ".github",
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
/** 实际收集用例，不启动浏览器或演示服务；产品必须保留公共用例并去掉样例用例。 */
function browserCases(root: string) {
  interface Suite {
    specs?: Array<{
      title: string;
      file: string;
      tests: Array<{ projectName: string }>;
    }>;
    suites?: Suite[];
  }
  const report = JSON.parse(
    execFileSync(
      resolve("node_modules/.bin/playwright"),
      ["test", "--list", "--reporter=json"],
      { cwd: root, encoding: "utf8", stdio: "pipe", timeout: 30000 },
    ),
  ) as { suites: Suite[] };
  const cases: Array<{ title: string; file: string; project: string }> = [];
  function visit(suite: Suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        cases.push({
          title: spec.title,
          file: spec.file.replaceAll("\\", "/"),
          project: test.projectName,
        });
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites) visit(suite);
  return cases.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}
/** 列出目录下的普通文件（相对路径），不进入链接的 node_modules。 */
function filesBelowRoot(root: string, directory = ""): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const name = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelowRoot(root, name);
    return entry.isFile() ? [name] : [];
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
test("页面生成器提供五种单一任务起点，并登记真实组件与传入任务", () => {
  const root = clone();
  try {
    command(root, "tools/new-module.ts", "contacts", "--title", "联系人");
    const task = '查看 "待联系" 对象的资料与下一步';
    const title = '联系人 "资料" & <记录>';
    command(root, "tools/new-part.ts", "page", "contacts", "blank_default");
    for (const layout of ["blank", "list", "form", "detail", "overview"])
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
    const mainTag: Record<string, string> = {
      blank: "WorkArea",
      list: "DataTable",
      form: "WorkArea",
      detail: "WorkArea",
      overview: "OverviewBoard",
    };
    for (const layout of Object.keys(mainTag)) {
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
      expect(main.tag).toBe(mainTag[layout]);
      expect(page.components).toContain(main.tag);
      if (layout !== "blank" && layout !== "overview")
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
test("new:step 往空步骤数组和已有步骤后追加，import 留在文件头注释之后", () => {
  const root = clone();
  try {
    command(root, "tools/new-module.ts", "orders", "--title", "订单");
    const flowFile = join(root, "src/modules/orders/flow.ts");
    const header = readFileSync(flowFile, "utf8").split("\n")[0]!;
    // 代理先声明一个空动作，再用生成器补步骤；结果字段取输入，空动作本身不会被执行。
    writeFileSync(
      flowFile,
      readFileSync(flowFile, "utf8").replace(
        "export const actions=[prepare];",
        "export const list=defineAction<z.infer<typeof Input>,string>({id:'orders.list',title:'查看订单',input:Input,inputFields:['value'],result:'value',fields:{value:{title:'样板输入',schema:z.string()}},steps:[]});\nexport const actions=[prepare,list];",
      ),
    );
    command(root, "tools/new-part.ts", "step", "orders", "read_page", "--action", "orders.list");
    command(root, "tools/new-part.ts", "step", "orders", "present_page", "--action", "orders.list");
    const flow = readFileSync(flowFile, "utf8");
    expect(flow).toContain("steps:[read_pageStep,present_pageStep]");
    expect(flow).not.toMatch(/\[\s*,/);
    const lines = flow.split("\n");
    expect(lines[0]).toBe(header);
    const imports = lines.flatMap((line, index) => (line.startsWith("import ") ? [index] : []));
    expect(imports.at(-1)! - imports[0]! + 1).toBe(imports.length);
    expect(lines).toContain("import { read_pageStep } from './steps/read_page';");
    command(root, "tools/export-docs.ts");
    command(root, "tools/check.ts", "--structure");
    const graph = JSON.parse(readFileSync(join(root, "src/generated/graph.json"), "utf8")) as Array<{
      actions: Array<{ id: string; steps: Array<{ id: string }> }>;
    }>;
    expect(graph[0]!.actions.find((action) => action.id === "orders.list")!.steps.map((step) => step.id)).toEqual([
      "orders.read_page",
      "orders.present_page",
    ]);
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
    // 只改页面文字：派生指纹由检查自己重写，不要求先跑 docs，重写后 docs --check 也一致。
    const versionFile = join(root, "src/generated/version.json");
    const version = readFileSync(versionFile, "utf8");
    const pageFile = join(root, "src/modules/contacts/pages/MainPage.vue");
    writeFileSync(
      pageFile,
      readFileSync(pageFile, "utf8").replace("验证输入输出", "验证输入"),
    );
    command(root, "tools/check.ts", "--structure");
    expect(readFileSync(versionFile, "utf8")).not.toBe(version);
    command(root, "tools/export-docs.ts", "--check");
    // 步骤函数位置变了，和登记有关的生成内容仍要求运行 docs，并直接说出命令。
    const stepFile = join(root, "src/modules/contacts/steps/prepare.ts");
    writeFileSync(stepFile, "\n" + readFileSync(stepFile, "utf8"));
    let failure = "";
    try {
      command(root, "tools/check.ts", "--structure");
    } catch (error) {
      failure = String((error as { stderr?: string }).stderr);
    }
    expect(failure).toContain("src/generated/sources.json");
    expect(failure).toContain("请运行 npm run docs");
    expect(failure).not.toMatch(/\n\s+at /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);
test("产品初始化清理样板业务，框架三份比较遇到冲突不写入", () => {
  const root = clone();
  const parent = mkdtempSync(join(tmpdir(), "vue-product-"));
  const product = join(parent, "product");
  try {
    const templateCases = browserCases(root);
    const publicCases = templateCases.filter(
      (item) => !item.file.startsWith("demo/"),
    );
    expect(templateCases.some((item) => item.file.startsWith("demo/"))).toBe(
      existsSync(join(root, "tests/browser/demo")),
    );
    expect(publicCases.length).toBeGreaterThan(0);
    const sourceBrand = readFileSync(join(root, "src/app/app.config.ts"), "utf8");
    command(root, "tools/start-project.ts", product, "--name", "客户联系工作台");
    const productBrand = readFileSync(join(product, "src/app/app.config.ts"), "utf8");
    expect(productBrand).toContain('name: "客户联系工作台"');
    expect(productBrand).not.toContain("团队文件，清楚有序");
    expect(productBrand).not.toContain("support@example.com");
    expect(readFileSync(join(root, "src/app/app.config.ts"), "utf8")).toBe(sourceBrand);
    expect(readFileSync(join(product, "index.html"), "utf8")).toContain("<title>客户联系工作台</title>");
    expect(readFileSync(join(product, ".env.example"), "utf8")).toContain("VITE_API_MODE=real");
    expect(readFileSync(join(product, ".env.example"), "utf8")).not.toContain("VITE_ORG_ID=demo-team");
    expect(readFileSync(join(product, "README.md"), "utf8")).toContain("登录与业务接口尚未连接真实后台");
    expect(existsSync(join(product, "src/modules/file_library"))).toBe(false);
    // 新产品用自己的口径：入口、版本记录和包信息都换掉，不带模板设计说明和历史。
    expect(readFileSync(join(product, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
    // 样板名称拼起来写，免得这份测试复制进产品后被自己扫到。
    const sampleName = ["文件", "管理"].join("");
    const agents = readFileSync(join(product, "AGENTS.md"), "utf8");
    expect(agents.startsWith("# 客户联系工作台\n")).toBe(true);
    expect(agents).toContain(".agents/skills/vue-module/SKILL.md");
    expect(agents).not.toContain(sampleName);
    expect(readFileSync(join(product, "CHANGELOG.md"), "utf8")).toMatch(/^# 客户联系工作台：版本记录\n\n## 0\.1\.0\n/);
    expect(existsSync(join(product, "design"))).toBe(false);
    expect(existsSync(join(product, "doc/changes.md"))).toBe(false);
    for (const file of ["package.json", "package-lock.json"]) {
      const data = JSON.parse(readFileSync(join(product, file), "utf8"));
      expect([data.name, data.version]).toEqual(["product", "0.1.0"]);
    }
    expect(JSON.parse(readFileSync(join(product, "package-lock.json"), "utf8")).packages[""].version).toBe("0.1.0");
    // 模板历史里出现过的客户和模型名字，拼起来写，免得这行测试自己被扫到。
    const history = new RegExp(["朝", "聚|Deep", "Seek"].join(""));
    const leftovers = filesBelowRoot(product).filter((name) => history.test(readFileSync(join(product, name), "utf8")));
    expect(leftovers).toEqual([]);
    // 新产品里没有样板业务，说明文字也不能再提它。
    const sample = filesBelowRoot(product).filter(
      (name) => !name.startsWith(".template/") && readFileSync(join(product, name), "utf8").includes(sampleName),
    );
    expect(sample).toEqual([]);
    expect(existsSync(join(product, "tests/browser/demo"))).toBe(false);
    expect(existsSync(join(product, "tests/demo"))).toBe(false);
    expect(existsSync(join(product, "tests/framework/fixtures/file-openapi.ts"))).toBe(true);
    // 新产品带上项目 Skill，但不带本机的任务与记录。
    expect(existsSync(join(product, ".agents/skills/vue-guide/SKILL.md"))).toBe(
      true,
    );
    expect(readdirSync(join(product, ".agents"))).toEqual(["skills"]);
    expect(
      readFileSync(join(product, "src/generated/graph.json"), "utf8"),
    ).toBe("[]\n");
    symlinkSync(resolve("node_modules"), join(product, "node_modules"), "dir");
    expect(browserCases(product)).toEqual(publicCases);
    command(product, "tools/export-docs.ts");
    command(product, "tools/check.ts", "--structure");
    // 新产品框架没改：模板工具自测沿用模板验证；模板仓库自己和改过框架的产品照常运行。
    expect(unchangedTemplateSource(product)).toBeTruthy();
    expect(unchangedTemplateSource(root)).toBeUndefined();
    const file = "src/shared/ui/theme/tokens.css";
    writeFileSync(
      join(product, file),
      readFileSync(join(product, file), "utf8") + "\n/* 产品修改 */\n",
    );
    expect(unchangedTemplateSource(product)).toBeUndefined();
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
