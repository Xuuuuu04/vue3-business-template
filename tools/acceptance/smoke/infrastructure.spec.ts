import { test, expect } from "@playwright/test";
import { context } from "../context";
test("隔离设施：真实后端就绪且前端可以加载，不代表业务验收", async ({
  page,
  request,
}) => {
  const run = context();
  const backend = await request.get(
    `http://127.0.0.1:${run.backendPort}/health/ready`,
  );
  expect(backend.ok()).toBe(true);
  expect(backend.headers()["x-acceptance-run"]).toBe(run.runId);
  expect((await backend.json()).status).toBe("ready");
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("#app")).not.toBeEmpty();
});
