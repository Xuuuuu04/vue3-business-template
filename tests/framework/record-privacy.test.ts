import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import { useRecords } from "@/shared/records/store";
import type { Endpoint, StepTools } from "@/shared/http/client";

function privateAction(run: (data: { privateValue: string; result: number }, tools: StepTools) => void | Promise<void>) {
  return defineAction({
    id: "privacy.action", title: "敏感记录检查", input: z.object({ privateValue: z.string() }).strict(),
    inputFields: ["privateValue"], result: "result",
    fields: {
      privateValue: { title: "私有输入", schema: z.string(), secret: true },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [defineStep({
      id: "privacy.step", title: "处理私有输入", rule: "T-01",
      reads: ["privateValue"], writes: ["result"], uses: ["privacy.read"], run,
    })],
  });
}
const signal = () => new AbortController().signal;

test("任意名字的 secret 输入不会出现在步骤说明、错误或导出记录", async () => {
  const marker = "synthetic_private_8425";
  const action = privateAction((data, tools) => {
    tools.note(`处理 ${data.privateValue}，保留公开说明`);
    throw new Error(`无法处理 ${data.privateValue}`);
  });
  await expect(execute(action, { privateValue: marker }, [], signal())).rejects.toThrow();
  const record = useRecords().items.value[0]!;
  expect(JSON.stringify({ runs: [record] })).not.toContain(marker);
  expect(record.error).toContain("已隐藏");
  expect(record.steps[0]?.outputs[0]).toContain("保留公开说明");
});

test("后台回显长敏感值时先清理，再限制错误长度", async () => {
  const marker = "synthetic_long_private_".repeat(30);
  const endpoint: Endpoint = {
    id: "privacy.read", title: "隔离请求", method: "GET", path: "/api/privacy", response: z.number(),
  };
  const action = privateAction(async (data, tools) => {
    data.result = await tools.request("privacy.read");
  });
  await expect(execute(action, { privateValue: marker }, [endpoint], signal(), async () =>
    Response.json({ message: `输入 ${marker} 无效` }, { status: 401 }),
  )).rejects.toThrow("已隐藏");
  const exported = JSON.stringify(useRecords().items.value[0]);
  expect(exported).not.toContain(marker.slice(0, 100));
  expect(exported).toContain("输入 已隐藏 无效");
});

test("说明早于敏感输出赋值时，也隐藏嵌套和 JSON 转义后的值", async () => {
  const privateReply = { nested: { value: 'synthetic_"quoted_token' }, number: 928451 };
  const action = defineAction({
    id: "privacy.output", title: "敏感输出检查", input: z.object({}).strict(), inputFields: [], result: "result",
    fields: {
      privateReply: { title: "私有响应", schema: z.object({ nested: z.object({ value: z.string() }), number: z.number() }), secret: true },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [defineStep<{ privateReply: typeof privateReply; result: number }>({
      id: "privacy.output_step", title: "取得私有响应", rule: "T-02", reads: [], writes: ["privateReply", "result"], uses: [],
      run(data, tools) {
        tools.note(`响应 ${JSON.stringify(privateReply)}`);
        data.privateReply = privateReply;
        data.result = 1;
      },
    })],
  });
  await expect(execute(action, {}, [], signal())).resolves.toBe(1);
  const record = useRecords().items.value[0]!;
  expect(record.steps[0]?.outputs).toContain("私有响应：已隐藏");
  expect(record.steps[0]?.outputs[0]).not.toContain("synthetic_");
  expect(record.steps[0]?.outputs[0]).not.toContain("928451");
});

test("输入类型检查失败也不能记录 secret 原值", async () => {
  const marker = "synthetic_invalid_value";
  const base = privateAction((data) => { data.result = 1; });
  const action = defineAction({
    ...base,
    input: z.object({ privateValue: z.string().refine(() => false, `输入 ${marker} 无效`) }).strict(),
  });
  await expect(execute(action, { privateValue: marker }, [], signal())).rejects.toThrow();
  const record = useRecords().items.value[0]!;
  expect(record.status).toBe("failed");
  expect(record.error).toContain("已隐藏");
  expect(JSON.stringify(record)).not.toContain(marker);
});

test("没有敏感值的公开说明和原错误继续保留", async () => {
  const action = privateAction((_data, tools) => {
    tools.note("已经完成公开检查");
    throw new Error("公开计算失败");
  });
  await expect(execute(action, { privateValue: "synthetic_unused" }, [], signal())).rejects.toThrow("公开计算失败");
  const record = useRecords().items.value[0]!;
  expect(record.error).toBe("公开计算失败");
  expect(record.steps[0]?.error).toBe("公开计算失败");
  expect(record.steps[0]?.outputs[0]).toBe("已经完成公开检查");
});

test("secret 字段的默认值也按敏感数据处理", async () => {
  const marker = "synthetic_default_private";
  const action = defineAction({
    id: "privacy.default", title: "私有默认值", input: z.object({}).strict(), inputFields: [], result: "result",
    fields: {
      privateDefault: { title: "私有默认值", schema: z.string().default(marker), secret: true },
      result: { title: "公开结果", schema: z.number() },
    },
    steps: [defineStep<{ privateDefault: string; result: number }>({
      id: "privacy.default_step", title: "使用私有默认值", rule: "T-03", reads: ["privateDefault"], writes: ["result"], uses: [],
      run(data, tools) {
        tools.note(`正在使用 ${data.privateDefault}`);
        data.result = 1;
      },
    })],
  });
  await execute(action, {}, [], signal());
  expect(JSON.stringify(useRecords().items.value[0])).not.toContain(marker);
});
