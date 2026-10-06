/** 展示用的格式化：文件类型、字节大小、相对时间。只改变显示，不改变数据。 */

/** 文件种类：按扩展名优先，其次按 MIME 类型。color 是图标底色的色相（OKLCH）。 */
export function fileKind(name: string, type = ""): { ext: string; label: string; hue: number; preview: "text" | "image" | "none" } {
  const ext = (name.includes(".") ? name.split(".").pop()! : "").toLowerCase();
  const table: [string[], string, number, "text" | "image" | "none"][] = [
    [["pdf"], "PDF 文档", 25, "none"],
    [["xls", "xlsx"], "Excel 表格", 150, "none"],
    [["csv"], "CSV 表格", 150, "text"],
    [["doc", "docx"], "Word 文档", 255, "none"],
    [["ppt", "pptx"], "演示文稿", 50, "none"],
    [["png", "jpg", "jpeg", "gif", "webp", "svg"], "图片", 300, "image"],
    [["zip", "rar", "7z", "gz"], "压缩包", 75, "none"],
    [["md"], "Markdown", 230, "text"],
    [["txt", "log"], "文本", 240, "text"],
    [["json"], "JSON", 200, "text"],
  ];
  const hit = table.find(([exts]) => exts.includes(ext));
  if (hit) return { ext: ext.toUpperCase(), label: hit[1], hue: hit[2], preview: hit[3] };
  if (type.startsWith("image/")) return { ext: ext.toUpperCase() || "IMG", label: "图片", hue: 300, preview: "image" };
  if (type.startsWith("text/")) return { ext: ext.toUpperCase() || "TXT", label: "文本", hue: 240, preview: "text" };
  return { ext: ext.toUpperCase() || "FILE", label: "文件", hue: 250, preview: "none" };
}

/** 字节数按 1024 进位显示，保留一位小数。 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** 完整日期时间，如 2026年10月6日 16:00。 */
export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

/** 相对时间：刚刚、5 分钟前、3 小时前、昨天 14:20、9月28日、2025年9月28日。 */
export function formatRelative(value: string | Date, now = new Date()): string {
  const d = new Date(value);
  const diff = (now.getTime() - d.getTime()) / 1000;
  const hm = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diff < 60 && diff > -60) return "刚刚";
  if (diff < 3600 && diff > 0) return `${Math.floor(diff / 60)} 分钟前`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return `${Math.floor(diff / 3600)} 小时前`;
  if (days === 1) return `昨天 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
