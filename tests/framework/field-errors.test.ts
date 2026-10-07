import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { createTask } from "@/shared/state/task";
import { fieldErrorsFrom } from "@/shared/http/field-errors";
import { useRecords } from "@/shared/records/store";
import type { Endpoint } from "@/shared/http/client";

const endpoint: Endpoint = {
  id: "fields.save",
  title: "保存",
  method: "POST",
  path: "/api/fields",
  response: z.number(),
};
const Input = z.object({
  name: z.string().min(1, "请填写名称"),
  privateValue: z.string(),
  lines: z.array(z.object({ quantity: z.number().int() })),
});
type Work = z.infer<typeof Input> & { result: number };
const action = defineAction({
  id: "fields.save",
  title: "保存字段",
  input: Input,
  inputFields: ["name", "privateValue", "lines"],
  result: "result",
  fields: {
    name: { title: "名称", schema: z.string() },
    privateValue: { title: "私有输入", schema: z.string(), secret: true },
    lines: { title: "明细", schema: Input.shape.lines },
    result: { title: "保存编号", schema: z.number() },
  },
  steps: [
    defineStep<Work>({
      id: "fields.send",
      title: "发送",
      rule: "T-01",
      reads: ["name", "privateValue", "lines"],
      writes: ["result"],
      uses: [endpoint.id],
      async run(data, tools) {
        data.result = await tools.request(endpoint.id, {
          body: {
            name: data.name,
            privateValue: data.privateValue,
            lines: data.lines,
          },
        });
      },
    }),
  ],
});
const input = {
  name: "测试名称",
  privateValue: "synthetic_private_481",
  lines: [{ quantity: 1 }],
};
const rejected = () =>
  Response.json(
    {
      code: "invalid_input",
      message: "请修改输入",
      fields: [
        { field: "lines.0.quantity", problem: "数量太小" },
        { field: "privateValue", problem: `不能使用 ${input.privateValue}` },
        { field: `lines.${input.privateValue}`, problem: "私有路径" },
      ],
    },
    { status: 422 },
  );

test("真实错误结构逐字段传到只读状态，敏感说明与路径已清理", async () => {
  const task = createTask(action, [endpoint], "submit", async () => rejected());
  const draft = structuredClone(input);
  await task.run(draft);
  expect(task.state.value).toMatchObject({
    status: "error",
    error: "请修改输入",
    fieldErrors: {
      "lines.0.quantity": "数量太小",
      privateValue: "不能使用 已隐藏",
    },
  });
  expect(Object.keys(task.state.value.fieldErrors!)).toEqual([
    "lines.0.quantity",
    "privateValue",
  ]);
  expect(draft).toEqual(input);
  expect(JSON.stringify(task.state.value)).not.toContain(input.privateValue);
  expect(JSON.stringify(useRecords().items.value[0])).not.toContain(
    input.privateValue,
  );
});

test("本地嵌套校验在请求前提供中文错误，保留业务自定义说明", async () => {
  let calls = 0;
  const publicAction = defineAction({
    ...action,
    fields: {
      ...action.fields,
      privateValue: { ...action.fields.privateValue!, secret: false },
    },
  });
  const task = createTask(publicAction, [endpoint], "submit", async () => {
    calls++;
    return Response.json(1);
  });
  await task.run({ ...input, name: "", lines: [{ quantity: 1.5 }] });
  expect(task.state.value.status).toBe("error");
  expect(task.state.value.error).toBe("输入不符合要求，请修改对应字段。");
  expect(task.state.value.fieldErrors?.name).toBe("请填写名称");
  expect(task.state.value.fieldErrors?.["lines.0.quantity"]).toMatch(/整数/);
  expect(calls).toBe(0);
});

test("再次请求会清除旧字段错误；结果未知不指示字段错误且不能重发", async () => {
  let calls = 0;
  let finish!: (reply: Response) => void;
  const task = createTask(action, [endpoint], "submit", async () => {
    calls++;
    return calls === 1
      ? rejected()
      : new Promise<Response>((resolve) => {
          finish = resolve;
        });
  });
  await task.run(input);
  const next = task.run(input);
  expect(task.state.value.fieldErrors).toBeUndefined();
  finish(
    Response.json(
      { message: "暂时失败", fields: [{ field: "name", problem: "不能重发" }] },
      { status: 503 },
    ),
  );
  await next;
  expect(task.state.value.status).toBe("unknown");
  expect(task.state.value.fieldErrors).toBeUndefined();
  await task.run(input);
  expect(calls).toBe(2);
});

test("旧查询的字段错误不能覆盖后来的成功结果", async () => {
  const finishes: ((reply: Response) => void)[] = [];
  const task = createTask(
    action,
    [{ ...endpoint, method: "GET" }],
    "latest",
    async () => new Promise<Response>((resolve) => finishes.push(resolve)),
  );
  const old = task.run(input);
  const current = task.run(input);
  finishes[1]!(Response.json(2));
  await current;
  finishes[0]!(rejected());
  await old;
  expect(task.state.value).toEqual({ status: "success", data: 2 });
});

test("字段错误数量、长度和路径受限，不接受原型键及畸形数据", () => {
  const clean = (text: string) => text;
  const result = fieldErrorsFrom(
    [
      null,
      { field: "__proto__", problem: "非法" },
      { field: "x.constructor.y", problem: "非法" },
      { field: "x/0", problem: "非法" },
      { field: "x.01", problem: "非法" },
      { field: "x", problem: 1 },
      { field: "x", problem: "a".repeat(500) },
      { field: "x", problem: "第二项" },
    ],
    clean,
  );
  expect(Object.keys(result)).toEqual(["x"]);
  expect(result.x?.length).toBe(300);
  expect(Object.getPrototypeOf(result)).toBeNull();
  expect(Object.isFrozen(result)).toBe(true);
  expect(
    Object.keys(
      fieldErrorsFrom(
        Array.from({ length: 100 }, (_, i) => ({
          field: `lines.${i}.quantity`,
          problem: "错误",
        })),
        clean,
      ),
    ),
  ).toHaveLength(50);
});
