import { test, expect } from "@playwright/test";

test("表格排序支持键盘，地址和显示顺序一起变化", async ({ page }) => {
  await page.goto("/files");
  const size = page.getByRole("columnheader", { name: "大小", exact: true });
  await size.focus();
  await page.keyboard.press("Enter");
  await expect(size).toHaveAttribute("aria-sort", "ascending");
  await expect(page).toHaveURL(/sort=size\.asc/);
  const sizes = await page
    .locator("tbody tr td:nth-child(4)")
    .allTextContents();
  const bytes = sizes.map((text) => {
    const match = text.trim().match(/^([\d.]+) (B|KB|MB|GB)$/)!;
    return (
      Number(match[1]) * 1024 ** ["B", "KB", "MB", "GB"].indexOf(match[2]!)
    );
  });
  expect(bytes.length).toBeGreaterThan(1);
  expect(bytes).toEqual([...bytes].sort((a, b) => a - b));
  await page.keyboard.press("Space");
  await expect(size).toHaveAttribute("aria-sort", "descending");
  await expect(page).toHaveURL(/sort=size\.desc/);
  await expect(page.locator("tbody tr").first()).toContainText(
    "数据备份-0930.zip",
  );
});

test("列表内的按钮不撑高数据行，切换疏密改变实际行高", async ({ page }) => {
  await page.goto("/files");
  const row = page
    .getByRole("row")
    .filter({ hasText: "2026 第三季度经营报告.pdf" });
  await expect(row).toBeVisible();
  const height = () =>
    row.evaluate((element) => element.getBoundingClientRect().height);
  await expect.poll(height).toBeCloseTo(48, 0);
  await page.getByRole("button", { name: "主题与外观", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect.poll(height).toBeCloseTo(44, 0);
  const download = row.getByRole("button", {
    name: "下载 2026 第三季度经营报告.pdf",
    exact: true,
  });
  await expect(download).toBeVisible();
  await expect(download).toBeEnabled();
});
