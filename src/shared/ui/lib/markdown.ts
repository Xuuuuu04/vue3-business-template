export type Inline =
  | { t: "text" | "bold" | "code"; v: string }
  | { t: "link"; v: string; href: string };
export type Block =
  | { t: "h"; level: 1 | 2 | 3; inline: Inline[] }
  | { t: "p"; inline: Inline[] }
  | { t: "quote"; inline: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "code"; lang: string; v: string };

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const closing = new Map<string, number>();
  const whitespace = /\s/g;
  let nextSpace = -1;
  let plainStart = 0;
  let i = 0;

  function next(character: string, start: number): number {
    let index = closing.get(character) ?? -1;
    if (index < start) {
      const found = s.indexOf(character, start);
      index = found < 0 ? s.length : found;
      closing.set(character, index);
    }
    return index;
  }
  function space(start: number): number {
    if (nextSpace < start) {
      whitespace.lastIndex = start;
      nextSpace = whitespace.exec(s)?.index ?? s.length;
    }
    return nextSpace;
  }
  function append(token: Inline, end: number): void {
    if (i > plainStart) out.push({ t: "text", v: s.slice(plainStart, i) });
    out.push(token);
    i = end;
    plainStart = end;
  }
  while (i < s.length) {
    if (s.startsWith("**", i)) {
      const end = next("*", i + 2);
      if (end > i + 2 && s[end + 1] === "*") {
        append({ t: "bold", v: s.slice(i + 2, end) }, end + 2);
        continue;
      }
    } else if (s[i] === "`") {
      const end = next("`", i + 1);
      if (end > i + 1 && end < s.length) {
        append({ t: "code", v: s.slice(i + 1, end) }, end + 1);
        continue;
      }
    } else if (s[i] === "[") {
      const labelEnd = next("]", i + 1);
      if (labelEnd > i + 1 && s[labelEnd + 1] === "(") {
        const hrefStart = labelEnd + 2;
        const end = next(")", hrefStart);
        if (end > hrefStart && end < s.length && space(hrefStart) >= end) {
          const label = s.slice(i + 1, labelEnd);
          const href = s.slice(hrefStart, end);

          append(
            /^(https?:\/\/|\/)/.test(href)
              ? { t: "link", v: label, href }
              : { t: "text", v: label },
            end + 1,
          );
          continue;
        }
      }
    }
    i++;
  }
  if (plainStart < s.length) out.push({ t: "text", v: s.slice(plainStart) });
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
      while (i < lines.length && !lines[i]!.startsWith("```"))
        body.push(lines[i++]!);
      i++;
      blocks.push({ t: "code", lang: fence[1] ?? "", v: body.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      blocks.push({
        t: "h",
        level: h[1]!.length as 1 | 2 | 3,
        inline: parseInline(h[2]!),
      });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: Inline[][] = [];
      while (
        i < lines.length &&
        (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i]!)
      )
        items.push(
          parseInline(lines[i++]!.replace(/^\s*([-*]|\d+[.)])\s+/, "")),
        );
      blocks.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }
    if (line.startsWith(">")) {
      blocks.push({
        t: "quote",
        inline: parseInline(line.replace(/^>\s?/, "")),
      });
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(```|#{1,3}\s|>|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i]!)
    )
      para.push(lines[i++]!);
    blocks.push({ t: "p", inline: parseInline(para.join(" ")) });
  }
  return blocks;
}
