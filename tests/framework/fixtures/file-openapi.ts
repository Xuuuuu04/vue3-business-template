/** 文件及分页的已知接口文档；合成测试输入，不能代替真实后台验证。 */
import type { OpenApi } from '../../../tools/openapi';

export function fileOpenApi(): OpenApi {
  const file = {
    type: "object",
    required: ["id", "org_id", "name", "size", "sha256", "content_type", "created_at"],
    properties: {
      id: { type: "string", description: "文件编号" },
      org_id: { type: "string" },
      name: { type: "string", description: "文件名" },
      size: { type: "integer", description: "字节数" },
      sha256: { type: "string" },
      content_type: { type: "string" },
      created_at: { type: "string", format: "date-time" },
    },
  };
  const ok = (ref: string) => ({ responses: { "200": { content: { "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } } } } });
  return {
    paths: {
      "/api/v1/files/{org}": { get: { operationId: "list_files", summary: "读取文件列表", ...ok("FilePage") }, post: { operationId: "upload_file", summary: "上传文件", ...ok("FileView") } },
      "/api/v1/files/{org}/{id}/info": { get: { operationId: "file_info", summary: "文件详情", ...ok("FileView") } },
      "/api/v1/files/{org}/{id}": { delete: { operationId: "delete_file", summary: "删除文件", responses: { "204": { description: "已删除" } } } },
      "/api/v1/files/{org}/{id}/download": { get: { operationId: "download_file", summary: "下载文件", responses: { "200": { content: { "application/octet-stream": {} } } } } },
    },
    components: {
      schemas: {
        FileView: file,
        FilePage: { type: "object", required: ["items", "total", "offset", "limit"], properties: { items: { type: "array", items: { $ref: "#/components/schemas/FileView" } }, total: { type: "integer" }, offset: { type: "integer" }, limit: { type: "integer" } } },
      },
    },
  };
}
