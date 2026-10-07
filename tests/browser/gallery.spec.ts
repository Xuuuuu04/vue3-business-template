import { test, expect } from "@playwright/test";

test("组件目录逐项展示，地址可分享和刷新，手机可以直接切换示例", async ({ page }) => {
  await page.goto("/dev/design?section=forms&example=inputs");
  const nav = page.getByRole("navigation", { name: "组件示例", exact: true });
  await nav.getByRole("button", { name: "数字与日期", exact: true }).click();
  await expect(page).toHaveURL(/example=dates/);
  await page.reload();
  await expect(page.getByRole("region", { name: "数字与日期示例", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "项目名称", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("combobox", { name: "查看组件示例", exact: true }).click();
  await page.getByRole("option", { name: "文本输入", exact: true }).click();
  await expect(page).toHaveURL(/example=inputs/);
  await expect(page.getByRole("textbox", { name: "项目名称", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "到货日期", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-gallery-preview]")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("各类组件示例都能打开，对话可以发送与停止", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/dev/design");
  for (const category of ["配色与字体", "表单", "按钮与反馈", "数据展示", "AI 应用", "页面拼法"]) {
    await page.getByRole("tab", { name: category, exact: true }).click();
    const nav = page.getByRole("navigation", { name: "组件示例", exact: true });
    const names = await nav.getByRole("button").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      await nav.getByRole("button", { name: name.trim(), exact: true }).click();
      await expect(page.getByRole("region", { name: `${name.trim()}示例`, exact: true })).toBeVisible();
    }
  }
  await page.getByRole("tab", { name: "AI 应用", exact: true }).click();
  await page.getByRole("textbox", { name: "输入问题", exact: true }).fill("按周拆开看看");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("log")).toContainText("按周拆开看看");
  await page.getByRole("button", { name: "停止生成", exact: true }).click();
  await expect(page.getByRole("button", { name: "停止生成", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("表格示例点开当前商品，抽屉选中结果对应同一行", async ({ page }) => {
  await page.goto("/dev/design?section=data&example=table");
  const row = page.getByRole("row").filter({ hasText: "红烧牛肉面 桶装" });
  await row.getByRole("button", { name: "详情", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "红烧牛肉面 桶装", exact: true });
  await expect(drawer).toContainText("AX100482");
  await expect(drawer).toContainText("渝中门店");
  await drawer.getByRole("button", { name: "选中商品", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(row.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "处理已选（1）", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "处理已选", exact: true })).toHaveCount(0);
  await expect(page.getByText("第 1–5 条，共 5 条", { exact: true })).toBeVisible();
});

test("768px 窗口为示例保留行宽，表格固定列不会互相遮挡", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 960 });
  await page.goto("/dev/design?section=data&example=table");
  const row = page.getByRole("row").filter({ hasText: "矿泉水 550ml" });
  const name = await row.getByRole("cell", { name: /矿泉水 550ml/ }).boundingBox();
  const actions = await row.getByRole("cell").filter({ has: page.getByRole("button", { name: "详情", exact: true }) }).boundingBox();
  expect(name!.x + name!.width).toBeLessThanOrEqual(actions!.x + 1);
  await expect(page.getByRole("combobox", { name: "查看组件示例", exact: true })).toBeVisible();
});
