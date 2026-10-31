import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import { createTask } from "@/shared/state/task";
import { useRecords } from "@/shared/records/store";
import {
  ActionError,
  type Endpoint,
  type StepTools,
} from "@/shared/http/client";

function privateAction(
  run: (
    data: { privateValue: string; result: number },
    tools: StepTools,
  ) => void | Promise<void>,
) {
  return defineAction({
    id: "privacy.action",
    title: "敏感记录检查",
    input: z.object({ privateValue: z.string() }).strict(),
    inputFields: ["privateValue"],
    result: "result",
    fields: {
      privateValue: { title: "私有输入", schema: z.string(), secret: true },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [
      defineStep({
        id: "privacy.step",
        title: "处理私有输入",
        rule: "T-01",
        reads: ["privateValue"],
        writes: ["result"],
        uses: ["privacy.read"],
        run,
      }),
    ],
  });
}
const signal = () => new AbortController().signal;

test("任意名字的 secret 输入不会出现在步骤说明、错误或导出记录", async () => {
  const marker = "synthetic_private_8425";
  const action = privateAction((data, tools) => {
    tools.note(`处理 ${data.privateValue}，保留公开说明`);
    throw new Error(`无法处理 ${data.privateValue}`);
  });
  await expect(
    execute(action, { privateValue: marker }, [], signal()),
  ).rejects.toThrow();
  const record = useRecords().items.value[0]!;
  expect(JSON.stringify({ runs: [record] })).not.toContain(marker);
  expect(record.error).toContain("已隐藏");
  expect(record.steps[0]?.outputs[0]).toContain("保留公开说明");
});

test("后台回显长敏感值时先清理，再限制错误长度", async () => {
  const marker = "synthetic_long_private_".repeat(30);
  const endpoint: Endpoint = {
    id: "privacy.read",
    title: "隔离请求",
    method: "GET",
    path: "/api/privacy",
    response: z.number(),
  };
  const action = privateAction(async (data, tools) => {
    data.result = await tools.request("privacy.read");
  });
  await expect(
    execute(action, { privateValue: marker }, [endpoint], signal(), async () =>
      Response.json({ message: `输入 ${marker} 无效` }, { status: 401 }),
    ),
  ).rejects.toThrow("已隐藏");
  const exported = JSON.stringify(useRecords().items.value[0]);
  expect(exported).not.toContain(marker.slice(0, 100));
  expect(exported).toContain("输入 已隐藏 无效");
});

test("说明早于敏感输出赋值时，也隐藏嵌套和 JSON 转义后的值", async () => {
  const privateReply = {
    nested: { value: 'synthetic_"quoted_token' },
    number: 928451,
  };
  const action = defineAction({
    id: "privacy.output",
    title: "敏感输出检查",
    input: z.object({}).strict(),
    inputFields: [],
    result: "result",
    fields: {
      privateReply: {
        title: "私有响应",
        schema: z.object({
          nested: z.object({ value: z.string() }),
          number: z.number(),
        }),
        secret: true,
      },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [
      defineStep<{ privateReply: typeof privateReply; result: number }>({
        id: "privacy.output_step",
        title: "取得私有响应",
        rule: "T-02",
        reads: [],
        writes: ["privateReply", "result"],
        uses: [],
        run(data, tools) {
          tools.note(`响应 ${JSON.stringify(privateReply)}`);
          data.privateReply = privateReply;
          data.result = 1;
        },
      }),
    ],
  });
  await expect(execute(action, {}, [], signal())).resolves.toBe(1);
  const record = useRecords().items.value[0]!;
  expect(record.steps[0]?.outputs).toContain("私有响应：已隐藏");
  expect(record.steps[0]?.outputs[0]).not.toContain("synthetic_");
  expect(record.steps[0]?.outputs[0]).not.toContain("928451");
});

test("输入类型检查失败也不能记录 secret 原值", async () => {
  const marker = "synthetic_invalid_value";
  const base = privateAction((data) => {
    data.result = 1;
  });
  const action = defineAction({
    ...base,
    input: z
      .object({
        privateValue: z.string().refine(() => false, `输入 ${marker} 无效`),
      })
      .strict(),
  });
  await expect(
    execute(action, { privateValue: marker }, [], signal()),
  ).rejects.toMatchObject({
    message: "输入不符合要求，请修改对应字段。",
    fieldErrors: { privateValue: "输入不符合业务要求" },
  });
  const record = useRecords().items.value[0]!;
  expect(record.status).toBe("failed");
  expect(record.error).toBe("输入不符合要求，请修改对应字段。");
  expect(JSON.stringify(record)).not.toContain(marker);
});

test("没有敏感值的公开说明和原错误继续保留", async () => {
  const action = privateAction((_data, tools) => {
    tools.note("已经完成公开检查");
    throw new Error("公开计算失败");
  });
  await expect(
    execute(action, { privateValue: "synthetic_unused" }, [], signal()),
  ).rejects.toThrow("公开计算失败");
  const record = useRecords().items.value[0]!;
  expect(record.error).toBe("公开计算失败");
  expect(record.steps[0]?.error).toBe("公开计算失败");
  expect(record.steps[0]?.outputs[0]).toBe("已经完成公开检查");
});

test("secret 字段的默认值也按敏感数据处理", async () => {
  const marker = "synthetic_default_private";
  const action = defineAction({
    id: "privacy.default",
    title: "私有默认值",
    input: z.object({}).strict(),
    inputFields: [],
    result: "result",
    fields: {
      privateDefault: {
        title: "私有默认值",
        schema: z.string().default(marker),
        secret: true,
      },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [
      defineStep<{ privateDefault: string; result: number }>({
        id: "privacy.default_step",
        title: "使用私有默认值",
        rule: "T-03",
        reads: ["privateDefault"],
        writes: ["result"],
        uses: [],
        run(data, tools) {
          tools.note(`正在使用 ${data.privateDefault}`);
          data.result = 1;
        },
      }),
    ],
  });
  await execute(action, {}, [], signal());
  expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
});

test("本地计算失败传给页面的错误已清理，公开内容继续保留", async () => {
  const marker = "synthetic_visible_secret_8842";
  const action = privateAction((data) => {
    throw new Error(`公开失败：${data.privateValue}`);
  });
  const task = createTask(action, [], "latest");
  await task.run({ privateValue: marker });
  expect(task.state.value.status).toBe("error");
  expect(task.state.value.error).toBe("公开失败：已隐藏");
  expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
  const failure = await execute(
    action,
    { privateValue: marker },
    [],
    signal(),
  ).then(
    () => null,
    (error: unknown) => error,
  );
  expect(failure).toMatchObject({ message: "公开失败：已隐藏" });
  expect(failure).not.toHaveProperty("cause");
});

test("写入成功后的本地失败仍为结果未知，不泄漏凭据，也不允许再次提交", async () => {
  const marker = "synthetic_after_write_private";
  const base = privateAction((data) => {
    throw new Error(`后续计算失败 ${data.privateValue}`);
  });
  const action = defineAction({
    ...base,
    steps: [
      defineStep<{ privateValue: string; result: number }>({
        id: "privacy.save",
        title: "隔离保存",
        rule: "T-04",
        reads: [],
        writes: [],
        uses: ["privacy.save"],
        async run(_data, tools) {
          await tools.request("privacy.save", { body: {} });
        },
      }),
      ...base.steps,
    ],
  });
  const endpoint: Endpoint = {
    id: "privacy.save",
    title: "隔离保存",
    method: "POST",
    path: "/api/privacy",
    response: z.null(),
  };
  let calls = 0;
  const task = createTask(action, [endpoint], "submit", async () => {
    calls++;
    return Response.json(null);
  });
  await task.run({ privateValue: marker });
  expect(task.state.value.status).toBe("unknown");
  expect(task.state.value.error).toContain("后续计算失败 已隐藏");
  expect(task.state.value.error).toContain("已有后台写入操作成功");
  expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
  await task.run({ privateValue: marker });
  expect(calls).toBe(1);
  await expect(
    execute(action, { privateValue: marker }, [endpoint], signal(), async () =>
      Response.json(null),
    ),
  ).rejects.toMatchObject({ code: "after_write_failed", unknownResult: true });
});

test("请求编号和后台运行编号回显嵌套敏感值时，完整导出也已清理", async () => {
  const marker = "synthetic_header_secret_5931";
  const id = "d9410c0f-19a1-439d-9842-fcc5705143aa";
  const action = defineAction({
    id: "privacy.headers",
    title: "请求编号清理",
    input: z
      .object({ privateValue: z.object({ nested: z.string() }) })
      .strict(),
    inputFields: ["privateValue"],
    result: "result",
    fields: {
      privateValue: {
        title: "私有输入",
        schema: z.object({ nested: z.string() }),
        secret: true,
      },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [
      defineStep<{ privateValue: { nested: string }; result: number }>({
        id: "privacy.header_step",
        title: "读取公开结果",
        rule: "T-05",
        reads: [],
        writes: ["result"],
        uses: ["privacy.read"],
        async run(data, tools) {
          data.result = await tools.request("privacy.read");
        },
      }),
    ],
  });
  const endpoint: Endpoint = {
    id: "privacy.read",
    title: "隔离请求",
    method: "GET",
    path: "/api/privacy",
    response: z.number(),
  };
  for (const value of [marker, id]) {
    await execute(
      action,
      { privateValue: { nested: marker } },
      [endpoint],
      signal(),
      async () =>
        Response.json(1, {
          headers: { "X-Request-ID": value, "X-Run-ID": value },
        }),
    );
    const record = useRecords().items.value[0]!;
    expect(JSON.stringify(record)).not.toContain(marker);
    expect(record.steps[0]?.requests[0]?.requestId).toBe(
      value === marker ? "已隐藏" : id,
    );
    expect(record.steps[0]?.requests[0]?.backendRun).toBe(
      value === marker ? "已隐藏" : id,
    );
  }
});

test("敏感输入碰巧与合法错误码相同，不改变调用方的错误分类", async () => {
  const action = privateAction(() => {
    throw new ActionError("compute_failed", "公开计算失败");
  });
  await expect(
    execute(action, { privateValue: "compute_failed" }, [], signal()),
  ).rejects.toMatchObject({
    code: "compute_failed",
    message: "公开计算失败",
    unknownResult: false,
  });
});

test.each(["default", "transform"] as const)(
  "secret %s 的派生值在对象校验失败后也不泄漏",
  async (kind) => {
    const marker = `synthetic_derived_${kind}_secret`;
    const schema =
      kind === "default"
        ? z.string().default(marker)
        : z.string().transform(() => marker);
    const base = privateAction((data) => {
      data.result = 1;
    });
    const action = defineAction({
      ...base,
      input: z.object({ privateValue: schema }).superRefine((data, context) => {
        context.addIssue({
          code: "custom",
          path: ["privateValue", data.privateValue],
          message: `无法处理 ${data.privateValue}`,
        });
        context.addIssue({
          code: "custom",
          path: [data.privateValue],
          message: `私有路径 ${data.privateValue}`,
        });
      }),
      fields: {
        ...base.fields,
        privateValue: { title: "私有输入", schema, secret: true },
      },
    });
    const input = (
      kind === "default" ? {} : { privateValue: "synthetic_original_value" }
    ) as { privateValue: string };
    const task = createTask(action, [], "submit");
    await task.run(input);
    expect(task.state.value).toMatchObject({
      status: "error",
      fieldErrors: { privateValue: "输入不符合业务要求" },
    });
    expect(JSON.stringify(task.state.value)).not.toContain(marker);
    const failure = await execute(action, input, [], signal()).then(
      () => null,
      (error: unknown) => error,
    );
    expect(JSON.stringify(failure)).not.toContain(marker);
    expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
  },
);

test.each(["default", "transform"] as const)(
  "未列为输入的 secret %s 默认字段也不泄漏",
  async (kind) => {
    const marker = `synthetic_unlisted_${kind}_secret`;
    const schema =
      kind === "default"
        ? z.string().default(marker)
        : z
            .string()
            .default("原始默认值")
            .transform(() => marker);
    const base = privateAction((data) => {
      data.result = 1;
    });
    const action = defineAction({
      ...base,
      inputFields: [],
      input: z.object({ privateValue: schema }).superRefine((data, context) => {
        context.addIssue({
          code: "custom",
          path: [data.privateValue],
          message: `无法处理 ${data.privateValue}`,
        });
      }),
      fields: {
        ...base.fields,
        privateValue: { title: "私有默认值", schema, secret: true },
      },
    });
    const input = {} as { privateValue: string };
    const task = createTask(action, [], "submit");
    await task.run(input);
    expect(task.state.value.status).toBe("error");
    expect(Object.keys(task.state.value.fieldErrors!)).toEqual([]);
    expect(JSON.stringify(task.state.value)).not.toContain(marker);
    const failure = await execute(action, input, [], signal()).then(
      () => null,
      (error: unknown) => error,
    );
    expect(JSON.stringify(failure)).not.toContain(marker);
    expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
  },
);

test.each(["default", "transform"] as const)(
  "成功解析的非输入 secret %s 也不能进入步骤说明与异常",
  async (kind) => {
    const marker = `synthetic_parsed_${kind}_secret`;
    const schema =
      kind === "default"
        ? z.string().default(marker)
        : z
            .string()
            .default("原始默认值")
            .transform(() => marker);
    const base = privateAction((data, tools) => {
      tools.note(`说明 ${data.privateValue}`);
      throw new Error(`失败 ${data.privateValue}`);
    });
    const action = defineAction({
      ...base,
      inputFields: [],
      input: z.object({ privateValue: schema }),
      fields: {
        ...base.fields,
        privateValue: { title: "私有默认值", schema, secret: true },
      },
    });
    const input = {} as { privateValue: string };
    const task = createTask(action, [], "submit");
    await task.run(input);
    expect(task.state.value.error).toBe("失败 已隐藏");
    expect(JSON.stringify(task.state.value)).not.toContain(marker);
    await expect(execute(action, input, [], signal())).rejects.toThrow(
      "失败 已隐藏",
    );
    expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
  },
);
