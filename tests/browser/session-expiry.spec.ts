import { test, expect } from "@playwright/test";

test("会话到期后返回登录页，旧页面与通知内容不再显示", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/v1/access/login", (route) =>
    route.fulfill({
      json: {
        access_token: "h.e30.s",
        token_type: "bearer",
        expires_in: 2,
        org_id: "demo-team",
      },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("组织代码", { exact: true }).fill("demo-team");
  await page.getByLabel("账号", { exact: true }).fill("session-test");
  await page.getByLabel("密码", { exact: true }).fill("synthetic-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.evaluate(async () => {
    const noticesPath = "/src/shared/ui/lib/notifications.ts";
    const toastPath = "/src/shared/ui/lib/toast.ts";
    const { notify } = await import(noticesPath);
    const { useToast } = await import(toastPath);
    notify({ title: "旧账号通知" });
    useToast().info("旧账号操作结果");
  });
  await expect(page.getByText("旧账号操作结果", { exact: true })).toBeVisible();
  await page.clock.fastForward(2100);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("旧账号操作结果", { exact: true })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(async () => {
      const path = "/src/shared/ui/lib/notifications.ts";
      return (await import(path)).useNotices().items.length;
    }),
  ).toBe(0);
});
