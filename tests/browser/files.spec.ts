import { test, expect } from "@playwright/test";
test("R-01、R-02：分页、筛选、详情刷新与浏览器返回", async ({ page }) => {
  await page.goto("/files?offset=10&q=");
  await expect(page.getByText("共 16 个文件", { exact: false })).toBeVisible();
  const name = await page.locator(".text-link").first().innerText();
  await page.getByLabel("筛选本页文件").fill(name);
  await expect(page).toHaveURL(/q=/);
  await page.locator(".text-link").first().click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("筛选本页文件")).toHaveValue(name);
  await expect(page).toHaveURL(/offset=10/);
});
test("R-03、R-04、R-05：实际上传、下载内容与确认删除", async ({ page }) => {
  const bytes = Buffer.from("真正通过 HTTP 上传的样板内容");
  await page.goto("/files/upload");
  await page
    .getByLabel("选择文件")
    .setInputFiles({
      name: "browser-evidence.txt",
      mimeType: "text/plain",
      buffer: bytes,
    });
  await page.getByRole("button", { name: "保存文件", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "browser-evidence.txt", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载原文件" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(bytes);
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("browser-evidence.txt");
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL("/files");
  await expect(
    page.getByText("browser-evidence.txt", { exact: true }),
  ).toHaveCount(0);
});
test("R-06：重复点击只提交一次，写入中断展示未知结果和查询入口", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/files/demo-team", async (route) => {
    if (route.request().method() === "POST") {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/files/upload");
  await page
    .getByLabel("选择文件")
    .setInputFiles({
      name: "unknown.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("abc"),
    });
  await page.getByRole("button", { name: "保存文件", exact: true }).dblclick();
  await expect(page.getByRole("alert")).toContainText("保存结果尚不能确认");
  expect(calls).toBe(1);
  await expect(
    page.getByRole("button", { name: "保存文件", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "查询最近保存的文件" }),
  ).toBeVisible();
});
test("失败保留输入，未保存文件离开需要确认", async ({ page }) => {
  await page.route("**/api/v1/files/demo-team", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({ status: 403, json: { message: "没有上传权限" } });
    else await route.continue();
  });
  await page.goto("/files/upload");
  await page
    .getByLabel("选择文件")
    .setInputFiles({
      name: "retain.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("abc"),
    });
  await page.getByRole("button", { name: "保存文件", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("没有上传权限");
  await expect(
    page.getByText("已选择：retain.txt", { exact: false }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(page).toHaveURL("/files/upload");
});
test("动作记录显示结果摘要和真实请求时间，不伪造后台编号", async ({ page }) => {
  await page.goto("/files");
  await expect(page.locator(".text-link").first()).toBeVisible();
  await page.getByRole("link", { name: "结构与运行", exact: true }).click();
  await page.getByRole("tab", { name: /实际运行/ }).click();
  await expect(page.getByLabel("运行详情")).toContainText("查看文件列表");
  await expect(page.getByLabel("运行详情")).toContainText("readPage");
  await expect(page.getByLabel("运行详情")).toContainText(
    "页面显示的一页：对象",
  );
  await expect(page.getByLabel("运行详情")).toContainText(
    "未返回；演示服务不会伪造后台编号",
  );
});
