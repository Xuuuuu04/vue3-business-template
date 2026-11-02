import { afterEach, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { build } from "vite";
import type { OutputBundle } from "rolldown";
import {
  inspectBuildBudget,
  parseBuildBudget,
  readBuildBudget,
} from "../../tools/build-budget";
import { buildBudget } from "../../tools/build-budget-plugin";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
const generous = { initialCodeGzipBytes: 100000, assetGzipBytes: 100000 };
function asset(fileName: string, source: string) {
  return { type: "asset", fileName, source } as OutputBundle[string];
}
function chunk(
  fileName: string,
  imports: string[] = [],
  css: string[] = [],
  dynamicImports: string[] = [],
) {
  return {
    type: "chunk",
    fileName,
    code: `console.log(${JSON.stringify(fileName)})`,
    imports,
    dynamicImports,
    viteMetadata: { importedCss: new Set(css), importedAssets: new Set() },
  } as OutputBundle[string];
}
function graph(): OutputBundle {
  return {
    "index.html": asset(
      "index.html",
      '<script type="module" src="/assets/main.js"></script><link rel="modulepreload" href="/assets/shared.js"><link rel="stylesheet" href="/assets/shared.css">',
    ),
    "assets/main.js": chunk(
      "assets/main.js",
      ["assets/shared.js"],
      ["assets/shared.css"],
      ["assets/lazy.js"],
    ),
    "assets/shared.js": chunk("assets/shared.js", ["assets/main.js"]),
    "assets/shared.css": asset("assets/shared.css", "body{color:green}"),
    "assets/lazy.js": chunk("assets/lazy.js", [], ["assets/lazy.css"]),
    "assets/lazy.css": asset("assets/lazy.css", "body{color:blue}"),
  };
}

test("静态依赖、循环和重复 CSS 只计一次，动态导入不计入启动代码", () => {
  const report = inspectBuildBudget(graph(), generous);
  expect(report.pages[0]?.files).toEqual([
    "assets/main.js",
    "assets/shared.css",
    "assets/shared.js",
  ]);
  const initial = report.assets.filter((item) => !item.file.includes("lazy"));
  expect(report.pages[0]?.gzipBytes).toBe(
    initial.reduce((total, item) => total + item.gzipBytes, 0),
  );
  expect(report.errors).toEqual([]);
});

test.each(["js", "css"])("动态导入的 %s 仍受单资产限制", (extension) => {
  const bundle = graph();
  const large = randomBytes(1000).toString("hex");
  const file = `assets/lazy.${extension}`;
  if (extension === "css") bundle[file] = asset(file, large);
  else {
    const item = bundle[file]!;
    if (item.type === "chunk")
      item.code = `export const data=${JSON.stringify(large)};`;
  }
  const report = inspectBuildBudget(bundle, {
    ...generous,
    assetGzipBytes: 100,
  });
  expect(report.errors).toEqual([
    expect.stringContaining(`assets/lazy.${extension} gzip`),
  ]);
});

test("压缩按独立响应求和，预算边界等于通过、超过一字节失败", () => {
  const initial = inspectBuildBudget(graph(), generous).pages[0]!.gzipBytes;
  expect(
    inspectBuildBudget(graph(), { ...generous, initialCodeGzipBytes: initial })
      .errors,
  ).toEqual([]);
  expect(
    inspectBuildBudget(graph(), {
      ...generous,
      initialCodeGzipBytes: initial - 1,
    }).errors,
  ).toEqual([expect.stringContaining(`gzip ${initial} B`)]);
  const shared = graph()["assets/shared.css"]!;
  const length = gzipSync(
    shared.type === "asset" ? shared.source : shared.code,
  ).length;
  const one: OutputBundle = {
    "index.html": asset("index.html", '<link rel="stylesheet" href="/a.css">'),
    "a.css": asset("a.css", "body{color:green}"),
  };
  expect(
    inspectBuildBudget(one, { ...generous, assetGzipBytes: length }).errors,
  ).toEqual([]);
  expect(
    inspectBuildBudget(one, { ...generous, assetGzipBytes: length - 1 }).errors,
  ).toHaveLength(1);
});

test.each([
  ["/work/", "/work/assets/main.js?version=2#x", "index.html"],
  ["./", "../assets/main.js?version=2", "nested/index.html"],
  ["/work/", "/work/assets/main%2Ejs", "index.html"],
  [
    "https://cdn.example/work/",
    "https://cdn.example/work/assets/main.js?x=1",
    "index.html",
  ],
])("构建 base %s 和 HTML 引用 %s 正确归一化", (base, reference, html) => {
  const bundle: OutputBundle = {
    [html]: asset(html, `<script type="module" src="${reference}"></script>`),
    "assets/main.js": chunk("assets/main.js"),
  };
  expect(inspectBuildBudget(bundle, generous, base).pages[0]?.files).toEqual([
    "assets/main.js",
  ]);
});

test("预加载 script/style 被计入，字体预加载与图片不属于代码预算", () => {
  const bundle: OutputBundle = {
    "index.html": asset(
      "index.html",
      '<link rel="preload" as="script" href="/main.js"><link rel="preload" as="style" href="/main.css"><link rel="preload" as="font" href="/font.woff2"><img src="/large.png">',
    ),
    "main.js": chunk("main.js"),
    "main.css": asset("main.css", "body{}"),
  };
  expect(inspectBuildBudget(bundle, generous).pages[0]?.files).toEqual([
    "main.css",
    "main.js",
  ]);
});

test.each(["/missing.js", "https://other.example/code.js", "/outside/main.js"])(
  "未计量的启动引用 %s 不会静默当作零字节",
  (reference) => {
    const bundle: OutputBundle = {
      "index.html": asset("index.html", `<script src="${reference}"></script>`),
    };
    expect(() => inspectBuildBudget(bundle, generous, "/work/")).toThrow();
  },
);

test("多个 HTML 分别核对自己的启动代码，不把独立页面累加", () => {
  const bundle: OutputBundle = {
    "a.html": asset("a.html", '<script src="/a.js"></script>'),
    "b.html": asset("b.html", '<script src="/b.js"></script>'),
    "a.js": chunk("a.js"),
    "b.js": chunk("b.js"),
  };
  const size = inspectBuildBudget(bundle, generous).pages[0]!.gzipBytes;
  expect(
    inspectBuildBudget(bundle, { ...generous, initialCodeGzipBytes: size })
      .errors,
  ).toEqual([]);
});

test.each([
  undefined,
  [],
  {},
  { ...generous, initialCodeGzipBytes: 0 },
  { ...generous, initialCodeGzipBytes: -1 },
  { ...generous, initialCodeGzipBytes: 1.5 },
  { ...generous, assetGzipBytes: "100" },
  { ...generous, assetGzipBytes: Infinity },
  { ...generous, extra: 1 },
])("无效预算 %j 被拒绝", (value) => {
  expect(() => parseBuildBudget(value)).toThrow(/build-budget.json/);
});

test("配置缺失或损坏时明确失败", () => {
  const root = mkdtempSync(join(tmpdir(), "vue-budget-config-"));
  roots.push(root);
  expect(() => readBuildBudget(root)).toThrow(/无法读取资源预算/);
  writeFileSync(join(root, "build-budget.json"), "broken");
  expect(() => readBuildBudget(root)).toThrow(/有效 JSON/);
});

async function fixtureBuild(budget: typeof generous) {
  const root = mkdtempSync(join(tmpdir(), "vue-budget-build-"));
  roots.push(root);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "build-budget.json"), JSON.stringify(budget));
  writeFileSync(
    join(root, "index.html"),
    '<script type="module" src="/src/main.js"></script>',
  );
  writeFileSync(
    join(root, "src/main.js"),
    'import "./main.css";document.body.onclick=()=>import("./lazy.js");',
  );
  writeFileSync(join(root, "src/main.css"), "body{color:red}");
  writeFileSync(
    join(root, "src/lazy.js"),
    `export const data=${JSON.stringify(randomBytes(3000).toString("hex"))};`,
  );
  return build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [buildBudget()],
    build: { write: false, minify: false },
  });
}

test("真实 Vite 最终 HTML 和 CSS 能通过预算，超限使构建失败", async () => {
  await expect(
    fixtureBuild({ initialCodeGzipBytes: 3000, assetGzipBytes: 10000 }),
  ).resolves.toBeDefined();
  await expect(
    fixtureBuild({ initialCodeGzipBytes: 1, assetGzipBytes: 10000 }),
  ).rejects.toThrow(/启动静态 JS\/CSS/);
  await expect(
    fixtureBuild({ initialCodeGzipBytes: 3000, assetGzipBytes: 100 }),
  ).rejects.toThrow(/单个 JS\/CSS/);
});
