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
