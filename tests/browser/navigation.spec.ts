import { test, expect } from "@playwright/test";

test("公共外壳支持三级目录，切换深层路由自动展开祖先", async ({ page }) => {
  await page.goto("/dev/design");
  // 直接加载真实公共组件，以独立路由演示三级目录；不向产品加入虚构业务。
  await page.evaluate(async () => {
    const shellUrl = "/src/shared/ui/layout/AppShell.vue";
    // 使用组件实际导入的带版本地址，保持 Vue 和路由的注入标识一致。
    const source = await (await fetch(shellUrl)).text();
    const vueUrl = source.match(/from "([^"]*\/vue\.js[^"]*)"/)![1]!;
    const routerUrl = source.match(/from "([^"]*\/vue-router\.js[^"]*)"/)![1]!;
    const { createApp, h } = await import(/* @vite-ignore */ vueUrl);
    const { createRouter, createMemoryHistory } = await import(
      /* @vite-ignore */ routerUrl
    );
    const { default: Shell } = await import(/* @vite-ignore */ shellUrl);
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
