/** 使用真实 HTTP 后台与浏览器检查；只在明确提供的隔离测试账号上运行。 */
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fingerprint } from "./lib";
const args = process.argv.slice(2);
function option(name: string, fallback = "") {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] || fallback : fallback;
}
const frontend = option("--frontend", "http://127.0.0.1:5182");
const org = option("--org");
const username = option("--username");
const password = process.env.TEMPLATE_TEST_PASSWORD;
const reader = option("--readonly-user");
if (!org || !username || !password)
  throw new Error(
    "提供 --frontend、--org、--username 与环境变量 TEMPLATE_TEST_PASSWORD。账号必须专用于隔离测试；脚本会上传再删除一个文件。",
  );
const browser = await chromium.launch();
const page = await browser.newPage();
const results: string[] = [];
try {
  await page.goto(frontend + "/login");
  await page.getByLabel("组织代码").fill(org);
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录账号", exact: true }).click();
  await expect(page).toHaveURL(frontend + "/files");
  await expect(
    page.getByRole("button", { name: "上传文件", exact: true }),
  ).toBeVisible();
  results.push("真实账号登录与写权限显示");
  const name = `frontend-integration-${Date.now()}.txt`;
  const bytes = Buffer.from("Vue3 与真实 FastAPI 的隔离对接文件。");
  await page.getByRole("button", { name: "上传文件", exact: true }).click();
  await page
    .getByLabel("选择文件")
    .setInputFiles({ name, mimeType: "text/plain", buffer: bytes });
  await page.getByRole("button", { name: "保存文件", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  results.push("真实上传及返回编号详情");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载原文件" }).click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(bytes);
  results.push("真实下载内容逐字节一致");
  await page.getByRole("button", { name: "删除文件", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL(frontend + "/files");
  results.push("真实删除与列表更新");
  await page.getByRole("link", { name: "结构与运行", exact: true }).click();
  await page.getByRole("tab", { name: /实际运行/ }).click();
  await expect(page.getByLabel("运行详情")).not.toContainText(
    "未返回；演示服务",
  );
  await expect(page.getByLabel("运行详情")).toContainText("后台运行编号：");
  results.push("后台真实运行编号关联");
  if (reader) {
    await page.goto(frontend + "/login");
    await page.getByLabel("组织代码").fill(org);
    await page.getByLabel("账号", { exact: true }).fill(reader);
    await page.getByLabel("密码", { exact: true }).fill(password);
    await page.getByRole("button", { name: "登录账号", exact: true }).click();
    await expect(page).toHaveURL(frontend + "/files");
    await expect(
      page.getByRole("button", { name: "上传文件", exact: true }),
    ).toHaveCount(0);
    results.push("只读账号看不到上传操作");
    // 使用浏览器返回事件进入地址，保留当前页面的内存登录状态。
    await page.evaluate(() => {
      history.pushState({}, "", "/files/upload");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(
      page.getByRole("heading", { name: "当前账号没有这项权限", exact: true }),
    ).toBeVisible();
    results.push("只读账号直接进入上传地址也被拒绝");
    await page.goto(frontend + "/files/upload");
    await expect(
      page.getByRole("heading", { name: "登录账号", exact: true }),
    ).toBeVisible();
    results.push("刷新后登录状态失效，受限页面要求重新登录");
    const granted = await fetch(frontend + "/api/v1/access/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_code: org,
        username: reader,
        password,
        otp_code: "",
      }),
    });
    expect(granted.ok).toBe(true);
    const credentials = (await granted.json()) as { access_token: string };
    const body = new FormData();
    body.append("upload", new File(["abc"], "permission-test.txt"));
    const forbidden = await fetch(
      frontend + "/api/v1/files/" + encodeURIComponent(org),
      {
        method: "POST",
        headers: { Authorization: "Bearer " + credentials.access_token },
        body,
      },
    );
    expect(forbidden.status).toBe(403);
    results.push("后台拒绝只读账号强行上传");
    const foreign = await fetch(frontend + "/api/v1/files/another-team", {
      headers: { Authorization: "Bearer " + credentials.access_token },
    });
    expect(foreign.status).toBe(403);
    results.push("后台拒绝访问其他组织文件");
  }
  mkdirSync("var/checks", { recursive: true });
  writeFileSync(
    "var/checks/backend.json",
    JSON.stringify(
      {
        fingerprint: fingerprint(),
        checkedAt: new Date().toISOString(),
        status: "通过",
        service: "真实 HTTP 后台；环境和存储以实际启动配置为准",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(results.join("\n"));
} catch (error) {
  mkdirSync("var/checks", { recursive: true });
  writeFileSync(
    "var/checks/backend.json",
    JSON.stringify(
      {
        fingerprint: fingerprint(),
        checkedAt: new Date().toISOString(),
        status: "失败",
        service: "真实 HTTP 后台",
        results,
        error: String(error),
      },
      null,
      2,
    ) + "\n",
  );
  throw error;
} finally {
  await browser.close();
}
