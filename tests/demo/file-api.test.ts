/** 样例业务的真实接口登记必须与独立的已知文档一致；创建产品时随样例移除。 */
import { expect, test } from "vitest";
import { checkEndpoints } from "../../tools/openapi";
import { endpoints } from "../../src/modules/file_library/api";
import { fileOpenApi } from "../framework/fixtures/file-openapi";

test("样例文件接口的真实登记与已知文档完全一致", () => {
  expect(checkEndpoints(fileOpenApi(), endpoints)).toEqual([]);
});

test("样例文件文档缺失字段、改变必填与可空、删除接口都会报出来", () => {
  const document = fileOpenApi();
  const file = document.components!.schemas!.FileView as { required: string[]; properties: Record<string, unknown> };
  delete file.properties.sha256;
  file.required = file.required.filter((field) => field !== "size");
  file.properties.name = { anyOf: [{ type: "string" }, { type: "null" }] };
  delete document.paths["/api/v1/files/{org}/{id}"];
  const messages = checkEndpoints(document, endpoints).map((problem) => problem.message).join("\n");
  expect(messages).toContain("sha256 前端需要，文档里没有");
  expect(messages).toContain("size 前端要求一定有，文档里是可选");
  expect(messages).toContain("name 文档允许为空");
  expect(messages).toContain("items[].sha256 前端需要，文档里没有");
  expect(messages).toContain("文档里没有这个接口");
});
