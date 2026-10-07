import { test, expect } from "@playwright/test";

async function openForms(page: import("@playwright/test").Page) {
  await page.goto("/dev/design");
  await page.getByRole("tab", { name: "表单", exact: true }).click();
}

test("分段选择用方向键切换，焦点跟随选项且 Tab 只经过当前选项", async ({ page }) => {
  await openForms(page);
  const group = page.getByRole("radiogroup", { name: "时间范围", exact: true });
  const selected = group.getByRole("radio", { name: "30 天", exact: true });
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  const next = group.getByRole("radio", { name: "90 天", exact: true });
  await expect(next).toHaveAttribute("aria-checked", "true");
  await expect(next).toBeFocused();
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press("Home");
  await expect(group.getByRole("radio", { name: "7 天", exact: true })).toBeFocused();
});

test("选中日期后，可单独用键盘清除，不会再次打开日历", async ({ page }) => {
  await openForms(page);
  await page.getByRole("button", { name: "选择日期", exact: true }).click();
  await page.locator('[data-reka-calendar-cell-trigger][data-today]').click();
  const clear = page.getByRole("button", { name: "清除日期", exact: true });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(clear).toHaveCount(0);
  await expect(page.getByRole("button", { name: "选择日期", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "选择日期", exact: true })).toHaveText("选择日期");
  await expect(page.locator('[data-reka-calendar-cell-trigger]')).toHaveCount(0);
});

test("日期范围在手机完整显示，已选范围可以用键盘清除", async ({ page }) => {
  await openForms(page);
  const picker = page.getByRole("button", { name: "选择日期范围", exact: true });
  await picker.click();
  await page.getByRole("button", { name: "最近 7 天", exact: true }).click();
  const clear = page.getByRole("button", { name: "清除日期范围", exact: true });
  await expect(clear).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.click();
  const panel = page.locator('.popup-surface').filter({ has: page.getByRole("button", { name: "下个月", exact: true }) });
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await expect(panel.locator("table:visible")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(picker).toHaveText("选择日期范围");
  await expect(picker).toBeFocused();
});

test("表格排序支持键盘，地址和显示顺序一起变化", async ({ page }) => {
  await page.goto("/files");
  const size = page.getByRole("columnheader", { name: "大小", exact: true });
  await size.focus();
  await page.keyboard.press("Enter");
  await expect(size).toHaveAttribute("aria-sort", "ascending");
  await expect(page).toHaveURL(/sort=size\.asc/);
  const sizes = await page.locator("tbody tr td:nth-child(4)").allTextContents();
  const bytes = sizes.map((text) => {
    const match = text.trim().match(/^([\d.]+) (B|KB|MB|GB)$/)!;
    return Number(match[1]) * 1024 ** ["B", "KB", "MB", "GB"].indexOf(match[2]!);
  });
  expect(bytes.length).toBeGreaterThan(1);
  expect(bytes).toEqual([...bytes].sort((a, b) => a - b));
  await page.keyboard.press("Space");
  await expect(size).toHaveAttribute("aria-sort", "descending");
  await expect(page).toHaveURL(/sort=size\.desc/);
  await expect(page.locator("tbody tr").first()).toContainText("数据备份-0930.zip");
});

test("手机图表保持文字大小和可读高度，宽度跟随页面", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/design");
  await page.getByRole("tab", { name: "数据展示", exact: true }).click();
  const chart = page.getByRole("img", { name: "本月、上月同期趋势图", exact: true });
  await expect.poll(() => chart.evaluate((svg) => {
    const text = svg.querySelector("text")!;
    return Number(getComputedStyle(text).fontSize.replace("px", "")) * text.getScreenCTM()!.a;
  })).toBeGreaterThanOrEqual(11.9);
  const size = await chart.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(230);
  expect(size!.x + size!.width).toBeLessThanOrEqual(390);
});
