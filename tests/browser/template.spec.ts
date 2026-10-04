import { test, expect } from "@playwright/test";
test("统一组件、键盘确认与窄屏页面", async ({ page }) => {
  await page.goto("/system/components");
  await expect(
    page.getByRole("heading", { name: "组件样板", exact: true }),
  ).toBeVisible();
  await page.getByLabel("项目名称").fill("正式项目");
  await page.getByRole("button", { name: "主要操作", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".el-dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "主要操作", exact: true }),
  ).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const small = await page.locator("main").evaluate((root) =>
    [...root.querySelectorAll("p,button,input,label,span")]
      .filter((el) => el.getClientRects().length && el.textContent?.trim())
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => el.textContent),
  );
  expect(small).toEqual([]);
});
test("结构图有实际函数位置与页面组件关系", async ({ page }) => {
  await page.goto("/system/console");
  await expect(
    page.getByRole("heading", { name: "结构与运行", exact: true }),
  ).toBeVisible();
  const action = page.getByRole("button", {
    name: "查看文件列表",
    exact: true,
  });
  if (await action.count()) {
    await action.click();
    await expect(
      page.getByText("src/modules/file_library/steps/read.ts:", {
        exact: false,
      }),
    ).toHaveCount(2);
    await expect(
      page.getByText("状态：src/modules/file_library/state.ts").first(),
    ).toBeVisible();
  }
});

/** 总图是静态登记数据；业务实现不应随公共样板一起下载。 */
test("总图可独立查看，进入业务页面才加载计算步骤", async ({ page }) => {
  const stepRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/src/modules/file_library/steps/"))
      stepRequests.push(request.url());
  });
  await page.goto("/system/console");
  await expect(
    page.getByRole("heading", { name: "结构与运行", exact: true }),
  ).toBeVisible();
  expect(stepRequests).toEqual([]);
  await page.getByRole("link", { name: "文件管理", exact: true }).click();
  await expect(page).toHaveURL(/\/files$/);
  await expect(
    page.getByRole("heading", { name: "文件管理", level: 1, exact: true }),
  ).toBeVisible();
  expect(stepRequests.length).toBeGreaterThan(0);
});
