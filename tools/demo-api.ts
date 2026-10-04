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
  for (let i = 0; i < 16; i++) {
    const bytes = Buffer.from(`这是样板文件 ${i + 1}，只用于开发验证。\n`);
    const id = `sample-${i + 1}`;
    files.set(id, {
      id,
      org_id: "demo-team",
      name: [
        "项目使用说明.txt",
        "团队资料清单.txt",
        "交付检查说明.txt",
        "接口对接说明.txt",
      ][i % 4]!.replace(".txt", i > 3 ? ` ${i + 1}.txt` : ".txt"),
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content_type: "text/plain",
      created_at: new Date(Date.UTC(2026, 9, 4, 9, 30 - i)).toISOString(),
      bytes,
    });
  }
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
