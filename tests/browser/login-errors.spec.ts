import { test, expect } from "@playwright/test";

test("空登录显示对应字段错误、聚焦首个字段，不向后台发送请求", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/access/login", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto("/login");
  await page.getByRole("textbox", { name: "组织代码", exact: true }).fill("");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  const org = page.getByRole("textbox", { name: "组织代码", exact: true });
  await expect(org).toHaveAccessibleDescription("请补充填写内容");
  await expect(org).toHaveAttribute("aria-invalid", "true");
  await expect(org).toBeFocused();
  await expect(
    page.getByLabel("账号", { exact: true }),
  ).toHaveAccessibleDescription("请补充填写内容");
  await expect(
    page.getByLabel("密码", { exact: true }),
  ).toHaveAccessibleDescription("请补充填写内容");
  expect(calls).toBe(0);
});

test("登录结果未知时锁定草稿与提交，重新加载是明确的恢复入口", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/access/login", async (route) => {
    calls++;
    await route.fulfill({
      status: 503,
      json: {
        code: "temporary",
        message: "暂时失败",
        fields: [{ field: "username", problem: "不能提示重发" }],
      },
    });
  });
  await page.goto("/login");
  await page.getByLabel("组织代码").fill("synthetic-org");
  await page.getByLabel("账号", { exact: true }).fill("synthetic-account");
  await page.getByLabel("密码", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "登录", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("账号", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue(
    "synthetic-password",
  );
  await expect(
    page.getByText("登录状态还不能确认。请重新加载页面后登录。", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .locator("form")
    .evaluate((form) =>
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  expect(calls).toBe(1);
  await expect(page.getByRole("alert")).toHaveClass(/border-warn/);
  await expect(
    page.getByRole("button", { name: "重新加载", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("不能提示重发", { exact: true })).toHaveCount(0);
});

test("后台字段错误保留登录草稿，自动显示验证码并安全显示说明", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/access/login", async (route) => {
    await waiting;
    await route.fulfill({
      status: 422,
      json: {
        code: "invalid_input",
        message: "请检查验证码",
        fields: [
          { field: "otp_code", problem: "验证码 <strong>无效</strong>" },
        ],
      },
    });
  });
  await page.goto("/login");
  await page.getByLabel("组织代码").fill("synthetic-org");
  await page.getByLabel("账号", { exact: true }).fill("synthetic-account");
  await page.getByLabel("密码", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByLabel("账号", { exact: true })).toBeDisabled();
  release();
  const otp = page.getByRole("textbox", { name: "两步验证码", exact: true });
  await expect(otp).toHaveAccessibleDescription("验证码 <strong>无效</strong>");
  await expect(otp).toBeFocused();
  await expect(page.getByLabel("账号", { exact: true })).toHaveValue(
    "synthetic-account",
  );
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue(
    "synthetic-password",
  );
  await expect(page.locator("strong")).toHaveCount(0);
});
