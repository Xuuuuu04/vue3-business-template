import ts from "typescript";
import { parse as parseVue } from "@vue/compiler-sfc";
import { parse as parseTemplate, NodeTypes } from "@vue/compiler-dom";
import postcss from "postcss";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { filesBelow } from "./lib";

export function sourceProblems(file: string, text: string): string[] {
  const errors = new Set<string>();
  const report = (offset: number, rule: string, message: string) => {
    const line = text.slice(0, offset).split("\n").length;
    errors.add(`${file}:${line} [${rule}] ${message}`);
  };
  const scripts: { content: string; offset: number }[] = [];
  if (file.endsWith(".vue")) {
    const { descriptor } = parseVue(text, { filename: file });
    for (const block of [descriptor.script, descriptor.scriptSetup])
      if (block)
        scripts.push({
          content: block.content,
          offset: block.loc.start.offset,
        });
    {
      const template = parseTemplate(text);
      const visit = (node: {
        type: number;
        loc: { start: { offset: number } };
        children?: unknown[];
      }) => {
        if (node.type === NodeTypes.COMMENT)
          report(
            node.loc.start.offset,
            "comment",
            "用清楚的命名、类型和测试表达用途，不写普通注释",
          );
        for (const child of node.children ?? [])
          if (
            child &&
            typeof child === "object" &&
            "type" in child &&
            "loc" in child
          )
            visit(child as typeof node);
      };
      visit(template);
    }
    for (const block of descriptor.styles)
      cssProblems(block.content, block.loc.start.offset, report);
  } else if (file.endsWith(".css")) cssProblems(text, 0, report);
  else scripts.push({ content: text, offset: 0 });
  const tested = file.startsWith("tests/") || file.includes("/tests/");
  for (const { content, offset } of scripts)
    scriptProblems(file, content, offset, tested, report);
  if (
    !tested &&
    !file.endsWith(".css") &&
    text.trimEnd().split("\n").length > 500
  )
    report(0, "file_lines", "文件超过 500 行；按职责拆分");
  return [...errors];
}
function cssProblems(
  text: string,
  offset: number,
  report: (offset: number, rule: string, message: string) => void,
) {
  postcss.parse(text).walkComments((comment) => {
    if (!/@license|@preserve|SPDX-License-Identifier/.test(comment.text))
      report(
        offset + (comment.source?.start?.offset ?? 0),
        "comment",
        "样式用途由选择器和变量名表达，不写普通注释",
      );
  });
}
export function inspectQuality(root = process.cwd(), module?: string) {
  const paths = module ? [`src/modules/${module}`] : ["src", "tools", "tests"];
  return paths
    .flatMap((path) => filesBelow(resolve(root, path)))
    .filter(
      (file) => /\.(ts|vue|css)$/.test(file) && !file.includes("/generated/"),
    )
    .flatMap((file) =>
      sourceProblems(relative(root, file), readFileSync(file, "utf8")),
    );
}

function scriptProblems(
  file: string,
  content: string,
  offset: number,
  tested: boolean,
  report: (offset: number, rule: string, message: string) => void,
) {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node: ts.Node) {
    for (const range of [
      ...(ts.getLeadingCommentRanges(content, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(content, node.end) ?? []),
    ]) {
      const comment = content.slice(range.pos, range.end);
      if (
        !/^\/\/\/\s*<reference/.test(comment) &&
        !/@license|@preserve|SPDX-License-Identifier/.test(comment)
      )
        report(
          offset + range.pos,
          "comment",
          "删除普通注释；字段含义写入类型或 schema",
        );
    }
    if (node.kind === ts.SyntaxKind.AnyKeyword)
      report(
        offset + node.getStart(source),
        "explicit_any",
        "使用具体类型；尚未确认的数据使用 unknown 并校验",
      );
    if (ts.isCatchClause(node) && node.block.statements.length === 0)
      report(
        offset + node.getStart(source),
        "empty_catch",
        "明确处理错误或继续抛出，不使用空 catch",
      );
    if (
      !tested &&
      ts.isFunctionLike(node) &&
      "body" in node &&
      node.body &&
      ts.isBlock(node.body)
    ) {
      const lines =
        source.getLineAndCharacterOfPosition(node.end).line -
        source.getLineAndCharacterOfPosition(node.getStart(source)).line +
        1;
      if (lines > 80)
        report(
          offset + node.getStart(source),
          "function_lines",
          `函数 ${lines} 行，超过 80 行；按职责拆分`,
        );
    }
    for (const child of node.getChildren(source)) visit(child);
  }
  visit(source);
}
