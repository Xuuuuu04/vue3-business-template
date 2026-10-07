import { test, expect } from "@playwright/test";

for (const width of [1280, 1920]) {
  test(`文件列表利用 ${width}px 屏幕，只有表体滚动，主要入口唯一`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/files");
    await expect(
      page.getByRole("heading", { name: "文件管理", level: 1 }),
    ).toBeVisible();
    const table = page.getByRole("region", { name: "数据表格" });
    // section 在浏览器中按带名称的 region 暴露。
    const tableBox = await table.boundingBox();
    const contentBox = await page.locator(".page-content").boundingBox();
    expect(Math.abs(tableBox!.width - contentBox!.width)).toBeLessThan(1);
    expect(Math.abs(tableBox!.height - contentBox!.height)).toBeLessThan(1);
    await expect(
      page
        .locator(".page-heading")
        .getByRole("button", { name: "上传文件", exact: true }),
    ).toHaveCount(1);
    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(pageHeight).toBeLessThanOrEqual(900);
  });
}

test("上传只显示一个表单，帮助贴近文件选择，主要入口只出现一次", async ({
  page,
}) => {
  await page.goto("/files/upload");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "保存文件", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".page-content > .work-area")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "上传须知" })).toHaveCount(0);
  await expect(page.getByLabel("选择文件")).toBeAttached();
  const content = await page.locator(".page-content").boundingBox();
  const drop = await page.locator('label:has(input[type="file"])').boundingBox();
  expect(Math.abs(drop!.width - content!.width)).toBeLessThan(1);
  expect(Math.abs(drop!.height - content!.height)).toBeLessThan(1);
});

test("文件详情优先展示当前文件，次要字段按需打开", async ({ page }) => {
  await page.goto("/files/sample-1");
  await expect(
    page.getByRole("button", { name: "下载原文件", exact: true }),
  ).toBeVisible();
  const info = page.getByRole("button", { name: "文件信息", exact: true });
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await info.click();
  await expect(info).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("文件编号", { exact: true })).toBeVisible();
  await expect(page.locator(".page-content > .work-area")).toHaveCount(1);
});

test("从文件详情返回时，列表保留表体滚动位置", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/files");
  await expect(
    page.getByRole("button", { name: "项目使用说明.txt", exact: true }),
  ).toBeAttached();
  const scrollport = page.locator("[data-table-scroll]");
  await scrollport.evaluate((node) => {
    node.scrollTop = 350;
  });
  await expect(scrollport).toHaveJSProperty("scrollTop", 350);
  await page
    .getByRole("button", { name: "项目使用说明.txt", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "项目使用说明.txt", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(scrollport).toHaveJSProperty("scrollTop", 350);
});
