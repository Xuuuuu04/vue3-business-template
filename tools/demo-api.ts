/** 仅开发和显式 demo 预览使用的独立 HTTP 服务；无真实用户数据。 */
import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
interface DemoFile {
  id: string;
  org_id: string;
  name: string;
  size: number;
  sha256: string;
  content_type: string;
  created_at: string;
  bytes: Buffer;
}
export function demoApi(): Plugin {
  const files = new Map<string, DemoFile>();
  // 演示数据：类型、大小、时间都接近真实团队文件，让列表、详情和预览有真实的样子。
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
  samples.forEach(([name, contentType, size, text], i) => {
    // 有正文的文件用真实内容；没有的用占位字节填到标称大小（上限 4 MB，避免占内存）。大小按实际字节显示。
    const head = Buffer.from(text || `${name} 的演示内容。\n`);
    const bytes = text ? head : Buffer.concat([head, Buffer.alloc(Math.max(0, Math.min(size, 4_000_000) - head.length), 32)]);
    const id = `sample-${i + 1}`;
    files.set(id, {
      id,
      org_id: "demo-team",
      name,
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content_type: contentType,
      created_at: new Date(Date.UTC(2026, 9, 6, 8, 0) - (i * 31 + (i % 3) * 7) * 3_600_000).toISOString(),
      bytes,
    });
  });
  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) {
    if (!req.url?.startsWith("/api/v1/files/")) return next();
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);
    const org = decodeURIComponent(parts[3] || "");
    const id = decodeURIComponent(parts[4] || "");
    const suffix = parts[5];
    res.setHeader("X-Request-ID", req.headers["x-request-id"] || randomUUID());
    res.setHeader("X-Demo-Mode", "true"); // 不伪造后台真实运行编号。
    function json(status: number, body: unknown) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    }
    function view(file: DemoFile) {
      const { bytes, ...value } = file;
      void bytes;
      return value;
    }
    try {
      if (req.method === "GET" && !id) {
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const limit = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get("limit")) || 10),
        );
        const items = [...files.values()]
          .filter((f) => f.org_id === org)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        return json(200, {
          items: items.slice(offset, offset + limit).map(view),
          total: items.length,
          offset,
          limit,
        });
      }
      if (req.method === "POST" && !id) {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const part of req) {
          size += part.length;
          if (size > 11 * 1024 * 1024)
            return json(413, { message: "文件过大" });
          chunks.push(part);
        }
        const request = new Request("http://localhost/upload", {
          method: "POST",
          headers: { "Content-Type": String(req.headers["content-type"]) },
          body: Buffer.concat(chunks),
        });
        const body = await request.formData();
        const upload = body.get("upload");
        if (!(upload instanceof File) || !upload.size)
          return json(422, { message: "请选择非空文件" });
        const bytes = Buffer.from(await upload.arrayBuffer());
        const item: DemoFile = {
          id: randomUUID(),
          org_id: org,
          name: upload.name,
          size: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          content_type: upload.type || "application/octet-stream",
          created_at: new Date().toISOString(),
          bytes,
        };
        files.set(item.id, item);
        return json(200, view(item));
      }
      const item = files.get(id);
      if (!item || item.org_id !== org)
        return json(404, {
          code: "file_missing",
          message: "文件不存在或已删除",
        });
      if (req.method === "GET" && suffix === "info")
        return json(200, view(item));
      if (req.method === "GET" && suffix === "download") {
        res.setHeader("Content-Type", item.content_type);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,
        );
        return res.end(item.bytes);
      }
      if (req.method === "DELETE" && !suffix) {
        files.delete(id);
        res.statusCode = 204;
        return res.end();
      }
      json(405, { message: "请求方法不支持" });
    } catch {
      json(400, { message: "上传内容无法读取" });
    }
  }
  return {
    name: "explicit-demo-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next);
      });
    },
  };
}
