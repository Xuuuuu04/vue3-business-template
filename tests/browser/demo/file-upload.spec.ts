import { test, expect } from "@playwright/test";

test("上传结果未知时，选择和移除都停用，拖入不能替换待确认文件", async ({
  page,
}) => {
  await page.route("**/api/v1/files/demo-team", (route) =>
    route.request().method() === "POST"
      ? route.abort("connectionreset")
      : route.continue(),
  );
  await page.goto("/files/upload");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "待确认.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("内容"),
  });
  await page.getByRole("button", { name: "保存文件", exact: true }).click();
  await expect(input).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "移除已选文件", exact: true }),
  ).toBeDisabled();
  const replacement = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(["其他内容"], "另一个.txt", { type: "text/plain" }),
    );
    return data;
  });
  await input
    .locator("..")
    .dispatchEvent("drop", { dataTransfer: replacement });
  await expect(page.getByText("待确认.txt", { exact: true })).toBeVisible();
  await expect(page.getByText("另一个.txt", { exact: true })).toHaveCount(0);
  await replacement.dispose();
});
