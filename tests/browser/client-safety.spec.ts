import { expect, test, type Page } from "@playwright/test";

async function showFile(page: Page, name: string, body: string, declaredSize = Buffer.byteLength(body)) {
  await page.route("**/api/v1/files/demo-team/safety-file/*", (route) => {
    if (route.request().url().endsWith("/info")) return route.fulfill({
      json: {
        id: "safety-file", org_id: "demo-team", name, size: declaredSize,
        sha256: "a".repeat(64), content_type: "text/plain", created_at: "2026-10-07T00:00:00Z",
      },
    });
    return route.fulfill({ contentType: "text/plain", body });
  });
  await page.goto("/files/safety-file");
  await page.getByRole("button", { name: "显示预览", exact: true }).click();
}

test("实际正文超过限制时显示拒绝预览，不信任较小的元数据", async ({ page }) => {
  await showFile(page, "small.txt", "X".repeat(1024 * 1024 + 1), 3);
  await expect(page.getByText("文本超过 1 MB，无法在浏览器里预览", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "显示预览", exact: true })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
  expect((await page.locator("main").textContent())!.length).toBeLessThan(2000);
});

test("Markdown 的 HTML 和危险 URL 保持普通文字", async ({ page }) => {
  const content = '# 安全预览\n\n<img src="bad" onerror="window.unsafePreview = true">\n\n[危险地址](javascript:alert)\n\n[正常地址](https://example.com)';
  await showFile(page, "safe.md", content);
  const document = page.getByRole("article");
  await expect(document.getByRole("heading", { name: "安全预览", exact: true })).toBeVisible();
  await expect(document.locator("script, img")).toHaveCount(0);
  await expect(document.getByRole("link", { name: "危险地址", exact: true })).toHaveCount(0);
  await expect(document.getByRole("link", { name: "正常地址", exact: true })).toHaveAttribute("rel", "noopener noreferrer");
  await expect(document).toContainText('<img src="bad" onerror="window.unsafePreview = true">');
  expect(await page.evaluate(() => "unsafePreview" in window)).toBe(false);
});

test("异常长 Markdown 能正常显示并继续操作页面", async ({ page }) => {
  const content = "[".repeat(64_000);
  await showFile(page, "incomplete.md", content);
  await expect(page.getByRole("article")).toHaveText(content);
  await page.getByRole("button", { name: "主题与外观", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("后台回显敏感登录值时，实际导出的操作记录已经清理", async ({ page }) => {
  const username = "synthetic_private_account";
  const password = "synthetic_private_password";
  let calls = 0;
  const claims = Buffer.from(JSON.stringify({ permissions: [] })).toString("base64url");
  await page.route("**/api/v1/access/login", (route) => {
    calls++;
    return calls === 1 ? route.fulfill({
      status: 401, json: { message: `账号 ${username} 或密码 ${password} 无效` },
    }) : route.fulfill({
      json: { access_token: `h.${claims}.s`, token_type: "bearer", expires_in: 600, refresh_token: "synthetic_refresh", refresh_expires_in: 1200, user_id: 1, org_id: "demo-team" },
    });
  });
  await page.goto("/login");
  await page.getByLabel("组织代码", { exact: true }).fill("demo-team");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("已隐藏");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/files$/);
  await page.getByRole("link", { name: "开发者工具", exact: true }).click();
  await page.getByRole("link", { name: "操作记录", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出记录", exact: true }).click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString("utf8");
  expect(exported).not.toContain(username);
  expect(exported).not.toContain(password);
  expect(exported).toContain("账号 已隐藏 或密码 已隐藏 无效");
});
