import { expect, test } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { fingerprint } from "../../tools/lib";

interface Outcome {
  status: number;
  stdout: string;
  stderr: string;
}
function command(
  tool: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
): Promise<Outcome> {
  return new Promise((done) => {
    execFile(
      process.execPath,
      ["--import", "tsx", resolve(tool), ...args],
      {
        cwd: options.cwd ?? process.cwd(),
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: resolve("tsconfig.json"),
          ...options.env,
        },
        encoding: "utf8",
        timeout: 30000,
      },
      (error, stdout, stderr) =>
        done({
          status: error ? Number(error.code ?? 1) : 0,
          stdout,
          stderr,
        }),
    );
  });
}

test("参数写错、少写 -- 或缺值时报中文错误，不带 Node 堆栈；--help 打印用法", async () => {
  const cases: Array<[string, string[], Record<string, string>, string]> = [
    ["tools/project.ts", ["--modul", "orders"], {}, "不认识的参数 --modul"],
    ["tools/project.ts", ["orders"], {}, "多余的参数 orders"],
    ["tools/project.ts", ["--module"], {}, "--module 后面要写值"],
    [
      "tools/project.ts",
      [],
      { npm_config_module: "true" },
      "--module 被 npm 当成了它自己的参数",
    ],
    ["tools/check.ts", ["--modul", "orders"], {}, "不认识的参数 --modul"],
    ["tools/impact.ts", ["--base"], {}, "--base 后面要写值"],
    ["tools/update-framework.ts", ["--source"], {}, "--source 后面要写值"],
    ["tools/update-framework.ts", ["--apply"], {}, "缺少 --source"],
    ["tools/update-framework.ts", ["--aply"], {}, "不认识的参数 --aply"],
    ["tools/export-docs.ts", ["--chek"], {}, "不认识的参数 --chek"],
    ["tools/framework-lock.ts", ["--unknown"], {}, "不认识的参数 --unknown"],
    ["tools/browser-check.ts", ["--unknown"], {}, "不认识的参数 --unknown"],
    ["tools/runs.ts", ["--run", "x"], {}, "缺少 --file"],
    [
      "tools/api.ts",
      ["chek", "--openapi", "openapi.json"],
      {},
      "不认识的子命令 chek",
    ],
  ];
  const results = await Promise.all(
    cases.map(([tool, args, env]) => command(tool, args, { env })),
  );
  results.forEach((result, index) => {
    const [tool, , , message] = cases[index]!;
    expect(result.status, tool).toBe(1);
    expect(result.stderr).toContain(message);
    expect(result.stderr).toContain("用法：npm run");
    expect(result.stderr).not.toMatch(/\n\s+at |Node\.js v/);
  });
  const help = await command("tools/project.ts", ["--help"]);
  expect(help.status).toBe(0);
  expect(help.stdout).toContain("用法：npm run project");
}, 60000);

