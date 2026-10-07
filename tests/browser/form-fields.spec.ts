import { test, expect } from "@playwright/test";

test("字段名称、帮助、错误和必填状态自动关联到实际输入控件", async ({ page }) => {
  await page.goto("/dev/design?section=forms&example=inputs");
  const name = page.getByRole("textbox", { name: "项目名称", exact: true });
  await expect(name).toHaveAccessibleDescription("用于列表显示");
  await expect(name).toHaveAttribute("aria-required", "true");
  await page.locator('label[for="n"]').click();
  await expect(name).toBeFocused();
  const price = page.getByRole("textbox", { name: "单价", exact: true });
  await expect(price).toHaveAccessibleDescription("金额必须大于 0");
  await expect(price).toHaveAttribute("aria-invalid", "true");
  const password = page.getByLabel("密码", { exact: true });
  await expect(password).toHaveAccessibleDescription("显示或隐藏密码，开启大写时提醒");
  await expect(page.getByRole("textbox", { name: "备注", exact: true })).toBeVisible();
});

test("下拉、多选和日期字段直接使用字段名称，标签点击能进入控件", async ({ page }) => {
  await page.goto("/dev/design?section=forms&example=choices");
  const select = page.getByRole("combobox", { name: "价型", exact: true });
  await expect(select).toHaveAccessibleDescription("选项较少时使用下拉");
  await page.getByText("价型", { exact: true }).click();
  await expect(select).toBeFocused();
  const keywords = page.getByRole("textbox", { name: "关键词", exact: true });
  await expect(keywords).toHaveAccessibleDescription("回车或逗号添加");
  await page.getByText("关键词", { exact: true }).click();
  await expect(keywords).toBeFocused();
  await page.goto("/dev/design?section=forms&example=dates");
  const date = page.getByRole("button", { name: "到货日期", exact: true });
  await page.getByText("到货日期", { exact: true }).click();
  await expect(date).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(date).toBeFocused();
  const range = page.getByRole("button", { name: "统计区间", exact: true });
  await expect(range).toHaveAccessibleDescription("可直接选择常用范围");
});

test("控件显式编号与外部说明保留，Field 标签始终指向实际控件", async ({ page }) => {
  await page.goto("/dev/design?section=forms&example=inputs");
  await page.evaluate(async () => {
    const path = "/src/shared/ui/layout/Field.vue";
    const source = await (await fetch(path)).text();
    const vueUrl = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h } = await import(/* @vite-ignore */ vueUrl);
    const { default: Field } = await import(/* @vite-ignore */ path);
    const components: Record<string, unknown> = {};
    for (const name of ["Input", "Textarea", "Select", "Combobox", "TagsInput", "NumberInput", "DatePicker", "DateRangePicker", "FileDrop"]) {
      const url = `/src/shared/ui/base/${name}.vue`;
      components[name] = (await import(/* @vite-ignore */ url)).default;
    }
    const root = document.createElement("div");
    root.id = "field-fixture";
    root.style.cssText = "position:fixed;inset:0;z-index:500;background:white;overflow:auto;padding:24px";
    document.body.append(root);
    createApp({ render: () => h("div", [
      h("p", { id: "external-label" }, "外部名称"), h("p", { id: "external-hint" }, "外部说明"),
      h(Field, { label: "实际账号", hint: "字段说明" }, { default: () => h(components.Input, { id: "explicit-account", "aria-describedby": "external-hint" }) }),
      ...Object.entries(components).map(([name, component]) => h(component, {
        id: `explicit-${name}`, options: [{ value: "one", label: "一" }],
        "aria-labelledby": "external-label", "aria-describedby": "external-hint", "aria-invalid": "true", "aria-required": "true",
      })),
    ]) }).mount(root);
  });
  const fixture = page.locator("#field-fixture");
  const account = fixture.locator("#explicit-account");
  await fixture.getByText("实际账号", { exact: true }).click();
  await expect(account).toBeFocused();
  await expect(account).toHaveAccessibleDescription("外部说明 字段说明");
  for (const name of ["Input", "Textarea", "Select", "Combobox", "TagsInput", "NumberInput", "DatePicker", "DateRangePicker", "FileDrop"]) {
    const control = fixture.locator(`#explicit-${name}`);
    await expect(control).toHaveCount(1);
    expect(await control.evaluate((node) => node.matches("input,textarea,button"))).toBe(true);
    await expect(control).toHaveAccessibleName("外部名称");
    await expect(control).toHaveAccessibleDescription("外部说明");
    await expect(control).toHaveAttribute("aria-invalid", "true");
    await expect(control).toHaveAttribute("aria-required", "true");
  }
});
