import { test, expect } from "@playwright/test";

test("客户示例筛选可刷新，新建校验后显示新客户且刷新还原", async ({ page }) => {
  await page.goto("/dev/examples/customers");
  await page
    .getByRole("searchbox", { name: "搜索客户、联系人或手机号" })
    .pressSequentially("云杉");
  await expect(
    page.getByRole("row").filter({ hasText: "云杉数字科技" }),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/customer_search=/);
  await expect(page.getByRole("searchbox")).toHaveValue("云杉");
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("云杉");
  await page.getByRole("button", { name: "新建客户", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "新建客户", exact: true });
  await dialog.getByRole("button", { name: "添加客户", exact: true }).click();
  await expect(
    dialog.getByText("请输入 2–80 个字的客户名称", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "客户名称", exact: false })
    .fill("青木示例公司");
  await dialog
    .getByRole("textbox", { name: "联系人", exact: false })
    .fill("周小云");
  await dialog
    .getByRole("textbox", { name: "手机号", exact: false })
    .fill("13812345678");
  await dialog.getByRole("button", { name: "添加客户", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "青木示例公司" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "查看青木示例公司", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "青木示例公司", exact: true }),
  ).toContainText("13812345678");
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "青木示例公司" }),
  ).toHaveCount(0);
});
