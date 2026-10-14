/** 日常命令写错参数时直接报错；impact 在仓库子目录和没有 Git 的目录里给出正确结果或中文提示。 */
import { expect, test } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile, execFileSync } from "node:child_process";

interface Outcome {
  status: number;
  stdout: string;
  stderr: string;
}
/** 并行启动命令，返回退出码和输出；失败不抛出，由用例判断。 */
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
        // 在别的目录运行模板工具时，@/ 路径仍按模板的 tsconfig 解析。
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
    // npm run project --module orders：npm 吃掉 --module，只把 orders 传给工具。
    [
      "tools/project.ts",
      [],
      { npm_config_module: "true" },
      "--module 被 npm 当成了它自己的参数",
    ],
    ["tools/check.ts", ["--modul", "orders"], {}, "不认识的参数 --modul"],
    ["tools/impact.ts", ["--base"], {}, "--base 后面要写值"],
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
