import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { createTask } from "@/shared/state/task";
import { useRecords } from "@/shared/records/store";
import { execute } from "@/shared/actions/runtime";
import { ActionError } from "@/shared/http/client";
const pending = new Map<number, (value: number) => void>();
const flow = defineAction({
  id: "race.read",
  title: "查询",
  input: z.object({ value: z.number() }),
  inputFields: ["value"],
  fields: {
    value: { title: "条件", schema: z.number() },
    result: { title: "结果", schema: z.number() },
  },
  result: "result",
  steps: [
    defineStep<{ value: number; result: number }>({
      id: "race.step",
      title: "等待查询",
      rule: "T-03",
      reads: ["value"],
      writes: ["result"],
      uses: [],
      async run(d) {
        d.result = await new Promise<number>((resolve) =>
          pending.set(d.value, resolve),
        );
      },
    }),
  ],
});
test("旧查询晚返回也不能盖掉新查询结果", async () => {
  const task = createTask(flow, [], "latest");
  const old = task.run({ value: 1 });
  const next = task.run({ value: 2 });
  pending.get(2)!(200);
  await next;
  pending.get(1)!(100);
  await old;
  expect(task.state.value.data).toBe(200);
});
test("重复提交只执行一次，页面释放后不再写回", async () => {
  const task = createTask(flow, [], "submit");
  const first = task.run({ value: 3 });
  await task.run({ value: 4 });
  expect(pending.has(4)).toBe(false);
  task.dispose();
  pending.get(3)!(3);
  await first;
  expect(task.state.value.status).not.toBe("success");
});

test("写入不能用 latest；页面离开继续记录后台已完成的结果", async () => {
  const endpoint = {
    id: "save",
    title: "保存",
    method: "POST" as const,
    path: "/api/save",
    response: z.null(),
  };
  const action = defineAction({
    id: "race.save",
    title: "保存",
    input: z.object({}),
    inputFields: [],
    fields: { result: { title: "保存结果", schema: z.null() } },
    result: "result",
    steps: [
      defineStep<{ result: null }>({
        id: "race.save_step",
        title: "写入",
        rule: "T-04",
        reads: [],
        writes: ["result"],
        uses: ["save"],
        async run(d, tools) {
          d.result = await tools.request("save");
        },
      }),
    ],
  });
  expect(() => createTask(action, [endpoint], "latest")).toThrow("submit");
  let complete!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  const task = createTask(
    action,
    [endpoint],
    "submit",
    async (_url, options) => {
      signal = options?.signal || undefined;
      return new Promise<Response>((resolve) => {
        complete = resolve;
      });
    },
  );
  const pending = task.run({});
  task.dispose();
  expect(signal?.aborted).toBe(false);
  complete(new Response(null, { status: 204 }));
  await pending;
  const { useRecords } = await import("@/shared/records/store");
  expect(
    useRecords().items.value.find((run) => run.action === "race.save")?.status,
  ).toBe("ok");
  expect(task.state.value.status).not.toBe("success");
});

const saveEndpoints = ["first", "second"].map((id) => ({
  id,
  title: id,
  method: "POST" as const,
  path: `/api/${id}`,
  response: z.number(),
}));
function saveThenFail(
  kind: "throw" | "type" | "same_type" | "second" | "before",
) {
  return defineAction({
    id: `race.partial_${kind}`,
    title: "保存后继续处理",
    input: z.object({ value: z.number() }),
    inputFields: ["value"],
    fields: {
      value: { title: "输入", schema: z.number() },
      saved: { title: "已保存结果", schema: z.number() },
      result: { title: "最终结果", schema: z.number() },
    },
    result: "result",
    steps: [
      defineStep<{ value: number; saved: number }>({
        id: `race.first_${kind}`,
        title: "首次保存",
        rule: "T-04",
        reads: ["value"],
        writes: ["saved"],
        uses: ["first"],
        async run(d, tools) {
          if (kind === "before" && d.value < 0) throw new Error("输入需要修正");
          const saved = await tools.request<number>("first");
          d.saved =
            kind === "same_type" ? ("错误类型" as unknown as number) : saved;
        },
      }),
      defineStep<{ saved: number; result: number | string }>({
        id: `race.after_${kind}`,
        title: "后续处理",
        rule: "T-04",
        reads: ["saved"],
        writes: ["result"],
        uses: ["second"],
        async run(d, tools) {
          if (kind === "throw") throw new Error("后续计算失败");
          d.result =
            kind === "type"
              ? "错误类型"
              : kind === "second"
                ? await tools.request<number>("second")
                : d.saved;
        },
      }),
    ],
  });
}

