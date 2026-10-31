import { test, expect } from "@playwright/test";

test("拖入文件经过内部文字时保持高亮，离开整个区域才恢复", async ({ page }) => {
  await page.goto("/dev/design?section=forms&example=upload");
  const input = page.locator('input[type="file"]');
  const zone = input.locator("..");
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["内容"], "拖入.txt", { type: "text/plain" }));
    return data;
  });
  await zone.dispatchEvent("dragenter", { dataTransfer: transfer });
  await zone.dispatchEvent("dragover", { dataTransfer: transfer });
  await expect(zone).toHaveAttribute("data-dragging", "true");
  await zone
    .locator("span")
    .first()
    .dispatchEvent("dragenter", { dataTransfer: transfer });
  await zone.dispatchEvent("dragleave", { dataTransfer: transfer });
  await expect(zone).toHaveAttribute("data-dragging", "true");
  await zone
    .locator("span")
    .first()
    .dispatchEvent("dragleave", { dataTransfer: transfer });
  await expect(zone).not.toHaveAttribute("data-dragging");
  await zone.dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByText("拖入.txt", { exact: true })).toBeVisible();
  await transfer.dispose();
});

test("普通文字拖入不显示文件反馈，选择后可移除并再次选择同一文件", async ({
  page,
}) => {
  await page.goto("/dev/design?section=forms&example=upload");
  const input = page.locator('input[type="file"]');
  const zone = input.locator("..");
  const text = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "普通文字");
    return data;
  });
  await zone.dispatchEvent("dragenter", { dataTransfer: text });
  await zone.dispatchEvent("dragover", { dataTransfer: text });
  await expect(zone).not.toHaveAttribute("data-dragging");
  const file = {
    name: "重复.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("内容"),
  };
  await input.setInputFiles(file);
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "移除已选文件", exact: true }).click();
  await expect(input).toBeFocused();
  await input.setInputFiles(file);
  await expect(page.getByText("重复.txt", { exact: true })).toBeVisible();
  await text.dispose();
});
