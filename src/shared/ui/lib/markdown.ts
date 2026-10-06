/**
 * 轻量 Markdown 解析：标题、段落、列表、引用、代码块，以及行内粗体、行内代码、链接。
 * 只产出数据结构，由组件逐项渲染，不使用 v-html，模型输出里的标签不会被当成网页执行。
 */
export type Inline = { t: "text" | "bold" | "code"; v: string } | { t: "link"; v: string; href: string };
export type Block =
  | { t: "h"; level: 1 | 2 | 3; inline: Inline[] }
  | { t: "p"; inline: Inline[] }
  | { t: "quote"; inline: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "code"; lang: string; v: string };

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ t: "text", v: s.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ t: "bold", v: tok.slice(2, -2) });
    else if (tok.startsWith("`")) out.push({ t: "code", v: tok.slice(1, -1) });
    else {
      const [, text, href] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      // 只允许 http(s) 与站内链接，避免 javascript: 之类的地址
      out.push(/^(https?:\/\/|\/)/.test(href!) ? { t: "link", v: text!, href: href! } : { t: "text", v: text! });
    }
    last = m.index! + tok.length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const fence = line.match(/^```\s*(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) body.push(lines[i++]!);
      i++;
      blocks.push({ t: "code", lang: fence[1] ?? "", v: body.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { blocks.push({ t: "h", level: h[1]!.length as 1 | 2 | 3, inline: parseInline(h[2]!) }); i++; continue; }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: Inline[][] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i]!)) items.push(parseInline(lines[i++]!.replace(/^\s*([-*]|\d+[.)])\s+/, "")));
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    if (line.startsWith(">")) { blocks.push({ t: "quote", inline: parseInline(line.replace(/^>\s?/, "")) }); i++; continue; }
    if (!line.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(```|#{1,3}\s|>|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push({ t: "p", inline: parseInline(para.join(" ")) });
  }
  return blocks;
}
