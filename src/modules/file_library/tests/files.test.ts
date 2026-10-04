/** 确认样例来自 doc/file_library/rules.md；假服务只验证前端处理。 */
import { expect, test } from "vitest";
import { createTask } from "@/shared/public";
import { listFiles, uploadFile, deleteFile } from "../flow";
import { endpoints } from "../api";
const file = {
  id: "one",
  org_id: "demo-team",
  name: "说明.txt",
  size: 3,
  sha256: "a".repeat(64),
  content_type: "text/plain",
  created_at: "2026-10-04T00:00:00Z",
};
test("R-01：后台总数与分页位置保持不变，列表数量来自实际返回", async () => {
  const task = createTask(listFiles, endpoints, "latest", async (input) => {
    expect(String(input)).toContain("offset=10");
    return Response.json({ items: [file], total: 16, offset: 10, limit: 10 });
  });
  expect(await task.run({ org: "demo-team", offset: 10, limit: 10 })).toEqual({
    items: [file],
    total: 16,
    offset: 10,
    limit: 10,
  });
});
test("R-03：上传字段名为 upload，返回后台产生的文件编号", async () => {
  const task = createTask(
    uploadFile,
    endpoints,
    "submit",
    async (_url, options) => {
      expect((options?.body as FormData).get("upload")).toBeInstanceOf(File);
      return Response.json(file);
    },
  );
  expect(
    (await task.run({ org: "demo-team", file: new File(["abc"], "说明.txt") }))
      ?.id,
  ).toBe("one");
});
test("R-03：空文件在发请求之前失败", async () => {
  let calls = 0;
  const task = createTask(uploadFile, endpoints, "submit", async () => {
    calls++;
    return Response.json(file);
  });
  await task.run({ org: "demo-team", file: new File([], "空.txt") });
  expect(calls).toBe(0);
  expect(task.state.value.status).toBe("error");
});
test("R-04：后台 204 才表示删除完成", async () => {
  const task = createTask(
    deleteFile,
    endpoints,
    "submit",
    async () => new Response(null, { status: 204 }),
  );
  expect(await task.run({ org: "demo-team", id: "one" })).toBeNull();
  expect(task.state.value.status).toBe("success");
});
test("R-06：写入中断保留未知状态，再点击不能重发", async () => {
  let calls = 0;
  const task = createTask(deleteFile, endpoints, "submit", async () => {
    calls++;
    throw new TypeError("connection lost");
  });
  await task.run({ org: "demo-team", id: "one" });
  await task.run({ org: "demo-team", id: "one" });
  expect(calls).toBe(1);
  expect(task.state.value.status).toBe("unknown");
});
