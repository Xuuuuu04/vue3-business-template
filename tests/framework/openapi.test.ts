/** 前后端接口对照：字段缺失、必填变可选、可空、接口不存在都要被发现；生成的代码可以作为 api.ts 的起点。 */
import { expect, test } from "vitest";
import { checkEndpoints, generateApi } from "../../tools/openapi";
import { z, type Endpoint } from "../../src/shared/public";
import { fileOpenApi } from "./fixtures/file-openapi";

/** 合成的已知输入，只验证公共对照工具，不要求产品保留文件管理业务。 */
const FileViewFixture = z.object({
  id: z.string(), org_id: z.string(), name: z.string(),
  size: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  content_type: z.string(), created_at: z.iso.datetime({ offset: true }),
});
const FilePageFixture = z.object({
  items: z.array(FileViewFixture), total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(), limit: z.number().int().positive(),
});
const endpoints: Endpoint[] = [
  { id: "fixture.list", title: "读取文件列表", method: "GET", path: "/api/v1/files/:org", response: FilePageFixture },
  { id: "fixture.info", title: "读取文件详情", method: "GET", path: "/api/v1/files/:org/:id/info", response: FileViewFixture },
  { id: "fixture.upload", title: "上传文件", method: "POST", path: "/api/v1/files/:org", response: FileViewFixture },
  { id: "fixture.delete", title: "删除文件", method: "DELETE", path: "/api/v1/files/:org/:id", response: z.null() },
  { id: "fixture.download", title: "下载文件", method: "GET", path: "/api/v1/files/:org/:id/download", responseKind: "blob", response: z.instanceof(Blob) },
];

test("隔离夹具中的文件接口与已知文档完全一致时没有问题", () => {
  expect(checkEndpoints(fileOpenApi(), endpoints)).toEqual([]);
});

test("字段被删、必填变可选、允许为空、接口不存在都会报出来", () => {
  const s = fileOpenApi();
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
  const code = generateApi(fileOpenApi(), "/api/v1/files", "file_library");
  expect(code).toContain("export const FileView = z.object({");
  expect(code).toContain("/** 文件编号 */");
  expect(code).toContain('path: "/api/v1/files/:org/:id/info"');
  expect(code).toContain('responseKind: "blob"');
  expect(code).toContain("response: z.null()");
  expect(code).toContain('id: "file_library.list_files"');
});
