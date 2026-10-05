import { test, expect, type Page } from "@playwright/test";

/** 只换 SPA 参数，不重新加载，确保复用原详情组件。 */
async function switchDetail(page: Page, url: string) {
  await page.evaluate((next) => {
    history.pushState({}, "", next);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, url);
}
async function detailPair(page: Page) {
  await page.goto("/files");
  await expect(page.locator(".text-link").nth(1)).toBeVisible();
  const links = page.locator(".text-link");
  const firstName = await links.nth(0).innerText();
  const secondName = await links.nth(1).innerText();
  await links.nth(1).click();
  await expect(
    page.getByRole("heading", { name: secondName, exact: true }),
  ).toBeVisible();
  const second = { url: page.url(), name: secondName };
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(links.nth(0)).toBeVisible();
  await links.nth(0).click();
  await expect(
    page.getByRole("heading", { name: firstName, exact: true }),
  ).toBeVisible();
  return { first: { url: page.url(), name: firstName }, second };
}

test("R-02、R-04：SPA切参数时关闭旧确认，慢读取和403不能操作旧对象", async ({
  page,
}) => {
  const { first, second } = await detailPair(page);
  const secondId = new URL(second.url, "http://demo").pathname
    .split("/")
    .at(-1)!;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const deletes: string[] = [];
  await page.route(
    `**/api/v1/files/demo-team/${secondId}/info`,
    async (route) => {
      requested();
      await gate;
      await route.fulfill({
        status: 403,
        json: { message: "无权读取第二文件" },
      });
    },
  );
  await page.route("**/api/v1/files/demo-team/*", async (route) => {
    if (route.request().method() === "DELETE") {
      deletes.push(route.request().url());
      await route.fulfill({ status: 204 });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(first.name);
  await switchDetail(page, second.url);
  await started;
  // 即使检查失败也释放托管请求，避免测试留下在途处理。
  try {
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: first.name, exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "删除文件", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "下载原文件" })).toHaveCount(
      0,
    );
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toContainText("无权读取第二文件");
  await expect(
    page.getByRole("button", { name: "删除文件", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "下载原文件" })).toHaveCount(0);
  expect(deletes).toEqual([]);
  await switchDetail(page, first.url);
  await expect(
    page.getByRole("heading", { name: first.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(first.name);
  await page.getByRole("button", { name: "保留文件", exact: true }).click();
  expect(deletes).toEqual([]);
});

test("R-04：SPA加载新文件后确认文字和删除请求采用同一对象", async ({
  page,
}) => {
  const { first, second } = await detailPair(page);
  const secondId = new URL(second.url, "http://demo").pathname
    .split("/")
    .at(-1)!;
  const deletes: string[] = [];
  await page.route("**/api/v1/files/demo-team/*", async (route) => {
    if (route.request().method() === "DELETE") {
      deletes.push(route.request().url());
      await route.fulfill({ status: 204 });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await switchDetail(page, second.url);
  await expect(
    page.getByRole("heading", { name: second.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(second.name);
  await expect(page.getByRole("dialog")).not.toContainText(first.name);
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL("/files");
  expect(deletes).toEqual([expect.stringContaining(`/demo-team/${secondId}`)]);
});

test("R-05：SPA切换期间下载保持原文件名", async ({ page }) => {
  const { first, second } = await detailPair(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/api/v1/files/demo-team/*/download", async (route) => {
    const response = await route.fetch();
    requested();
    await gate;
    await route.fulfill({ response });
  });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载原文件" }).click();
  await started;
  try {
    await switchDetail(page, second.url);
    await expect(
      page.getByRole("heading", { name: second.name, exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
  expect((await downloaded).suggestedFilename()).toBe(first.name);
});
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
  await page.getByLabel("选择文件").setInputFiles({
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
  await page.getByLabel("选择文件").setInputFiles({
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
  await page.getByLabel("选择文件").setInputFiles({
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
