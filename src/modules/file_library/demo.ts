/**
 * 文件管理的演示回包：16 个类型、大小、时间都接近真实团队文件的样例，可以上传、查看、下载和删除。
 * 数据只在开发服务内存里，重启或改动本文件后恢复；不伪造后台运行编号。
 */
import { defineDemo } from "@/shared/public";

interface DemoFile {
  id: string;
  org_id: string;
  name: string;
  size: number;
  sha256: string;
  content_type: string;
  created_at: string;
  bytes: Uint8Array<ArrayBuffer>;
}
const samples: [string, string, number, string][] = [
  ["2026 第三季度经营报告.pdf", "application/pdf", 2_416_000, ""],
  ["门店销售明细-九月.csv", "text/csv", 18_400, "日期,门店,订单数,实付金额\n2026-09-01,南岸门店,412,38210.50\n2026-09-01,渝中门店,356,30988.00\n2026-09-02,南岸门店,398,36720.20\n"],
  ["客户名单.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 86_200, ""],
  ["产品介绍-对外版.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 3_620_000, ""],
  ["门店照片-南岸.svg", "image/svg+xml", 1_620, "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'><rect width='400' height='240' fill='#e8eef7'/><rect x='40' y='90' width='320' height='120' fill='#c9d6ea'/><rect x='70' y='130' width='60' height='80' fill='#8aa1c4'/><rect x='170' y='120' width='160' height='50' fill='#fff'/><path d='M30 90 L200 30 L370 90 Z' fill='#5b7bb3'/><text x='250' y='153' font-size='22' text-anchor='middle' fill='#3b4a63' font-family='sans-serif'>南岸门店</text></svg>"],
  ["服务合同模板.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 42_800, ""],
  ["接口对接说明.md", "text/markdown", 3_240, "# 接口对接说明\n\n1. 所有接口使用同源 /api。\n2. 响应头带 X-Request-ID 和 X-Run-ID。\n3. 写入结果未知时先查询，不要重复提交。\n"],
  ["品牌素材包.zip", "application/zip", 2_870_000, ""],
  ["项目使用说明.txt", "text/plain", 1_180, "这是项目使用说明。\n登录后在左侧选择要处理的业务，右上角可以切换配色和深浅色。\n"],
  ["九月考勤汇总.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 64_500, ""],
  ["采购计划-十月.csv", "text/csv", 9_800, "商品,数量,预计到货\n矿泉水 550ml,1200,2026-10-08\n纯牛奶 250ml,800,2026-10-09\n"],
  ["交付检查清单.txt", "text/plain", 2_050, "交付前检查：\n- 主要操作走通\n- 失败与结果未知有提示\n- 窄屏可用\n"],
  ["年度预算草案.pdf", "application/pdf", 1_105_000, ""],
  ["团队合影.svg", "image/svg+xml", 1_400, "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'><rect width='400' height='240' fill='#f3ede4'/><circle cx='120' cy='120' r='38' fill='#d9b98a'/><circle cx='200' cy='110' r='42' fill='#c79c63'/><circle cx='280' cy='120' r='38' fill='#d9b98a'/><rect x='70' y='160' width='260' height='60' rx='20' fill='#8a6a44'/></svg>"],
  ["会议纪要-10月3日.md", "text/markdown", 2_760, "# 会议纪要\n\n- 确认十月上线范围\n- 价格表改为每日更新\n"],
  ["数据备份-0930.zip", "application/zip", 3_940_000, ""],
];
async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
let store: Promise<Map<string, DemoFile>> | undefined;
/** 有正文的样例用真实内容；没有的用空格填到标称大小（上限 4 MB），大小按实际字节显示。 */
function files() {
  store ??= (async () => {
    const map = new Map<string, DemoFile>();
    for (const [index, [name, contentType, size, text]] of samples.entries()) {
      const head = new TextEncoder().encode(text || `${name} 的演示内容。\n`);
      const bytes = text ? head : new Uint8Array(Math.max(head.length, Math.min(size, 4_000_000))).fill(32);
      if (!text) bytes.set(head);
      const id = `sample-${index + 1}`;
      map.set(id, {
        id,
        org_id: "demo-team",
        name,
        size: bytes.length,
        sha256: await sha256(bytes),
        content_type: contentType,
        created_at: new Date(Date.UTC(2026, 9, 6, 8, 0) - (index * 31 + (index % 3) * 7) * 3_600_000).toISOString(),
        bytes,
      });
    }
    return map;
  })();
  return store;
}
function view(file: DemoFile) {
  const { bytes, ...value } = file;
  void bytes;
  return value;
}
async function find(params: Record<string, string>) {
  const item = (await files()).get(params.id ?? "");
  return item && item.org_id === params.org ? item : undefined;
}
const missing = () =>
  Response.json({ code: "file_missing", message: "文件不存在或已删除" }, { status: 404 });

export default defineDemo({
  "file_library.list": async (request, params) => {
    const query = new URL(request.url).searchParams;
    const offset = Math.max(0, Number(query.get("offset")) || 0);
    const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 10));
    const items = [...(await files()).values()]
      .filter((file) => file.org_id === params.org)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { items: items.slice(offset, offset + limit).map(view), total: items.length, offset, limit };
  },
  "file_library.info": async (_request, params) => {
    const item = await find(params);
    return item ? view(item) : missing();
  },
  "file_library.upload": async (request, params) => {
    let upload: FormDataEntryValue | null;
    try {
      upload = (await request.formData()).get("upload");
    } catch {
      return Response.json({ message: "上传内容无法读取" }, { status: 400 });
    }
    if (!(upload instanceof File) || !upload.size)
      return Response.json({ message: "请选择非空文件" }, { status: 422 });
    if (upload.size > 11 * 1024 * 1024)
      return Response.json({ message: "文件过大" }, { status: 413 });
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const item: DemoFile = {
      id: crypto.randomUUID(),
      org_id: params.org ?? "",
      name: upload.name,
      size: bytes.length,
      sha256: await sha256(bytes),
      content_type: upload.type || "application/octet-stream",
      created_at: new Date().toISOString(),
      bytes,
    };
    (await files()).set(item.id, item);
    return view(item);
  },
  "file_library.delete": async (_request, params) => {
    const item = await find(params);
    if (!item) return missing();
    (await files()).delete(item.id);
    return new Response(null, { status: 204 });
  },
  "file_library.download": async (_request, params) => {
    const item = await find(params);
    if (!item) return missing();
    return new Response(item.bytes, {
      headers: {
        "Content-Type": item.content_type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,
      },
    });
  },
});
