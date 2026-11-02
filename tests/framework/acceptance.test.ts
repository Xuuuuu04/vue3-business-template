import { expect, test } from "vitest";
import { createServer } from "node:net";
import {
  assertIdentity,
  portNumber,
  shellArgument,
} from "../../tools/acceptance/context";
import { requireFreePort } from "../../tools/acceptance/process";

test("后端实例必须属于本轮且已就绪", () => {
  expect(() => assertIdentity(200, "run-a", "run-a")).not.toThrow();
  expect(() => assertIdentity(200, "run-b", "run-a")).toThrow("本轮");
  expect(() => assertIdentity(503, "run-a", "run-a")).toThrow("本轮");
  expect(() => assertIdentity(200, null, "run-a")).toThrow("本轮");
});
test("只接受有效且非特权端口", () => {
  expect(portNumber(undefined, 5196)).toBe(5196);
  for (const value of ["0", "80", "65536", "5.2", "NaN"])
    expect(() => portNumber(value, 5196)).toThrow();
});
test("已有端口直接失败且不会停止原服务", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("没有端口");
    await expect(requireFreePort(address.port)).rejects.toThrow();
    expect(server.listening).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
test("服务启动参数作为单个shell参数引用", () => {
  expect(shellArgument("a'b $HOME `pwd`")).toBe("'a'\\''b $HOME `pwd`'");
});
