import { test, expect } from "@playwright/test";

test("会话保留各自草稿，消息只加入当前会话，已处理禁止发送", async ({
  page,
}) => {
  await page.goto("/dev/examples/inbox");
  const reply = page.getByRole("textbox", { name: "回复客户", exact: true });
  await reply.fill("林知夏的草稿");
  const list = page.getByRole("navigation", {
    name: "选择客户会话",
    exact: true,
  });
  await list.getByRole("button").filter({ hasText: "陈一鸣" }).click();
  await expect(reply).toHaveValue("");
  await reply.fill("陈一鸣的草稿");
  await list.getByRole("button").filter({ hasText: "林知夏" }).click();
  await expect(reply).toHaveValue("林知夏的草稿");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(
    page.getByRole("log", { name: "林知夏", exact: true }),
  ).toContainText("林知夏的草稿");
  await list.getByRole("button").filter({ hasText: "陈一鸣" }).click();
  await expect(reply).toHaveValue("陈一鸣的草稿");
  await expect(
    page.getByRole("log", { name: "陈一鸣", exact: true }),
  ).not.toContainText("林知夏的草稿");
  await page.getByRole("button", { name: "标记已处理", exact: true }).click();
  await expect(reply).toBeDisabled();
  await page.getByRole("button", { name: "重新打开", exact: true }).click();
  await expect(reply).toHaveValue("陈一鸣的草稿");
});

test("手机会话逐页查看、返回焦点回到原客户且页面没有横向溢出", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/examples/inbox");
  const selected = page
    .getByRole("navigation", { name: "选择客户会话", exact: true })
    .getByRole("button")
    .filter({ hasText: "陈一鸣" });
  await selected.click();
  await expect(page.getByRole("textbox", { name: "回复客户" })).toBeVisible();
  const headingName = page
    .getByRole("region", { name: "陈一鸣的会话", exact: true })
    .locator("header p")
    .first();
  const nameBox = await headingName.boundingBox();
  expect(nameBox!.height).toBeLessThanOrEqual(24);
  await page.getByRole("button", { name: "返回会话列表", exact: true }).click();
  await expect(selected).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("手机直接访问会话链接时显示相应消息，刷新保持当前会话", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/examples/inbox?conversation=chen");
  await expect(
    page.getByRole("log", { name: "陈一鸣", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("log", { name: "陈一鸣", exact: true }),
  ).toContainText("只允许查看");
  await page.reload();
  await expect(
    page.getByRole("log", { name: "陈一鸣", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回会话列表", exact: true }).click();
  const selected = page
    .getByRole("navigation", { name: "选择客户会话", exact: true })
    .getByRole("button")
    .filter({ hasText: "陈一鸣" });
  await expect(selected.getByLabel("2 条未读", { exact: true })).toHaveCount(0);
});
