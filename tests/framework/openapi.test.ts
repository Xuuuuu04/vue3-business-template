/** 前后端接口对照：字段缺失、必填变可选、可空、接口不存在都要被发现；生成的代码可以作为 api.ts 的起点。 */
import { expect, test } from "vitest";
import { checkEndpoints, generateApi, type OpenApi } from "../../tools/openapi";
import { endpoints } from "../../src/modules/file_library/api";

function spec(): OpenApi {
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

test("前端登记的文件接口与文档完全一致时没有问题", () => {
  expect(checkEndpoints(spec(), endpoints)).toEqual([]);
});

test("字段被删、必填变可选、允许为空、接口不存在都会报出来", () => {
  const s = spec();
  const file = s.components!.schemas!.FileView as { required: string[]; properties: Record<string, unknown> };
  delete file.properties.sha256;
  file.required = file.required.filter((k) => k !== "size");
  file.properties.name = { anyOf: [{ type: "string" }, { type: "null" }] };
  delete s.paths["/api/v1/files/{org}/{id}"];
  const messages = checkEndpoints(s, endpoints).map((p) => p.message).join("\n");
  expect(messages).toContain("sha256 前端需要，文档里没有");
  expect(messages).toContain("size 前端要求一定有，文档里是可选");
  expect(messages).toContain("name 文档允许为空");
  expect(messages).toContain("items[].sha256 前端需要，文档里没有");
  expect(messages).toContain("文档里没有这个接口");
});

test("按路径前缀生成接口登记与类型代码", () => {
  const code = generateApi(spec(), "/api/v1/files", "file_library");
  expect(code).toContain("export const FileView = z.object({");
  expect(code).toContain("/** 文件编号 */");
  expect(code).toContain('path: "/api/v1/files/:org/:id/info"');
  expect(code).toContain('responseKind: "blob"');
  expect(code).toContain("response: z.null()");
  expect(code).toContain('id: "file_library.list_files"');
});
