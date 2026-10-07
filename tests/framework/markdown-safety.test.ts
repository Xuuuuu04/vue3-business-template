import { expect, test } from "vitest";
import { parseInline, parseMarkdown } from "@/shared/ui/lib/markdown";

test("粗体、代码与正常链接保持原有展示结果", () => {
  expect(parseInline("**粗体**、`行内代码` 和 [教程](https://example.com)。")).toEqual([
    { t: "bold", v: "粗体" }, { t: "text", v: "、" }, { t: "code", v: "行内代码" },
    { t: "text", v: " 和 " }, { t: "link", v: "教程", href: "https://example.com" }, { t: "text", v: "。" },
  ]);
  expect(parseInline("[页面](/files) [接口](http://example.com)")).toEqual([
    { t: "link", v: "页面", href: "/files" }, { t: "text", v: " " },
    { t: "link", v: "接口", href: "http://example.com" },
  ]);
});

test("HTML 保持文字，脚本与 data 地址不会成为链接", () => {
  expect(parseInline('<img src=x onerror="alert(1)">')).toEqual([{ t: "text", v: '<img src=x onerror="alert(1)">' }]);
  for (const href of ["javascript:alert", "data:text/html,unsafe", "mailto:demo@example.com"])
    expect(parseInline(`[显示文字](${href})`)).toEqual([{ t: "text", v: "显示文字" }]);
  expect(parseInline("[不完整](https://example.com 有空格)")).toEqual([{ t: "text", v: "[不完整](https://example.com 有空格)" }]);
});

test.each(["brackets", "nested_links"])("长 %s 异常输入不会反复扫描剩余全文", (kind) => {
  const text = kind === "brackets" ? "[".repeat(128_000) : "[x](".repeat(32_000);
  const started = performance.now();
  expect(parseMarkdown(text)).toEqual([{ t: "p", inline: [{ t: "text", v: text }] }]);
  // 这是异常文本的宽松耗时上限，不把机器波动当作视觉流畅度结论。
  expect(performance.now() - started).toBeLessThan(500);
});
