import { test, expect } from "@playwright/test";

test("活动校验保留输入，还原最后保存内容，离开可取消", async ({ page }) => {
  await page.goto("/dev/examples/campaign");
  const name = page.getByRole("textbox", { name: "活动名称", exact: false });
  await name.fill("");
  await page.getByRole("button", { name: "保存示例", exact: true }).click();
  await expect(page.getByText("请输入活动名称。", { exact: true })).toBeVisible();
  await name.fill("冬季体验活动");
  await page.getByRole("button", { name: "保存示例", exact: true }).click();
  await expect(page.getByText(/示例已保存 ·/)).toBeVisible();
  await name.fill("未保存的活动");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "采购审批", exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/examples\/campaign$/);
  await expect(name).toHaveValue("未保存的活动");
  await page.getByRole("button", { name: "还原", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "放弃修改", exact: true }).click();
  await expect(name).toHaveValue("冬季体验活动");
  await page.reload();
  await expect(name).toHaveValue("秋季新品体验活动");
});
