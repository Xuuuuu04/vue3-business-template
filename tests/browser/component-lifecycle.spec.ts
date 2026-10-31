import { test, expect, type Page, type Locator } from "@playwright/test";

async function mountCopy(page: Page, fail = false) {
  await page.goto("/dev/design");
  await page.evaluate(async (reject) => {
    const path = "/src/shared/ui/base/CopyButton.vue";
    const source = await (await fetch(path)).text();
    const vuePath = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h } = await import(vuePath);
    const { default: CopyButton } = await import(path);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          reject ? Promise.reject(new Error("复制被拒绝")) : Promise.resolve(),
      },
    });
    const host = document.createElement("div");
    host.dataset.copyTest = "";
    host.style.cssText =
      "position:fixed;top:80px;right:24px;z-index:1000;background:var(--surface);padding:24px";
    document.body.append(host);
    createApp({
      render: () => h(CopyButton, { text: "文件编号", label: "复制编号" }),
    }).mount(host);
  }, fail);
  return page.locator("[data-copy-test]");
}

test("复制被浏览器拒绝时显示失败原因，按钮可以再次操作", async ({ page }) => {
  const host = await mountCopy(page, true);
  await host.getByRole("button", { name: "复制编号", exact: true }).click();
  await expect(
    page.getByText("复制失败，请选择文字后手动复制。", { exact: true }),
  ).toBeVisible();
  await expect(
    host.getByRole("button", { name: "复制编号", exact: true }),
  ).toBeEnabled();
  await expect(host.getByRole("status")).toHaveText("");
});

test("再次复制会重新计算成功提示的持续时间", async ({ page }) => {
  const host = await mountCopy(page);
  await page.clock.install();
  const copy = host.getByRole("button", { name: "复制编号", exact: true });
  await copy.click();
  await expect(host.getByRole("status")).toHaveText("已复制");
  await page.clock.fastForward(1000);
  await copy.click();
  await page.clock.fastForward(600);
  await expect(host.getByRole("status")).toHaveText("已复制");
  await page.clock.fastForward(900);
  await expect(host.getByRole("status")).toHaveText("");
});

async function mountOutline(page: Page) {
  await page.goto("/dev/design");
  await page.evaluate(async () => {
    const path = "/src/shared/ui/layout/FormOutline.vue";
    const source = await (await fetch(path)).text();
    const vuePath = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h, shallowRef } = await import(vuePath);
    const { default: FormOutline } = await import(path);
    const host = document.createElement("div");
    host.dataset.outlineTest = "";
    host.style.cssText =
      "position:fixed;inset:0;z-index:1000;background:var(--surface);display:flex;gap:24px;padding:24px";
    const root = document.createElement("div");
    root.dataset.outlineRoot = "";
    root.style.cssText = "overflow:auto;flex:1";
    function section(id: string, title: string) {
      const element = document.createElement("section");
      element.id = id;
      element.dataset.formSection = title;
      element.style.height = "420px";
      const field = document.createElement("div");
      field.dataset.fieldRequired = "true";
      const input = document.createElement("input");
      input.setAttribute("aria-label", title);
      field.append(input);
      element.append(field);
      return element;
    }
    root.append(
      section("section-first", "基本信息"),
      section("section-second", "补充信息"),
    );
    const tail = document.createElement("div");
    tail.style.height = `${innerHeight}px`;
    root.append(tail);
    const outline = document.createElement("div");
    outline.style.width = "260px";
    host.append(root, outline);
    document.body.append(host);
    const currentRoot = shallowRef(undefined as HTMLElement | undefined);
    host.addEventListener("attach-root", () => (currentRoot.value = root));
    host.addEventListener("add-section", () =>
      root.insertBefore(section("section-third", "其他信息"), tail),
    );
    host.addEventListener("replace-root", () => {
      const replacement = document.createElement("div");
      replacement.append(
        section("replacement-first", "新表单一"),
        section("replacement-second", "新表单二"),
      );
      host.insertBefore(replacement, root);
      currentRoot.value = replacement;
    });
    const app = createApp({
      render: () => h(FormOutline, { root: currentRoot.value }),
    });
    app.mount(outline);
    host.addEventListener("unmount-outline", () => app.unmount());
  });
  return page.locator("[data-outline-test]");
}

async function positionSection(section: Locator, fraction: number) {
  await section.evaluate(async (target, position) => {
    const root = target.parentElement!;
    await new Promise<void>((resolve) => {
      const observer = new IntersectionObserver(
        (items) => {
          if (!items.some((item) => item.isIntersecting)) return;
          observer.disconnect();
          resolve();
        },
        { rootMargin: "-10% 0px -60% 0px" },
      );
      observer.observe(target);
      root.scrollTop +=
        target.getBoundingClientRect().top - innerHeight * position;
    });
  }, fraction);
}

