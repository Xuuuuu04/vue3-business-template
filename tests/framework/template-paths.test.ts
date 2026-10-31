import { afterEach, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lockData } from "../../tools/framework-lock";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "vue-template-paths-"));
  roots.push(root);
  const source = join(root, "source"),
    product = join(root, "product"),
    outside = join(root, "outside.txt");
  mkdirSync(join(source, "deploy"), { recursive: true });
  mkdirSync(join(product, "deploy"), { recursive: true });
  mkdirSync(join(product, ".template"), { recursive: true });
  writeFileSync(outside, "outside");
  writeFileSync(join(source, "deploy/nginx.conf"), "new");
  writeFileSync(join(product, "deploy/nginx.conf"), "old");
  writeFileSync(
    join(product, ".template/base.json"),
    JSON.stringify({ "deploy/nginx.conf": "old" }),
  );
  writeFileSync(
    join(source, "framework.lock"),
    JSON.stringify(lockData(source)),
  );
  return { root, source, product, outside };
}
function update(source: string, product: string, apply = true) {
  return execFileSync(
    process.execPath,
    [
      "--import",
      import.meta.resolve("tsx"),
      resolve("tools/update-framework.ts"),
      "--source",
      source,
      ...(apply ? ["--apply"] : []),
    ],
    { cwd: product, encoding: "utf8", stdio: "pipe", timeout: 10000 },
  );
}
test.each([
  "../outside.txt",
  "absolute",
  "src/modules/private.ts",
  "src/app/app.config.ts",
])("旧清单里的 %s 不参与更新且没有先写入正常文件", (kind) => {
  const f = fixture();
  const name = kind === "absolute" ? f.outside : kind;
  writeFileSync(
    join(f.product, ".template/base.json"),
    JSON.stringify({ "deploy/nginx.conf": "old", [name]: "outside" }),
  );
  expect(() => update(f.source, f.product)).toThrow();
  expect(readFileSync(f.outside, "utf8")).toBe("outside");
  expect(readFileSync(join(f.product, "deploy/nginx.conf"), "utf8")).toBe(
    "old",
  );
});
test.each([
  "target-file",
  "target-parent",
  "metadata",
  "source-file",
  "source-parent",
])("%s 链接在预览和执行前都被拒绝", (kind) => {
  const f = fixture();
  const remove = (path: string) =>
    rmSync(path, { recursive: true, force: true });
  if (kind === "target-file") {
    remove(join(f.product, "deploy/nginx.conf"));
    symlinkSync(f.outside, join(f.product, "deploy/nginx.conf"));
  } else if (kind === "metadata") {
    remove(join(f.product, ".template/base.json"));
    symlinkSync(f.outside, join(f.product, ".template/base.json"));
  } else if (kind === "source-file") {
    remove(join(f.source, "deploy/nginx.conf"));
    symlinkSync(f.outside, join(f.source, "deploy/nginx.conf"));
  } else {
    const target = kind === "target-parent" ? f.product : f.source;
    remove(join(target, "deploy"));
    symlinkSync(f.root, join(target, "deploy"), "dir");
  }
  expect(() => update(f.source, f.product, false)).toThrow(/链接/);
  expect(() => update(f.source, f.product)).toThrow(/链接/);
  expect(readFileSync(f.outside, "utf8")).toBe("outside");
  expect(existsSync(join(f.product, ".template/source.json"))).toBe(false);
});
test("正常更新仍写入框架并保留产品文件", () => {
  const f = fixture();
  mkdirSync(join(f.product, "src/app"), { recursive: true });
  writeFileSync(join(f.product, "src/app/app.config.ts"), "product-brand");
  update(f.source, f.product);
  expect(readFileSync(join(f.product, "deploy/nginx.conf"), "utf8")).toBe(
    "new",
  );
  expect(readFileSync(join(f.product, "src/app/app.config.ts"), "utf8")).toBe(
    "product-brand",
  );
});

test("更新来源使用新版提交，并明确记录未提交的改动", () => {
  const f = fixture();
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: f.source,
      encoding: "utf8",
      stdio: "pipe",
    });
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=检查",
    "-c",
    "user.email=check@example.com",
    "commit",
    "-qm",
    "模板",
  );
  const commit = git("rev-parse", "HEAD").trim();
  const metadata = join(f.product, ".template/source.json");
  writeFileSync(
    metadata,
    JSON.stringify({ commit: "旧版本", createdAt: "创建日期" }),
  );
  update(f.source, f.product);
  let saved = JSON.parse(readFileSync(metadata, "utf8"));
  expect(saved).toMatchObject({ commit, dirty: false, createdAt: "创建日期" });
  expect(saved.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  writeFileSync(join(f.source, "deploy/nginx.conf"), "next");
  writeFileSync(
    join(f.source, "framework.lock"),
    JSON.stringify(lockData(f.source)),
  );
  update(f.source, f.product);
  saved = JSON.parse(readFileSync(metadata, "utf8"));
  expect(saved).toMatchObject({ commit, dirty: true });
  expect(readFileSync(join(f.product, "deploy/nginx.conf"), "utf8")).toBe(
    "next",
  );
});

test("初始化在复制环境样例链接前失败，不修改来源文件也不创建半成品", () => {
  const f = fixture();
  symlinkSync(f.outside, join(f.source, ".env.example"));
  const target = join(f.root, "new-product");
  expect(() =>
    execFileSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        resolve("tools/start-project.ts"),
        target,
      ],
      { cwd: f.source, encoding: "utf8", stdio: "pipe", timeout: 10000 },
    ),
  ).toThrow(/链接/);
  expect(readFileSync(f.outside, "utf8")).toBe("outside");
  expect(existsSync(target)).toBe(false);
});

test("初始化不能通过祖先目录别名创建模板内部副本", () => {
  const f = fixture();
  const alias = join(f.root, "source-alias");
  symlinkSync(f.source, alias, "dir");
  expect(() =>
    execFileSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        resolve("tools/start-project.ts"),
        join(alias, "copy"),
      ],
      { cwd: f.source, encoding: "utf8", stdio: "pipe", timeout: 10000 },
    ),
  ).toThrow(/本项目之外/);
  expect(existsSync(join(f.source, "copy"))).toBe(false);
});
