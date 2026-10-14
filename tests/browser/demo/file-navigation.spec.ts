import { test, expect } from "@playwright/test";


test("产品菜单：子页选中、目录展开、键盘和手机导航", async ({ page }) => {
  await page.goto("/files/upload");
  const nav = page.getByRole("navigation", { name: "主要导航" });
  await expect(
    nav.getByRole("link", { name: "上传文件", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  // 提示气泡不能把菜单行缩到文字宽度，选中背景必须覆盖可用整行。
  for (const label of ["文件管理", "上传文件"]) {
    const row = nav.getByRole("link", { name: label, exact: true });
    const unused = await row.evaluate((link) => {
      const menu = link.closest(".sidebar-row")!;
      return menu.closest("li")!.getBoundingClientRect().width - menu.getBoundingClientRect().width;
    });
    expect(Math.abs(unused)).toBeLessThan(1);
  }
  // 选中行横跨整个侧栏、没有圆角，竖条贴着左边缘；子页和顶层页一样，父级只换文字颜色。
  const selection = async () =>
    nav.locator(".sidebar-row.is-current").evaluate((row) => {
      const edge = row.closest("nav")!.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      const bar = getComputedStyle(row, "::before");
      return {
        inset: Math.round(box.left - edge.left) + Math.round(edge.right - box.right),
        radius: getComputedStyle(row).borderTopLeftRadius,
        bar: [bar.left, bar.width],
      };
    });
  expect(await selection()).toEqual({ inset: 0, radius: "0px", bar: ["0px", "3px"] });
  const parent = nav.getByRole("link", { name: "文件管理", exact: true }).locator("xpath=ancestor::div[contains(@class,'sidebar-row')]");
  await expect(parent).toHaveClass(/is-ancestor/);
  expect(await parent.evaluate((row) => getComputedStyle(row).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await nav.getByRole("button", { name: "收起文件管理子菜单" }).click();
  await expect(nav.getByRole("link", { name: "上传文件", exact: true })).not.toBeVisible();
  const expand = nav.getByRole("button", { name: "展开文件管理子菜单" });
  await expand.focus();
  await page.keyboard.press("Enter");
  await expect(nav.getByRole("link", { name: "上传文件", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "文件管理", exact: true }).click();
  await expect(page).toHaveURL(/\/files$/);
  await page.getByRole("button", { name: "收起侧栏", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "打开导航" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "主要导航" });
  await expect(dialog.getByRole("link", { name: "文件管理", exact: true })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("aside")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
