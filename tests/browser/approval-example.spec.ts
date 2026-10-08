import { test, expect } from "@playwright/test";

test("采购金额为42792元，退回必填且保留输入，最终状态不能重复审批", async ({ page }) => {
  await page.goto("/dev/examples/approval");
  // 金额同时出现在摘要带与明细合计处，两处必须一致。
  await expect(page.getByText("¥42,792.00", { exact: true })).toHaveCount(2);
  await expect(page.getByText("¥42,792.00", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "退回", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "退回采购申请", exact: true });
  await dialog.getByRole("button", { name: "确认退回", exact: true }).click();
  await expect(dialog.getByText("请输入退回原因，方便发起人修改申请。", { exact: true })).toBeVisible();
  await dialog.getByRole("textbox", { name: "退回原因", exact: false }).fill("请补充供应商报价");
  await dialog.getByRole("button", { name: "继续查看", exact: true }).click();
  page.once("dialog", (notice) => notice.dismiss());
  await page.getByRole("link", { name: "客户管理", exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/examples\/approval$/);
  await page.getByRole("button", { name: "退回", exact: true }).click();
  await expect(dialog.getByRole("textbox")).toHaveValue("请补充供应商报价");
  await dialog.getByRole("button", { name: "确认退回", exact: true }).click();
  await expect(page.getByRole("button", { name: "已退回", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: /审批记录/ }).click();
  await expect(page.getByText("林默退回申请", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "重置演示", exact: true }).click();
  await page.getByRole("button", { name: "通过审批", exact: true }).click();
  await page.getByRole("button", { name: "确认通过", exact: true }).click();
  await expect(page.getByRole("button", { name: "已通过", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "通过审批", exact: true })).toBeEnabled();
});
