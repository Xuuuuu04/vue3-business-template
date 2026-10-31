import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { createTask } from "@/shared/state/task";
import { useRecords } from "@/shared/records/store";
import type { Endpoint } from "@/shared/http/client";

const endpoints: Endpoint[] = [
  {
    id: "client_safety.save",
    title: "保存",
    method: "POST",
    path: "/api/save",
    response: z.number(),
  },
];
const action = defineAction({
  id: "client_safety.submit",
  title: "检查请求准备",
  input: z.object({ body: z.unknown() }).strict(),
  inputFields: ["body"],
  result: "result",
  fields: {
    body: { title: "待发送正文", schema: z.unknown() },
    result: { title: "已保存数量", schema: z.number() },
  },
  steps: [
    defineStep<{ body: unknown; result: number }>({
      id: "client_safety.write",
      title: "发送保存请求",
      rule: "T-01",
      reads: ["body"],
      writes: ["result"],
      uses: ["client_safety.save"],
      async run(data, tools) {
        data.result = await tools.request("client_safety.save", {
          body: data.body,
        });
      },
    }),
  ],
});

test.each(["bigint", "circular"])(
  "%s 正文发送前失败，可以修正后提交",
  async (kind) => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    let calls = 0;
    const task = createTask(action, endpoints, "submit", async () => {
      calls++;
      return Response.json(1);
    });
    await task.run({ body: kind === "bigint" ? { amount: 1n } : circular });
    expect(calls).toBe(0);
    expect(task.state.value.status).toBe("error");
    expect(task.state.value.error).toContain("修正输入");
    expect(useRecords().items.value[0]?.steps[0]?.requests[0]?.outcome).toBe(
      "failed",
    );
    await task.run({ body: { amount: 1 } });
    expect(calls).toBe(1);
    expect(task.state.value.status).toBe("success");
  },
);

test.each(["connection", "response"])(
  "进入网络阶段后 %s 失败仍禁止重发写入",
  async (kind) => {
    let calls = 0;
    const task = createTask(action, endpoints, "submit", async () => {
      calls++;
      if (kind === "connection") throw new TypeError("connection lost");
      return new Response("invalid JSON", { status: 200 });
    });
    await task.run({ body: { amount: 1 } });
    expect(task.state.value.status).toBe("unknown");
    expect(useRecords().items.value[0]?.steps[0]?.requests[0]?.outcome).toBe(
      "unknown",
    );
    await task.run({ body: { amount: 2 } });
    expect(calls).toBe(1);
  },
);
