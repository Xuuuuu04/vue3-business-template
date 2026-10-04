import { test, expect } from "@playwright/test";
test("统一组件、键盘确认与窄屏页面", async ({ page }) => {
  await page.goto("/system/components");
  await expect(
    page.getByRole("heading", { name: "组件样板", exact: true }),
  ).toBeVisible();
  await page.getByLabel("项目名称").fill("正式项目");
  await page.getByRole("button", { name: "主要操作", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
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
