import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import {
  defineAction,
  defineStep,
  type Step,
} from "@/shared/actions/definitions";
import { execute, setAuthorization } from "@/shared/actions/runtime";
import { setAccessToken, type Endpoint } from "@/shared/http/client";
import { createTask } from "@/shared/state/task";
import { useRecords } from "@/shared/records/store";

const endpoints: Endpoint[] = ["first", "second"].map((id) => ({
  id,
  title: id,
  method: "POST",
  path: `/api/${id}`,
  response: z.number(),
}));
function operation(run: Step["run"]) {
  return defineAction({
    id: "lifecycle.save",
    title: "保存",
    permission: "lifecycle.write",
    input: z.object({}).strict(),
    inputFields: [],
    result: "result",
    fields: { result: { title: "结果", schema: z.number() } },
    steps: [
      defineStep({
        id: "lifecycle.request",
        title: "发送请求",
        rule: "T-01",
        reads: [],
        writes: ["result"],
        uses: ["first", "second"],
        run,
      }),
    ],
  });
}
afterEach(() => {
  setAccessToken("");
  setAuthorization(() => true);
});

test("会话改变后旧操作不再发送下一次请求，也不把旧结果写入页面", async () => {
  let release!: (response: Response) => void;
  const calls: string[] = [];
  setAccessToken("test-first");
  const task = createTask(
    operation(async (data, tools) => {
      await tools.request("first");
      data.result = await tools.request("second");
    }),
    endpoints,
    "submit",
    async (url) => {
      calls.push(String(url));
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    },
  );
  const pending = task.run({});
  setAccessToken("test-second");
  release(new Response("1"));
  await pending;
  expect(calls).toEqual(["/api/first"]);
  expect(task.state.value).toEqual({ status: "idle" });
  expect(useRecords().items.value[0]?.status).toBe("unknown");
});

test("同一个步骤的每次请求都核对动作自身权限", async () => {
  let permitted = true;
  let calls = 0;
  setAuthorization(
    (permission) => permission === "lifecycle.write" && permitted,
  );
  const action = operation(async (data, tools) => {
    await tools.request("first");
    permitted = false;
    data.result = await tools.request("second");
  });
  await expect(
    execute(action, {}, endpoints, new AbortController().signal, async () => {
      calls++;
      return new Response("1");
    }),
  ).rejects.toMatchObject({ code: "not_allowed", unknownResult: true });
  expect(calls).toBe(1);
});

test("并发写入有一项失败时，等待其它已发送请求后记录实际结果，不能重发", async () => {
  let release!: (response: Response) => void;
  let calls = 0;
  const action = operation(async (data, tools) => {
    const values = await Promise.all([
      tools.request<number>("first"),
      tools.request<number>("second"),
    ]);
    data.result = values[0];
  });
  const task = createTask(action, endpoints, "submit", async (url) => {
    calls++;
    if (String(url).endsWith("first"))
      return new Response("{}", { status: 403 });
    return new Promise<Response>((resolve) => {
      release = resolve;
    });
  });
  const pending = task.run({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(task.state.value.status).toBe("loading");
  await task.run({});
  expect(calls).toBe(2);
  release(new Response("2"));
  await pending;
  expect(task.state.value.status).toBe("unknown");
  expect(
    useRecords().items.value[0]?.steps[0]?.requests.map(
      (request) => request.outcome,
    ),
  ).toEqual(["failed", "ok"]);
  await task.run({});
  expect(calls).toBe(2);
});

test("步骤没有等待的请求失败时，整个动作也不能报成功", async () => {
  const action = operation((data, tools) => {
    void tools.request("first");
    data.result = 1;
  });
  await expect(
    execute(
      action,
      {},
      endpoints,
      new AbortController().signal,
      async () => new Response("{}", { status: 503 }),
    ),
  ).rejects.toMatchObject({ unknownResult: true });
});

test("日期字段可以读取，不能通过设置方法改动原值", async () => {
  const date = new Date("2026-10-31T00:00:00Z");
  function action(mutate: boolean) {
    return defineAction({
      id: "date.read",
      title: "读取日期",
      input: z.object({ date: z.date() }),
      inputFields: ["date"],
      result: "value",
      fields: {
        date: { title: "时间", schema: z.date() },
        value: { title: "毫秒", schema: z.number() },
      },
      steps: [
        defineStep<{ date: Date; value: number }>({
          id: "date.value",
          title: "日期换算",
          rule: "T-02",
          reads: ["date"],
          writes: ["value"],
          uses: [],
          run(data) {
            if (mutate) data.date.setTime(0);
            data.value = data.date.getTime();
          },
        }),
      ],
    });
  }
  await expect(
    execute(action(false), { date }, [], new AbortController().signal),
  ).resolves.toBe(date.getTime());
  await expect(
    execute(action(true), { date }, [], new AbortController().signal),
  ).rejects.toMatchObject({ code: "readonly_change" });
  expect(date.toISOString()).toBe("2026-10-31T00:00:00.000Z");
});

test("步骤可以按业务规则处理明确的查询失败，转换后的业务错误不会被覆盖", async () => {
  const { ActionError } = await import("@/shared/http/client");
  const reads = endpoints.map((endpoint) => ({
    ...endpoint,
    method: "GET" as const,
  }));
  const fallback = operation(async (data, tools) => {
    try {
      data.result = await tools.request("first");
    } catch (error) {
      if (!(error instanceof ActionError) || error.code !== "http_404")
        throw error;
      data.result = 0;
    }
  });
  await expect(
    execute(
      fallback,
      {},
      reads,
      new AbortController().signal,
      async () => new Response("{}", { status: 404 }),
    ),
  ).resolves.toBe(0);
  const converted = operation(async (_data, tools) => {
    try {
      await tools.request("first");
    } catch (error) {
      if (!(error instanceof ActionError) || error.code !== "http_404")
        throw error;
      throw new ActionError("record_missing", "指定记录不存在");
    }
  });
  await expect(
    execute(
      converted,
      {},
      reads,
      new AbortController().signal,
      async () => new Response("{}", { status: 404 }),
    ),
  ).rejects.toMatchObject({
    code: "record_missing",
    message: "指定记录不存在",
    unknownResult: false,
  });
});
