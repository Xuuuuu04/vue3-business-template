/** 使用故意写错的步骤验证运行限制，不只测试正确路径。 */
import { expect, test } from "vitest";
import { z } from "zod";
import {
  defineAction,
  defineStep,
  type Step,
} from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import { useRecords } from "@/shared/records/store";
function action(run: Step["run"], reads = ["input"], writes = ["result"]) {
  return defineAction({
    id: "test.action",
    title: "测试动作",
    input: z.object({ input: z.number() }),
    inputFields: ["input"],
    fields: {
      input: { title: "输入数字", schema: z.number() },
      result: { title: "结果数字", schema: z.number() },
      other: { title: "其他值", schema: z.number().default(2) },
    },
    result: "result",
    steps: [
      defineStep({
        id: "test.step",
        title: "计算",
        rule: "T-01",
        reads,
        writes,
        uses: [],
        run,
      }),
    ],
  });
}
const signal = () => new AbortController().signal;
test("未声明读取与写入明确失败", async () => {
  await expect(
    execute(
      action((d) => {
        d.result = d.other;
      }),
      { input: 1 },
      [],
      signal(),
    ),
  ).rejects.toThrow("读取未声明字段");
  await expect(
    execute(
      action((d) => {
        d.other = 5;
        d.result = 1;
      }),
      { input: 1 },
      [],
      signal(),
    ),
  ).rejects.toThrow("写入未声明字段");
});
test("输出类型、缺少产出与 return 均不能偷偷通过", async () => {
  await expect(
    execute(
      action((d) => {
        d.result = "错误";
      }),
      { input: 1 },
      [],
      signal(),
    ),
  ).rejects.toThrow("值类型");
  await expect(
    execute(
      action(() => {}),
      { input: 1 },
      [],
      signal(),
    ),
  ).rejects.toThrow("没有写入");
  await expect(
    execute(
      action((() => 3) as unknown as Step["run"]),
      { input: 1 },
      [],
      signal(),
    ),
  ).rejects.toThrow("必须写入");
});
test("非法输入也会完成失败记录，不能留在执行中", async () => {
  await expect(
    execute(
      action((d) => {
        d.result = 1;
      }),
      { input: "错" } as unknown as { input: number },
      [],
      signal(),
    ),
  ).rejects.toThrow();
  expect(useRecords().items.value[0]?.status).toBe("failed");
});
test("计算图拒绝读前未写、多个写入者与不确定的条件结果", () => {
  const base = action((d) => {
    d.result = 1;
  });
  expect(() =>
    defineAction({
      ...base,
      steps: [{ ...base.steps[0]!, reads: ["result"] }],
    }),
  ).toThrow("尚无来源");
  expect(() =>
    defineAction({
      ...base,
      steps: [base.steps[0]!, { ...base.steps[0]!, id: "test.second" }],
    }),
  ).toThrow("多个写入者");
  expect(() =>
    defineAction({
      ...base,
      steps: [
        {
          ...base.steps[0]!,
          when: { id: "yes", title: "条件", reads: [], run: () => true },
        },
      ],
    }),
  ).toThrow("可能没有值");
});
test("不能经嵌套对象、属性描述或数组原地修改输入", async () => {
  const input = z.object({ list: z.array(z.object({ value: z.number() })) });
  for (const change of [
    (d: Record<string, unknown>) => {
      (d.list as { value: number }[])[0]!.value = 4;
    },
    (d: Record<string, unknown>) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        (d.list as object[])[0]!,
        "value",
      )!;
      Object.defineProperty((d.list as object[])[0]!, "value", {
        value: descriptor.value + 1,
      });
    },
    (d: Record<string, unknown>) => {
      (d.list as unknown[]).push({ value: 2 });
    },
  ]) {
    const flow = defineAction({
      id: "test.nested",
      title: "嵌套数据",
      input,
      inputFields: ["list"],
      fields: {
        list: { title: "原列表", schema: input.shape.list },
        result: { title: "结果", schema: z.number() },
      },
      result: "result",
      steps: [
        defineStep({
          id: "test.nest",
          title: "错误修改",
          rule: "T-02",
          reads: ["list"],
          writes: ["result"],
          uses: [],
          run: change,
        }),
      ],
    });
    await expect(
      execute(flow, { list: [{ value: 1 }] }, [], signal()),
    ).rejects.toThrow("只读");
  }
});
test("默认输出只记录长度，密码和文件正文不保存", async () => {
  const flow = action((d) => {
    d.result = 12;
  });
  await execute(flow, { input: 7 }, [], signal());
  const latest = useRecords().items.value[0]!;
  expect(latest.steps[0]?.outputs).toContain("结果数字：12");
  expect(latest.elapsed).toBeGreaterThanOrEqual(0);
});
test("记录超过容量仍有明确移除数量", async () => {
  for (let i = 0; i < 110; i++)
    await execute(
      action((d) => {
        d.result = i;
      }),
      { input: i },
      [],
      signal(),
    );
  expect(useRecords().items.value).toHaveLength(100);
  expect(useRecords().dropped()).toBeGreaterThan(0);
});
