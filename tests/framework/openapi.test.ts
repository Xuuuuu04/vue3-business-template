import { expect, test } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkEndpoints, generateApi, type OpenApi } from "../../tools/openapi";
import { z, type Endpoint } from "../../src/shared/public";
import { fileOpenApi } from "./fixtures/file-openapi";

const FileViewFixture = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  content_type: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
const FilePageFixture = z.object({
  items: z.array(FileViewFixture),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
const endpoints: Endpoint[] = [
  {
    id: "fixture.list",
    title: "读取文件列表",
    method: "GET",
    path: "/api/v1/files/:org",
    response: FilePageFixture,
  },
  {
    id: "fixture.info",
    title: "读取文件详情",
    method: "GET",
    path: "/api/v1/files/:org/:id/info",
    response: FileViewFixture,
  },
  {
    id: "fixture.upload",
    title: "上传文件",
    method: "POST",
    path: "/api/v1/files/:org",
    response: FileViewFixture,
  },
  {
    id: "fixture.delete",
    title: "删除文件",
    method: "DELETE",
    path: "/api/v1/files/:org/:id",
    response: z.null(),
  },
  {
    id: "fixture.download",
    title: "下载文件",
    method: "GET",
    path: "/api/v1/files/:org/:id/download",
    responseKind: "blob",
    response: z.instanceof(Blob),
  },
];

test("隔离测试中的文件接口与已知文档完全一致时没有问题", () => {
  expect(checkEndpoints(fileOpenApi(), endpoints)).toEqual([]);
});

test("字段被删、必填变可选、允许为空、接口不存在都会报出来", () => {
  const s = fileOpenApi();
  const file = s.components!.schemas!.FileView as {
    required: string[];
    properties: Record<string, unknown>;
  };
  delete file.properties.sha256;
  file.required = file.required.filter((k) => k !== "size");
  file.properties.name = { anyOf: [{ type: "string" }, { type: "null" }] };
  delete s.paths["/api/v1/files/{org}/{id}"];
  const messages = checkEndpoints(s, endpoints)
    .map((p) => p.message)
    .join("\n");
  expect(messages).toContain("sha256 前端需要，文档里没有");
  expect(messages).toContain("size 前端要求一定有，文档里是可选");
  expect(messages).toContain("name 文档允许为空");
  expect(messages).toContain("items[].sha256 前端需要，文档里没有");
  expect(messages).toContain("文档里没有这个接口");
});

test("按路径前缀生成接口登记与类型代码", () => {
  const code = generateApi(fileOpenApi(), "/api/v1/files", "file_library");
  expect(code).toContain("export const FileView = z.object({");
  expect(code).toContain('.describe("文件编号")');
  expect(code).not.toContain("/**");
  expect(code).toContain('path: "/api/v1/files/:org/:id/info"');
  expect(code).toContain('responseKind: "blob"');
  expect(code).toContain("response: z.null()");
  expect(code).toContain('id: "file_library.list_files"');
});

test("生成的代码可以直接加载：嵌套类型排在引用它的类型前面", async () => {
  const spec = fileOpenApi();

  const file = spec.components!.schemas!.FileView as {
    required: string[];
    properties: Record<string, unknown>;
  };
  file.properties.owner = { $ref: "#/components/schemas/Owner" };
  spec.components!.schemas!.Owner = {
    type: "object",
    required: ["name"],
    properties: { name: { type: "string" } },
  };
  const directory = mkdtempSync(join(tmpdir(), "vue-openapi-"));
  try {
    const target = join(directory, "generated-api.ts");
    writeFileSync(target, generateApi(spec, "/api/v1/files", "file_library"));
    const generated = (await import(target)) as Record<string, z.ZodType> & {
      endpoints: Endpoint[];
    };
    expect(generated.endpoints.map((e) => e.id)).toContain(
      "file_library.list_files",
    );
    const page = generated.FilePage!.parse({
      items: [
        {
          id: "f1",
          org_id: "o1",
          name: "a.txt",
          size: 1,
          sha256: "0".repeat(64),
          content_type: "text/plain",
          created_at: "2026-10-14T00:00:00Z",
          owner: { name: "小王" },
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    }) as { items: Array<{ owner?: { name: string } }> };
    expect(page.items[0]!.owner?.name).toBe("小王");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("互相引用的类型用 z.lazy 延后取值，生成的代码同样能加载", async () => {
  const spec = fileOpenApi();
  spec.components!.schemas!.Folder = {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      parent: { $ref: "#/components/schemas/Folder" },
    },
  };
  spec.paths["/api/v1/files/{org}/folders"] = {
    get: {
      operationId: "list_folders",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Folder" },
            },
          },
        },
      },
    },
  };
  const directory = mkdtempSync(join(tmpdir(), "vue-openapi-"));
  try {
    const target = join(directory, "generated-api.ts");
    writeFileSync(target, generateApi(spec, "/api/v1/files", "file_library"));
    const generated = (await import(target)) as Record<string, z.ZodType>;
    expect(
      generated.Folder!.parse({ name: "根", parent: { name: "上级" } }),
    ).toEqual({ name: "根", parent: { name: "上级" } });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("整数和混合枚举生成的类型按文档接受值，并保留字段说明", async () => {
  const spec: OpenApi = {
    paths: {
      "/api/status": {
        get: {
          operationId: "status",
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["state", "kind"],
                    properties: {
                      state: {
                        type: "integer",
                        enum: [0, 1],
                        description: "处理状态",
                      },
                      kind: { enum: ["ready", 2, null] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const directory = mkdtempSync(join(tmpdir(), "vue-enum-"));
  try {
    const target = join(directory, "generated-api.ts");
    writeFileSync(target, generateApi(spec, "/api", "sample"));
    const generated = (await import(target)) as { endpoints: Endpoint[] };
    const schema = generated.endpoints[0]!.response;
    expect(schema.parse({ state: 1, kind: 2 })).toEqual({ state: 1, kind: 2 });
    expect(schema.safeParse({ state: 3, kind: 2 }).success).toBe(false);
    expect(schema.safeParse({ state: 0, kind: null }).success).toBe(true);
    expect(schema.safeParse({ state: "1", kind: "ready" }).success).toBe(false);
    expect((schema as z.ZodObject).shape.state?.description).toBe("处理状态");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