test("impact 在仓库子目录里按当前目录换算路径，不在 Git 仓库时给出中文提示", async () => {
  const root = mkdtempSync(join(tmpdir(), "vue-impact-"));
  const outside = mkdtempSync(join(tmpdir(), "vue-impact-plain-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (file: string, text: string) => {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), text);
  };
  try {
    write(".gitignore", "node_modules\n");
    write("web/src/modules/orders/data.ts", "export {};\n");
    write("web/src/shared/ui/README.md", "# 界面\n");
    write("server/app.py", "pass\n");
    symlinkSync(resolve("node_modules"), join(root, "web/node_modules"), "dir");
    git("init", "-q");
    git("add", ".");
    git(
      "-c",
      "user.name=检查",
      "-c",
      "user.email=check@example.com",
      "commit",
      "-q",
      "-m",
      "初始",
    );
    write("web/src/modules/orders/data.ts", "export const changed = 1;\n");
    write("server/app.py", "print(1)\n");
    const business = await command("tools/impact.ts", [], {
      cwd: join(root, "web"),
    });
    expect(business.stderr).toBe("");
    const report = JSON.parse(business.stdout);
    expect(report.changed).toEqual(["src/modules/orders/data.ts"]);
    expect(report.framework).toBe(false);
    expect(report.modules).toContain("orders");
    expect(report.commands).toContain("npm run check -- --module orders");
    write("web/src/shared/ui/README.md", "# 界面说明\n");
    const shared = JSON.parse(
      (await command("tools/impact.ts", [], { cwd: join(root, "web") })).stdout,
    );
    expect(shared.framework).toBe(true);
    expect(shared.commands).toEqual(["npm run check"]);
    symlinkSync(resolve("node_modules"), join(outside, "node_modules"), "dir");
    const plain = await command("tools/impact.ts", [], { cwd: outside });
    expect(plain.status).toBe(1);
    expect(plain.stderr).toContain("不在 Git 仓库里");
    expect(plain.stderr).not.toContain("usage: git");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
}, 60000);

test("project 分开显示整仓和单包记录，单包通过不能代替整仓检查", async () => {
  const root = mkdtempSync(join(tmpdir(), "vue-records-"));
  try {
    symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
    mkdirSync(join(root, "var/checks"), { recursive: true });
    const save = (file: string, record: Record<string, unknown>) =>
      writeFileSync(join(root, "var/checks", file), JSON.stringify(record));
    save("full.json", {
      fingerprint: "旧代码",
      scope: "全部框架和业务包",
      status: "本轮尚未通过",
    });
    save("module-orders.json", {
      fingerprint: fingerprint(root),
      scope: "orders",
      status: "通过",
    });
    const output = await command("tools/project.ts", ["--json"], { cwd: root });
    const checks = JSON.parse(output.stdout).checks;
    expect(checks.full.status).toBe(
      "代码已改变，旧检查过期（当时本轮尚未通过）",
    );
    expect(checks.full.note).toContain("没有当前的整仓检查记录");
    expect(checks.modules.orders.status).toBe("通过");
    const text = await command("tools/project.ts", [], { cwd: root });
    expect(text.stdout).toContain("单包检查：orders 通过");
    expect(text.stdout).toContain("没有当前的整仓检查记录");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);

test("impact 把公共配置、依赖和检查的改动列入完整检查", async () => {
  const root = mkdtempSync(join(tmpdir(), "vue-impact-config-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    writeFileSync(join(root, ".gitignore"), "node_modules\n");
    symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
    git("init", "-q");
    git("add", ".gitignore");
    git(
      "-c",
      "user.name=检查",
      "-c",
      "user.email=check@example.com",
      "commit",
      "-qm",
      "初始",
    );
    for (const name of [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "vitest.config.ts",
      "playwright.config.ts",
      "tests/framework/中文检查.test.ts",
      ".github/workflows/check.yml",
      "src/app/login.config.ts",
    ]) {
      const file = join(root, name);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, "{}");
      const result = await command("tools/impact.ts", [], { cwd: root });
      expect(result.status, name).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report.changed, name).toContain(name);
      expect(report.framework, name).toBe(true);
      expect(report.commands, name).toEqual(["npm run check"]);
      rmSync(file);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 60000);

test("浏览器预检查失败会替换旧成功记录，并清除旧测试统计", async () => {
  const root = mkdtempSync(join(tmpdir(), "vue-browser-record-"));
  try {
    symlinkSync(resolve("node_modules"), join(root, "node_modules"), "dir");
    mkdirSync(join(root, "tools"));
    mkdirSync(join(root, "var/checks"), { recursive: true });
    writeFileSync(join(root, "tools/check.ts"), "process.exit(1);\n");
    writeFileSync(
      join(root, "var/checks/browser.json"),
      JSON.stringify({
        fingerprint: fingerprint(root),
        status: "通过",
        stats: { expected: 20 },
      }),
    );
    const oldReport = join(root, "var/checks/browser-tests.json");
    writeFileSync(oldReport, JSON.stringify({ stats: { expected: 20 } }));
    const result = await command("tools/browser-check.ts", [], { cwd: root });
    expect(result.status).toBe(1);
    const record = JSON.parse(
      readFileSync(join(root, "var/checks/browser.json"), "utf8"),
    );
    expect(record.status).toBe("失败");
    expect(record.fingerprint).toBe(fingerprint(root));
    expect(record.error).toContain("tools/check.ts --structure");
    expect(record.stats).toBeUndefined();
    expect(existsSync(oldReport)).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
