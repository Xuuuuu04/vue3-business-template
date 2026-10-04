import { expect, test } from "vitest";
import { z } from "zod";
import { sendRequest, type Endpoint } from "@/shared/http/client";
import type { RequestRecord } from "@/shared/records/store";
const endpoint: Endpoint = {
  id: "read",
  title: "读取",
  method: "GET",
  path: "/api/items/:id",
  response: z.object({ name: z.string() }),
};
const record = (): RequestRecord => ({
  endpoint: "read",
  method: "GET",
  elapsed: 0,
  outcome: "running",
});
test("路径编码、响应类型与后台编号都来自真实 HTTP 返回", async () => {
  const item = record();
  const result = await sendRequest(
    endpoint,
    { params: { id: "a/b" } },
    new AbortController().signal,
    item,
    async (url) => {
      expect(url).toBe("/api/items/a%2Fb");
      return Response.json(
        { name: "真实结果" },
        { headers: { "X-Run-ID": "backend-42", "X-Request-ID": "request-42" } },
      );
    },
  );
  expect(result).toEqual({ name: "真实结果" });
  expect(item.backendRun).toBe("backend-42");
  expect(item.requestId).toBe("request-42");
});
test("不能把错误响应当成功，读取格式错误可重新读取", async () => {
  await expect(
    sendRequest(
      endpoint,
      { params: { id: "x" } },
      new AbortController().signal,
      record(),
      async () => Response.json({ name: 2 }),
    ),
  ).rejects.toMatchObject({ code: "response_invalid", unknownResult: false });
  await expect(
    sendRequest(
      endpoint,
      { params: { id: "x" } },
      new AbortController().signal,
      record(),
      async () => Response.json({ message: "权限不足" }, { status: 403 }),
    ),
  ).rejects.toThrow("权限不足");
});
test("写入响应格式错误仍然属于结果未知，不能自动重发", async () => {
  await expect(
    sendRequest(
      { ...endpoint, method: "POST" },
      { params: { id: "x" }, body: {} },
      new AbortController().signal,
      record(),
      async () => Response.json({ name: 2 }),
    ),
  ).rejects.toMatchObject({ unknownResult: true });
});
test("读取取消保留取消状态，缺少路径参数不会发请求", async () => {
  const controller = new AbortController();
  controller.abort();
  const item = record();
  await expect(
    sendRequest(
      endpoint,
      { params: { id: "x" } },
      controller.signal,
      item,
      async (_url, options) => {
        options?.signal?.throwIfAborted();
        return Response.json({ name: "x" });
      },
    ),
  ).rejects.toThrow();
  expect(item.outcome).toBe("cancelled");
  let called = false;
  await expect(
    sendRequest(endpoint, {}, controller.signal, record(), async () => {
      called = true;
      return Response.json({ name: "x" });
    }),
  ).rejects.toThrow("缺少路径参数");
  expect(called).toBe(false);
});
