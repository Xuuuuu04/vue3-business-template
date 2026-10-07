import { test, expect } from "@playwright/test";
test("界面库：键盘确认、焦点返回与窄屏", async ({ page }) => {
  await page.goto("/dev/design");
  await expect(
    page.getByRole("heading", { name: "设计预览", level: 1, exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "按钮与反馈" }).click();
  await page.getByRole("navigation", { name: "组件示例" }).getByRole("button", { name: "弹层与确认", exact: true }).click();
  const trigger = page.getByRole("button", { name: "确认弹窗", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // 辅助文字不小于 12px。
  const small = await page.locator("main").evaluate((root) =>
    [...root.querySelectorAll("p,button,input,label,td")]
      .filter((el) => el.getClientRects().length && el.textContent?.trim())
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .map((el) => el.textContent),
  );
  expect(small).toEqual([]);
});
test("主题切换：配色、明暗与侧栏收起都立即生效并被记住", async ({ page }) => {
  await page.goto("/dev/design");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-mode", "light");
  await page.getByRole("button", { name: "主题与外观" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "夜航" }).click();
  await expect(html).toHaveAttribute("data-mode", "dark");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(html).toHaveAttribute("data-mode", "dark");
  await page.getByRole("button", { name: "收起侧栏" }).click();
  await expect(page.getByRole("button", { name: "展开侧栏" })).toBeVisible();
});

test("登录页：记住账号不保存密码，协议与密码显示可用", async ({ page }) => {
  // 演示服务没有登录接口，这里替换成一个返回令牌的接口。
  const claims = Buffer.from(JSON.stringify({ permissions: [] })).toString("base64url");
  await page.route("**/api/v1/access/login", (route) =>
    route.fulfill({
      json: { access_token: `h.${claims}.s`, token_type: "bearer", expires_in: 600, refresh_token: "r", refresh_expires_in: 1200, user_id: 1, org_id: "acme" },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("组织代码").fill("acme");
  await page.getByLabel("账号", { exact: true }).fill("lin");
  const password = page.getByLabel("密码", { exact: true });
  await password.fill("secret-1");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "显示密码" }).click();
  await expect(password).toHaveAttribute("type", "text");
  // 演示服务接受任意账号；登录后账号被记住，密码不会写入浏览器存储。
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /用户菜单/ })).toBeVisible();
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(saved).toContain("lin");
  expect(saved).not.toContain("secret-1");
  await page.goto("/login");
  await expect(page.getByLabel("账号", { exact: true })).toHaveValue("lin");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "《用户协议》" }).click();
  await expect(page.getByRole("heading", { name: "用户协议", level: 1 })).toBeVisible();
});
test("全局搜索与用户菜单：⌘K 跳转页面，关于显示版本", async ({ page }) => {
  await page.goto("/dev/design");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "搜索页面和操作" }).fill("设计");
  await expect(page.getByRole("option", { name: /开发者工具/ })).toHaveCount(0);
  await page.getByRole("combobox", { name: "搜索页面和操作" }).fill("开发");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dev$/);
  await page.getByRole("button", { name: /用户菜单/ }).click();
  await page.getByRole("menuitem", { name: "关于" }).click();
  await expect(page.getByRole("dialog")).toContainText("版本");
});
