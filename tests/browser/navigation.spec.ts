import { test, expect } from "@playwright/test";

test("手机关闭的导航不能获得焦点，打开与 Esc 关闭保持键盘可用", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/examples/customers");
  const sidebar = page.locator("aside");
  await expect(sidebar).toHaveAttribute("inert", "");
  await sidebar
    .locator("a")
    .first()
    .evaluate((element) => (element as HTMLElement).focus());
  expect(
    await sidebar.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(false);
  const open = page.getByRole("button", { name: "打开导航", exact: true });
  await open.click();
  const close = page.getByRole("button", { name: "关闭导航", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await sidebar.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert", "");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(sidebar).not.toHaveAttribute("inert", "");
});

test("公共外壳支持三级目录，切换深层路由自动展开祖先", async ({ page }) => {
  await page.goto("/dev/design");

  await page.evaluate(async () => {
    const shellUrl = "/src/shared/ui/layout/AppShell.vue";

    const source = await (await fetch(shellUrl)).text();
    const vueUrl = source.match(/from "([^"]*\/vue\.js[^"]*)"/)![1]!;
    const routerUrl = source.match(/from "([^"]*\/vue-router\.js[^"]*)"/)![1]!;
    const { createApp, h } = await import(vueUrl);
    const { createRouter, createMemoryHistory } = await import(routerUrl);
    const { default: Shell } = await import(shellUrl);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/orders", component: { render: () => null } },
        { path: "/orders/new", component: { render: () => null } },
      ],
    });
    await router.push("/orders/new");
    const root = document.createElement("div");
    root.id = "navigation-fixture";
    root.style.cssText = "position:fixed;inset:0;z-index:500";
    document.body.append(root);
    createApp({
      render: () =>
        h(Shell, {
          brand: "菜单演示",
          nav: [
            {
              items: [
                {
                  label: "业务中心",
                  children: [
                    {
                      label: "订单处理",
                      children: [
                        { label: "订单列表", to: "/orders", exact: true },
                        { label: "新增订单", to: "/orders/new" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
    })
      .use(router)
      .mount(root);
  });
  const root = page.locator("#navigation-fixture");
  await expect(root.getByRole("link", { name: "新增订单" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await root.getByRole("button", { name: "订单处理", exact: true }).click();
  await expect(root.getByRole("link", { name: "新增订单" })).not.toBeVisible();
  await root.getByRole("button", { name: "业务中心", exact: true }).click();
  await expect(
    root.getByRole("button", { name: "订单处理", exact: true }),
  ).not.toBeVisible();
  await root.getByRole("button", { name: "业务中心", exact: true }).click();
  await root.getByRole("button", { name: "订单处理", exact: true }).click();
  await root.getByRole("link", { name: "订单列表" }).click();
  await expect(root.getByRole("link", { name: "订单列表" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await root.getByRole("button", { name: "收起侧栏", exact: true }).click();
  await root.getByRole("button", { name: "业务中心", exact: true }).click();
  await expect(root.getByRole("link", { name: "订单列表" })).toBeVisible();
});
