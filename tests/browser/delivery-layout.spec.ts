import { test, expect } from "@playwright/test";

test("窄屏长标题完整显示，主要操作保持独立且不造成横向溢出", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/examples/approval");
  const heading = page.getByRole("heading", { level: 1 });
  await heading.evaluate((element) => {
    element.textContent = "华东区域设计团队第二批工作站与显示设备采购申请";
  });
  const action = page.getByRole("button", { name: "通过审批", exact: true });
  const title = await heading.boundingBox();
  const button = await action.boundingBox();
  expect(title!.height).toBeGreaterThan(32);
  expect(button!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("公共消息输入只提交内容，失败和未知结果由页面保留草稿", async ({
  page,
}) => {
  await page.goto("/dev/design?section=ai&example=conversation");
  await page.evaluate(async () => {
    const path = "/src/shared/ui/ai/PromptInput.vue";
    const source = await (await fetch(path)).text();
    const vuePath = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h, ref } = await import(vuePath);
    const { default: Input } = await import(path);
    const draft = ref("需要确认的回复");
    const host = document.createElement("div");
    host.dataset.draftFixture = "";
    host.style.cssText =
      "position:fixed;inset:80px 24px auto;z-index:600;background:var(--surface)";
    document.body.append(host);
    createApp({
      render: () =>
        h(Input, {
          modelValue: draft.value,
          "onUpdate:modelValue": (value: string) => {
            draft.value = value;
          },
          onSend: (text: string) => {
            host.dataset.sent = text;
          },
        }),
    }).mount(host);
  });
  const fixture = page.locator("[data-draft-fixture]");
  await fixture.getByRole("button", { name: "发送", exact: true }).click();
  await expect(fixture).toHaveAttribute("data-sent", "需要确认的回复");
  await expect(fixture.getByRole("textbox")).toHaveValue("需要确认的回复");
});
