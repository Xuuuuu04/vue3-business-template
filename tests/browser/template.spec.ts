import { test, expect } from "@playwright/test";
test("界面库：键盘确认、焦点返回与窄屏", async ({ page }) => {
  await page.goto("/dev/design");
  await expect(
    page.getByRole("heading", { name: "设计预览", level: 1, exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "控件" }).click();
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
  // 正文 14px 起，辅助文字不小于 12px。
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
test("功能地图显示操作的执行过程、接口与代码位置", async ({ page }) => {
  await page.goto("/dev/map");
  await expect(
    page.getByRole("heading", { name: "功能地图", level: 1, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /查看文件列表/ }).click();
  await expect(page.getByText("读取这一页的文件")).toBeVisible();
  await expect(page.getByText("GET /api/v1/files/:org", { exact: true })).toBeVisible();
  await expect(
    page.getByText("src/modules/file_library/steps/read.ts:", { exact: false }),
  ).toHaveCount(2);
  await expect(page.getByText("/files", { exact: true }).first()).toBeVisible();
});

/** 功能地图是静态登记数据；业务实现不应随公共样板一起下载。 */
test("功能地图可独立查看，进入业务页面才加载计算步骤", async ({ page }) => {
  const stepRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/src/modules/file_library/steps/"))
      stepRequests.push(request.url());
  });
  await page.goto("/dev/map");
  await expect(
    page.getByRole("heading", { name: "功能地图", level: 1, exact: true }),
  ).toBeVisible();
  expect(stepRequests).toEqual([]);
  await page.getByRole("link", { name: "返回产品", exact: true }).click();
  await expect(page).toHaveURL(/\/files$/);
  await expect(
    page.getByRole("heading", { name: "文件管理", level: 1, exact: true }),
  ).toBeVisible();
  expect(stepRequests.length).toBeGreaterThan(0);
});
test("开发者工具与产品导航分开，旧地址仍可用", async ({ page }) => {
  await page.goto("/files");
  const nav = page.getByRole("navigation", { name: "主要导航" });
  await expect(nav.getByRole("link", { name: "文件管理" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "操作记录" })).toHaveCount(0);
  await page.goto("/system/console");
  await expect(page).toHaveURL(/\/dev\/map$/);
  await expect(nav.getByRole("link", { name: "操作记录" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "文件管理" })).toHaveCount(0);
});
