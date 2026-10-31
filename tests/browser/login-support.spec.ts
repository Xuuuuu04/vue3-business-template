import { expect, test } from "@playwright/test";

for (const support of [
  { email: "", helpUrl: "" },
  { email: "support@example.test", helpUrl: "" },
  { email: "", helpUrl: "https://help.example.test" },
]) {
  test(`密码帮助与真实联系方式一致：${support.email || support.helpUrl || "未配置"}`, async ({
    page,
  }) => {
    await page.route("**/src/app/app.config.ts*", async (route) => {
      const reply = await route.fetch();
      await route.fulfill({
        response: reply,
        body:
          (await reply.text()) +
          `\nappConfig.support = ${JSON.stringify(support)};\n`,
      });
    });
    await page.goto("/login");
    const entry = page.getByRole("button", { name: "忘记密码？", exact: true });
    if (!support.email && !support.helpUrl) {
      await expect(entry).toHaveCount(0);
      await expect(page.locator('a[href="mailto:"]')).toHaveCount(0);
    } else {
      await entry.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("管理员重置密码");
      if (support.email)
        await expect(
          dialog.getByRole("link", { name: support.email }),
        ).toHaveAttribute("href", `mailto:${support.email}`);
      else {
        await expect(
          dialog.getByRole("link", { name: "前往帮助中心" }),
        ).toHaveAttribute("href", support.helpUrl);
        await expect(
          dialog.getByRole("link", { name: "前往帮助中心" }),
        ).toHaveAttribute("rel", "noopener noreferrer");
        await expect(dialog.locator('a[href^="mailto:"]')).toHaveCount(0);
      }
    }
  });
}

test("产品关掉组织代码后，登录页不显示这一栏，请求也不带 org_code", async ({
  page,
}) => {
  await page.route("**/src/app/login.config.ts*", async (route) => {
    const reply = await route.fetch();
    await route.fulfill({
      response: reply,
      body: (await reply.text()) + "\nloginConfig.orgCode = false;\n",
    });
  });
  let sent: Record<string, unknown> | undefined;
  await page.route("**/api/v1/access/login", (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      json: {
        access_token: "h.e30.s",
        token_type: "bearer",
        expires_in: 60,
        org_id: "acme",
      },
    });
  });
  await page.goto("/login");
  await expect(page.getByLabel("组织代码")).toHaveCount(0);
  await page.getByLabel("账号", { exact: true }).fill("tester");
  await page.getByLabel("密码", { exact: true }).fill("synthetic-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  expect(sent).toEqual({
    username: "tester",
    password: "synthetic-only",
    otp_code: "",
  });
});
