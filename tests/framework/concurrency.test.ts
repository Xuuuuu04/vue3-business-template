import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { createTask } from "@/shared/state/task";
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