test("表单目录随延迟出现的表单、动态区块和替换后的表单更新", async ({
  page,
}) => {
  const host = await mountOutline(page);
  const directory = host.getByRole("navigation", {
    name: "表单目录",
    exact: true,
  });
  await expect(directory).toHaveCount(0);
  await host.dispatchEvent("attach-root");
  await expect(directory.getByRole("button")).toHaveCount(2);
  await host.dispatchEvent("add-section");
  await expect(directory.getByRole("button")).toHaveCount(3);
  await host
    .getByRole("textbox", { name: "其他信息", exact: true })
    .fill("已填写");
  await positionSection(host.locator("#section-second"), 0);
  const second = directory.getByRole("button", { name: /补充信息/ });
  await expect(second).toHaveAttribute("aria-current", "step");
  await positionSection(host.locator("#section-third"), 0.3);
  await expect(second).toHaveAttribute("aria-current", "step");
  await host
    .locator("#section-third")
    .evaluate((section) => section.scrollIntoView({ block: "start" }));
  await expect(directory.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(
    directory.getByRole("button", { name: /其他信息/ }),
  ).toHaveAttribute("aria-current", "step");
  await host.dispatchEvent("replace-root");
  await expect(directory.getByRole("button")).toHaveCount(2);
  await expect(
    directory.getByRole("button", { name: /新表单一/ }),
  ).toBeVisible();
  await host
    .getByRole("textbox", { name: "基本信息", exact: true })
    .evaluate((input) => {
      (input as HTMLInputElement).value = "旧表单修改";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await expect(directory.getByRole("button", { name: /基本信息/ })).toHaveCount(
    0,
  );
  await host.dispatchEvent("unmount-outline");
  await expect(directory).toHaveCount(0);
});

async function mountDates(page: Page) {
  await page.goto("/dev/design");
  await page.evaluate(async () => {
    const path = "/src/shared/ui/base/DatePicker.vue";
    const source = await (await fetch(path)).text();
    const vuePath = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h, ref } = await import(vuePath);
    const { default: DatePicker } = await import(path);
    const rangePath = "/src/shared/ui/base/DateRangePicker.vue";
    const { default: DateRangePicker } = await import(rangePath);
    const host = document.createElement("div");
    host.dataset.datesTest = "";
    host.style.cssText =
      "position:fixed;top:80px;left:24px;width:360px;z-index:50;background:var(--surface);padding:24px";
    document.body.append(host);
    const disabled = ref(true);
    host.addEventListener("enable-controls", () => (disabled.value = false));
    host.addEventListener("disable-controls", () => (disabled.value = true));
    createApp({
      render: () =>
        h("div", [
          h(DatePicker, {
            modelValue: "2026-10-31",
            disabled: disabled.value,
            ariaLabel: "单个日期",
          }),
          h(DateRangePicker, {
            modelValue: ["2026-10-30", "2026-10-31"],
            disabled: disabled.value,
            ariaLabel: "日期区间",
          }),
        ]),
    }).mount(host);
  });
  return page.locator("[data-dates-test]");
}

test("日期控件停用后不能打开或清除，已经打开的日历同时关闭", async ({
  page,
}) => {
  const host = await mountDates(page);
  const date = host.getByRole("button", { name: "单个日期", exact: true });
  const range = host.getByRole("button", { name: "日期区间", exact: true });
  for (const name of ["单个日期", "日期区间", "清除日期", "清除日期范围"])
    await expect(
      host.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  await host.dispatchEvent("enable-controls");
  await date.click();
  await expect(date).toHaveAttribute("aria-expanded", "true");
  await host.dispatchEvent("disable-controls");
  await expect(date).toHaveAttribute("aria-expanded", "false");
  await expect(date).toHaveText("2026年10月31日");
  await host.dispatchEvent("enable-controls");
  await range.click();
  await expect(range).toHaveAttribute("aria-expanded", "true");
  await host.dispatchEvent("disable-controls");
  await expect(range).toHaveAttribute("aria-expanded", "false");
  await expect(range).toHaveText("2026/10/30 – 2026/10/31");
});

test("可跳转的通知有链接入口，可以用键盘打开", async ({ page }) => {
  await page.goto("/dev/design");
  await page.evaluate(async () => {
    const path = "/src/shared/ui/lib/notifications.ts";
    const { notify, useNotices } = await import(path);
    useNotices().clear();
    notify({ title: "查看偏好设置", text: "打开设置页面", to: "/settings" });
  });
  await page
    .getByRole("button", { name: "通知，1 条未读", exact: true })
    .click();
  const notification = page.getByRole("link", { name: /查看偏好设置/ });
  await notification.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
});
