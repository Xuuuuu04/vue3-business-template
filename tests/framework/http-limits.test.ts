import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { sendRequest, type Endpoint } from "@/shared/http/client";
import type { RequestRecord } from "@/shared/records/store";

const endpoint: Endpoint = {
  id: "limits.read",
  title: "读取",
  path: "/api/read",
  method: "GET",
  response: z.string(),
};
const record = (): RequestRecord => ({
  endpoint: endpoint.id,
  method: "GET",
  elapsed: 0,
  outcome: "running",
});
afterEach(() => vi.useRealTimers());

test.each(["GET", "POST"] as const)(
  "%s 实际分块超限后停止读取；写入保持结果未知",
  async (method) => {
    let cancelled = false;
    let calls = 0;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          controller.enqueue(new TextEncoder().encode("xxxx"));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "Content-Length": "1" } },
    );
    const item = record();
    await expect(
      sendRequest(
        { ...endpoint, method, maxResponseBytes: 6 },
        {},
        new AbortController().signal,
        item,
        async () => {
          calls++;
          return response;
        },
      ),
    ).rejects.toMatchObject({
      code: "response_too_large",
      unknownResult: method === "POST",
    });
    expect(cancelled).toBe(true);
    expect(calls).toBe(1);
    expect(item.outcome).toBe(method === "POST" ? "unknown" : "failed");
  },
);

test("无声明长度的正常 JSON 和文件仍可读取", async () => {
  const signal = new AbortController().signal;
  expect(
    await sendRequest(endpoint, {}, signal, record(), async () =>
      Response.json("正常内容"),
    ),
  ).toBe("正常内容");
  const blob = await sendRequest<Blob>(
    { ...endpoint, responseKind: "blob", response: z.instanceof(Blob) },
    {},
    signal,
    record(),
    async () =>
      new Response("文件正文", { headers: { "Content-Type": "text/plain" } }),
  );
  expect(await blob.text()).toBe("文件正文");
  expect(blob.type).toBe("text/plain");
});

test("文件接口声明更长的期限，超过普通 15 秒仍能正常完成", async () => {
  vi.useFakeTimers();
  const pending = sendRequest(
    { ...endpoint, timeoutMs: 20_000 },
    {},
    new AbortController().signal,
    record(),
    async (_url, init) => {
      await new Promise((resolve) => setTimeout(resolve, 17_000));
      expect(init?.signal?.aborted).toBe(false);
      return Response.json("完成");
    },
  );
  await vi.advanceTimersByTimeAsync(17_000);
  expect(await pending).toBe("完成");
});

test("真正超时的提交保持结果未知且不重发", async () => {
  vi.useFakeTimers();
  let calls = 0;
  const pending = sendRequest(
    { ...endpoint, method: "POST", timeoutMs: 100 },
    {},
    new AbortController().signal,
    record(),
    async (_url, init) => {
      calls++;
      return new Promise<Response>((_resolve, reject) =>
        init!.signal!.addEventListener("abort", () =>
          reject(init!.signal!.reason),
        ),
      );
    },
  );
  const checked = expect(pending).rejects.toMatchObject({
    unknownResult: true,
  });
  await vi.advanceTimersByTimeAsync(100);
  await checked;
  expect(calls).toBe(1);
});

test.each([
  { path: "https://other.example/api/read" },
  { path: "//other.example/api/read" },
  { path: "/api/../admin" },
  { path: "/api/%2e%2e/admin" },
  { path: "/api/x/../../admin" },
  { timeoutMs: Infinity },
  { maxResponseBytes: 0 },
])("无效路径或无上限配置在发送之前失败：%j", async (change) => {
  let calls = 0;
  await expect(
    sendRequest(
      { ...endpoint, ...change },
      {},
      new AbortController().signal,
      record(),
      async () => {
        calls++;
        return Response.json("错误");
      },
    ),
  ).rejects.toThrow();
  expect(calls).toBe(0);
});

test("路径参数不能通过点段改变请求范围", async () => {
  let calls = 0;
  await expect(
    sendRequest(
      { ...endpoint, path: "/api/:id/admin" },
      { params: { id: ".." } },
      new AbortController().signal,
      record(),
      async () => {
        calls++;
        return Response.json("错误");
      },
    ),
  ).rejects.toThrow();
  expect(calls).toBe(0);
});

test.each([422, 503])(
  "HTTP %s 的过大错误正文不改变已知状态含义",
  async (status) => {
    const item = record();
    await expect(
      sendRequest(
        { ...endpoint, method: "POST" },
        {},
        new AbortController().signal,
        item,
        async () => new Response("x".repeat(65_537), { status }),
      ),
    ).rejects.toMatchObject({
      code: `http_${status}`,
      unknownResult: status === 503,
    });
    expect(item.outcome).toBe(status === 503 ? "unknown" : "failed");
  },
);
