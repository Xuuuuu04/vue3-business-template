import { test, expect } from "@playwright/test";

async function openForms(page: import("@playwright/test").Page, example: "toggles" | "dates") {
  await page.goto(`/dev/design?section=forms&example=${example}`);
}

test("分段选择用方向键切换，焦点跟随选项且 Tab 只经过当前选项", async ({ page }) => {
  await openForms(page, "toggles");
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
  await openForms(page, "dates");
  await page.getByRole("button", { name: "到货日期", exact: true }).click();
  await page.locator('[data-reka-calendar-cell-trigger][data-today]').click();
  const clear = page.getByRole("button", { name: "清除日期", exact: true });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(clear).toHaveCount(0);
  await expect(page.getByRole("button", { name: "到货日期", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "到货日期", exact: true })).toHaveText("选择日期");
  await expect(page.locator('[data-reka-calendar-cell-trigger]')).toHaveCount(0);
});

test("日期范围在手机完整显示，已选范围可以用键盘清除", async ({ page }) => {
  await openForms(page, "dates");
  const picker = page.getByRole("button", { name: "统计区间", exact: true });
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
  await page.goto("/dev/design?section=data&example=line");
  const chart = page.getByRole("img", { name: "本月、上月同期趋势图", exact: true });
  await expect.poll(() => chart.evaluate((svg) => {
    const text = svg.querySelector("text")!;
    return Number(getComputedStyle(text).fontSize.replace("px", "")) * text.getScreenCTM()!.a;
  })).toBeGreaterThanOrEqual(11.9);
  const size = await chart.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(230);
  expect(size!.x + size!.width).toBeLessThanOrEqual(390);
});

test("列表内的按钮不撑高数据行，切换疏密改变实际行高", async ({ page }) => {
  await page.goto("/files");
  const row = page.getByRole("row").filter({ hasText: "2026 第三季度经营报告.pdf" });
  await expect(row).toBeVisible();
  const height = () => row.evaluate((element) => element.getBoundingClientRect().height);
  await expect.poll(height).toBeCloseTo(48, 0);
  await page.getByRole("button", { name: "主题与外观", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect.poll(height).toBeCloseTo(44, 0);
  const download = row.getByRole("button", { name: "下载 2026 第三季度经营报告.pdf", exact: true });
  await expect(download).toBeVisible();
  await expect(download).toBeEnabled();
});

test("手机表格的字段一起横向滚动，左右固定列不会盖住内容", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/design?section=data&example=table");
  const cell = page.getByRole("cell", { name: /矿泉水 550ml/ });
  await expect(cell).toBeVisible();
  const first = await cell.boundingBox();
  await page.locator("[data-table-scroll]").evaluate((node) => { node.scrollLeft = 150; });
  const moved = await cell.boundingBox();
  expect(first!.x - moved!.x).toBeCloseTo(150, 0);
  const checkbox = await page.getByRole("checkbox", { name: "选择第 0 行", exact: true }).boundingBox();
  expect(checkbox!.x).toBeGreaterThanOrEqual(0);
});

test("桌面表格横向查看字段时，名称列继续固定", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/design?section=data&example=table");
  const cell = page.getByRole("cell", { name: /矿泉水 550ml/ });
  await expect(cell).toBeVisible();
  const first = await cell.boundingBox();
  const scroll = page.locator("[data-table-scroll]");
  await scroll.evaluate((node) => { node.scrollLeft = 150; });
  expect(await scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  const moved = await cell.boundingBox();
  expect(moved!.x).toBeCloseTo(first!.x, 0);
});
