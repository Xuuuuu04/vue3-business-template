import { expect, test } from "vitest";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute, setAuthorization } from "@/shared/actions/runtime";
import {
  validateEnabledModules,
  type BusinessModule,
} from "@/shared/modules/definitions";
test("没有权限的动作在执行步骤之前失败", async () => {
  let executed = false;
  const action = defineAction({
    id: "permission.write",
    title: "写入",
    permission: "items.write",
    input: z.object({}),
    inputFields: [],
    fields: { result: { title: "结果", schema: z.number() } },
    result: "result",
    steps: [
      defineStep<{ result: number }>({
        id: "permission.step",
        title: "保存",
        rule: "P-01",
        reads: [],
        writes: ["result"],
        uses: [],
        run(d) {
          executed = true;
          d.result = 1;
        },
      }),
    ],
  });
  setAuthorization(() => false);
  try {
    await expect(
      execute(action, {}, [], new AbortController().signal),
    ).rejects.toThrow("权限");
    expect(executed).toBe(false);
  } finally {
    setAuthorization(() => true);
  }
});
test("模块关闭同时控制依赖，未知名字不会静默忽略", () => {
  const module = (name: string, dependsOn: string[]): BusinessModule => ({
    name,
    title: name,
    description: "测试",
    dependsOn,
    files: [],
    pages: [],
    actions: [],
    endpoints: [],
  });
  const all = [module("base", []), module("business", ["base"])];
  expect(() => validateEnabledModules(all, new Set(["base"]))).toThrow(
    "仍依赖",
  );
  expect(() => validateEnabledModules(all, new Set(["unknown"]))).toThrow(
    "未登记",
  );
  expect(
    validateEnabledModules(all, new Set(["business"])).map((m) => m.name),
  ).toEqual(["base"]);
});
