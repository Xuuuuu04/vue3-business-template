import { expect, test } from "vitest";
import { sourceProblems } from "../../tools/code-quality";

test("普通注释、any、空catch会报告规则名和位置", () => {
  const errors = sourceProblems(
    "src/sample.ts",
    "// 描述\nexport function value(input: any) { try { return input; } catch {} }\n",
  );
  expect(errors.join("\n")).toContain("src/sample.ts:1 [comment]");
  expect(errors.join("\n")).toContain("[explicit_any]");
  expect(errors.join("\n")).toContain("[empty_catch]");
});
test("字符串、正则、模板文本和编译器类型引用不会误报注释", () => {
  expect(
    sourceProblems(
      "src/sample.ts",
      '/// <reference types="vite/client" />\nconst url = "https://example.test"; const pattern = /a\\/\\/b/; const sample = `/* text */`;',
    ),
  ).toEqual([]);
});
test("Vue模板与样式中的注释同样检查，字段说明保留在schema", () => {
  const errors = sourceProblems(
    "src/Page.vue",
    '<script setup lang="ts">const label = "说明";</script><template><!-- 描述 --><p>{{label}}</p></template><style>/* 描述 */ p { color: red; }</style>',
  );
  expect(errors.filter((error) => error.includes("[comment]")).length).toBe(2);
});
test("复杂度检查拒绝过长函数，测试回调不使用业务函数长度限制", () => {
  const source = `function long() {\n${"  work();\n".repeat(81)}}`;
  expect(sourceProblems("src/long.ts", source).join("\n")).toContain(
    "[function_lines]",
  );
  expect(sourceProblems("tests/long.test.ts", source)).toEqual([]);
});

test("Vue文件头和块之间的普通HTML注释也会报错", () => {
  expect(
    sourceProblems(
      "src/Page.vue",
      "<!-- 说明 --><template><p>内容</p></template>",
    ).join("\n"),
  ).toContain("[comment]");
  expect(
    sourceProblems(
      "src/Page.vue",
      '<script setup lang="ts">const value = 1;</script><!-- 说明 --><template>{{value}}</template>',
    ).join("\n"),
  ).toContain("[comment]");
});
