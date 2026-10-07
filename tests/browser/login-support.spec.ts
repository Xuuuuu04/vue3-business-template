import { expect, test } from "@playwright/test";

for (const support of [
  { email: "", helpUrl: "" },
  { email: "support@example.test", helpUrl: "" },
  { email: "", helpUrl: "https://help.example.test" },
]) {
  test(`密码帮助与真实联系方式一致：${support.email || support.helpUrl || "未配置"}`, async ({ page }) => {
    await page.route("**/src/app/app.config.ts*", async (route) => {
      const reply = await route.fetch();
      await route.fulfill({ response: reply, body: (await reply.text()) + `\nappConfig.support = ${JSON.stringify(support)};\n` });
    });
    await page.goto("/login");
    const entry = page.getByRole("button", { name: "忘记密码？", exact: true });
    if (!support.email && !support.helpUrl) {
      await expect(entry).toHaveCount(0);
      await expect(page.locator('a[href="mailto:"]')).toHaveCount(0);
    } else {
      await entry.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("管理员重置密码");
      if (support.email) await expect(dialog.getByRole("link", { name: support.email })).toHaveAttribute("href", `mailto:${support.email}`);
      else {
        await expect(dialog.getByRole("link", { name: "前往帮助中心" })).toHaveAttribute("href", support.helpUrl);
        await expect(dialog.getByRole("link", { name: "前往帮助中心" })).toHaveAttribute("rel", "noopener noreferrer");
        await expect(dialog.locator('a[href^="mailto:"]')).toHaveCount(0);
      }
    }
  });
}
