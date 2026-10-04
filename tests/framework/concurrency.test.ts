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