test.each(["throw", "type", "same_type", "second"] as const)(
  "写入成功后 %s 失败保留成功请求，禁止整个动作重发",
  async (kind) => {
    const calls: string[] = [];
    const transport: typeof fetch = async (url) => {
      calls.push(String(url));
      return String(url).endsWith("second")
        ? new Response(JSON.stringify({ message: "第二接口拒绝" }), {
            status: 403,
          })
        : new Response("1", { status: 200 });
    };
    const action = saveThenFail(kind);
    const task = createTask(action, saveEndpoints, "submit", transport);
    await task.run({ value: 1 });
    expect(task.state.value.status).toBe("unknown");
    expect(task.state.value.error).toMatch(/已有.*成功.*后续.*失败/);
    expect(task.state.value.error).toContain("查询");
    expect(task.state.value.error).toContain(
      kind === "throw"
        ? "后续计算失败"
        : kind === "second"
          ? "第二接口拒绝"
          : "类型不符合",
    );
    const record = useRecords().items.value.find(
      (run) => run.action === action.id,
    )!;
    expect(record.status).toBe("unknown");
    expect(record.steps[0]!.requests[0]!.outcome).toBe("ok");
    expect(record.steps[0]!.requests[0]!.status).toBe(200);
    if (kind === "second")
      expect(record.steps[1]!.requests[0]!.outcome).toBe("failed");
    await task.run({ value: 2 });
    expect(calls).toEqual(
      kind === "second" ? ["/api/first", "/api/second"] : ["/api/first"],
    );
    await expect(
      execute(
        action,
        { value: 1 },
        saveEndpoints,
        new AbortController().signal,
        transport,
      ),
    ).rejects.toMatchObject({ unknownResult: true });
  },
);

test("离页后写入成功但后续失败仍保留真实请求和未全部完成记录", async () => {
  const action = saveThenFail("throw");
  const task = createTask(
    action,
    saveEndpoints,
    "submit",
    async () => new Response("1"),
  );
  const pending = task.run({ value: 1 });
  task.dispose();
  await pending;
  const record = useRecords().items.value.find(
    (run) => run.action === action.id,
  )!;
  expect(record.status).toBe("unknown");
  expect(record.steps[0]!.requests[0]!.outcome).toBe("ok");
  expect(record.steps[1]!.error).toBe("后续计算失败");
  expect(task.state.value.status).toBe("loading");
});

test("写入前计算和输入错误可修正重试，明确首次请求失败也可重试", async () => {
  let calls = 0;
  const task = createTask(
    saveThenFail("before"),
    saveEndpoints,
    "submit",
    async () => {
      calls++;
      return calls === 1
        ? new Response(JSON.stringify({ message: "首次保存拒绝" }), {
            status: 403,
          })
        : new Response("1");
    },
  );
  await task.run({ value: "错误输入" as unknown as number });
  expect(task.state.value.status).toBe("error");
  await task.run({ value: -1 });
  expect(task.state.value.error).toBe("输入需要修正");
  expect(calls).toBe(0);
  await task.run({ value: 1 });
  expect(task.state.value.status).toBe("error");
  await task.run({ value: 1 });
  expect(task.state.value.status).toBe("success");
  expect(calls).toBe(2);
});

test("没有实际发送的写请求错误可以修正重试", async () => {
  const action = saveThenFail("before");
  let calls = 0;
  const endpoints = saveEndpoints.map((endpoint) => ({
    ...endpoint,
    path: "/api/:missing",
  }));
  const task = createTask(action, endpoints, "submit", async () => {
    calls++;
    return new Response("1");
  });
  await task.run({ value: 1 });
  expect(task.state.value.status).toBe("error");
  endpoints[0]!.path = "/api/first";
  await task.run({ value: 1 });
  expect(task.state.value.status).toBe("success");
  expect(calls).toBe(1);
});

test("纯计算失败可修正再执行", async () => {
  let valid = false;
  const action = {
    ...flow,
    steps: [
      defineStep<{ value: number; result: number }>({
        id: "race.compute",
        title: "计算",
        rule: "T-03",
        reads: ["value"],
        writes: ["result"],
        uses: [],
        run(d) {
          if (!valid) throw new ActionError("compute_failed", "计算失败");
          d.result = d.value;
        },
      }),
    ],
  };
  const task = createTask(action, [], "submit");
  await task.run({ value: 1 });
  expect(task.state.value.status).toBe("error");
  valid = true;
  await task.run({ value: 2 });
  expect(task.state.value.data).toBe(2);
});
