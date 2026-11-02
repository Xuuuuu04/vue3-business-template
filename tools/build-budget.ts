import { readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { parse as parseHtml, NodeTypes } from "@vue/compiler-dom";
import type { OutputBundle } from "rolldown";

export interface BuildBudget {
  initialCodeGzipBytes: number;
  assetGzipBytes: number;
}
export interface CodeAsset {
  file: string;
  gzipBytes: number;
}
export interface InitialCode {
  html: string;
  files: string[];
  gzipBytes: number;
}
export interface BuildBudgetReport {
  assets: CodeAsset[];
  pages: InitialCode[];
  errors: string[];
}

export function parseBuildBudget(value: unknown): BuildBudget {
  const keys = ["initialCodeGzipBytes", "assetGzipBytes"];
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("build-budget.json 必须是资源预算对象");
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !keys.includes(key)))
    throw new Error("build-budget.json 包含未支持的字段");
  for (const key of keys)
    if (!Number.isSafeInteger(data[key]) || Number(data[key]) <= 0)
      throw new Error(`build-budget.json 的 ${key} 必须是正整数（字节）`);
  return {
    initialCodeGzipBytes: Number(data.initialCodeGzipBytes),
    assetGzipBytes: Number(data.assetGzipBytes),
  };
}

export function readBuildBudget(root: string): BuildBudget {
  const path = resolve(root, "build-budget.json");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new Error(`无法读取资源预算：${path}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("build-budget.json 不是有效 JSON");
  }
  return parseBuildBudget(value);
}

function resourcePath(reference: string, html: string, base: string): string {
  const value = reference.split(/[?#]/, 1)[0]!;
  const baseUrl = new URL(base, "https://build.invalid/");
  const remote = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value);
  const referenceUrl = remote ? new URL(value, baseUrl) : undefined;
  if (
    referenceUrl &&
    (baseUrl.origin === "https://build.invalid" ||
      referenceUrl.origin !== baseUrl.origin)
  )
    throw new Error(`启动代码引用不能计量远程资源：${reference}`);
  const decoded = decodeURIComponent(referenceUrl?.pathname ?? value);
  if (!decoded.startsWith("/"))
    return posix.normalize(posix.join(posix.dirname(html), decoded));
  const basePath = decodeURIComponent(baseUrl.pathname);
  if (!decoded.startsWith(basePath))
    throw new Error(`启动代码引用不在构建 base 内：${reference}`);
  return decoded.slice(basePath.length);
}

function htmlReferences(source: string): string[] {
  const references: string[] = [];
  const tree = parseHtml(source);
  function visit(node: (typeof tree.children)[number]) {
    if (node.type !== NodeTypes.ELEMENT) return;
    const attributes = new Map(
      node.props
        .filter((property) => property.type === NodeTypes.ATTRIBUTE)
        .map((property) => [
          property.name.toLowerCase(),
          property.value?.content,
        ]),
    );
    if (node.tag.toLowerCase() === "script" && attributes.has("src"))
      references.push(attributes.get("src")!);
    if (node.tag.toLowerCase() === "link") {
      const relation = attributes.get("rel")?.toLowerCase().split(/\s+/) ?? [];
      const preloadCode =
        relation.includes("preload") &&
        ["script", "style"].includes(attributes.get("as")?.toLowerCase() ?? "");
      if (
        relation.includes("stylesheet") ||
        relation.includes("modulepreload") ||
        preloadCode
      ) {
        const href = attributes.get("href");
        if (href) references.push(href);
      }
    }
    for (const child of node.children) visit(child);
  }
  for (const child of tree.children) visit(child);
  return references;
}

function initialFiles(
  bundle: OutputBundle,
  html: string,
  references: string[],
  base: string,
): string[] {
  const seen = new Set<string>();
  function visit(file: string) {
    if (seen.has(file)) return;
    const item = bundle[file];
    if (!item || !/\.(?:js|mjs|css)$/.test(file))
      throw new Error(`启动 JS/CSS 未出现在构建产物中：${file}（${html}）`);
    seen.add(file);
    if (item.type !== "chunk") return;
    for (const imported of item.imports) visit(imported);
    for (const css of item.viteMetadata?.importedCss ?? []) visit(css);
  }
  for (const reference of references)
    visit(resourcePath(reference, html, base));
  return [...seen].sort();
}

export function inspectBuildBudget(
  bundle: OutputBundle,
  budget: BuildBudget,
  base = "/",
): BuildBudgetReport {
  const assets = Object.values(bundle)
    .filter((item) => /\.(?:js|mjs|css)$/.test(item.fileName))
    .map((item) => ({
      file: item.fileName,
      gzipBytes: gzipSync(item.type === "chunk" ? item.code : item.source)
        .length,
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
  const sizes = new Map(assets.map((asset) => [asset.file, asset.gzipBytes]));
  const pages = Object.values(bundle)
    .filter((item) => item.type === "asset" && item.fileName.endsWith(".html"))
    .map((item) => {
      const source = item.type === "asset" ? item.source : "";
      const references = htmlReferences(
        typeof source === "string" ? source : Buffer.from(source).toString(),
      );
      const files = initialFiles(bundle, item.fileName, references, base);
      return {
        html: item.fileName,
        files,
        gzipBytes: files.reduce((total, file) => total + sizes.get(file)!, 0),
      };
    });
  if (!pages.length) throw new Error("资源预算检查没有找到构建后的 HTML 入口");
  const errors = assets
    .filter((asset) => asset.gzipBytes > budget.assetGzipBytes)
    .map(
      (asset) =>
        `${asset.file} gzip ${asset.gzipBytes} B，超过单个 JS/CSS 预算 ${budget.assetGzipBytes} B`,
    );
  for (const page of pages)
    if (page.gzipBytes > budget.initialCodeGzipBytes)
      errors.push(
        `${page.html} 启动静态 JS/CSS gzip ${page.gzipBytes} B，超过预算 ${budget.initialCodeGzipBytes} B`,
      );
  return { assets, pages, errors };
}
