import { test, expect } from "@playwright/test";

test("色相滑条有完整点击区域和焦点，点击、拖动与键盘都能选色", async ({ page }) => {
  await page.goto("/dev/design");
  await page.getByRole("button", { name: "主题与外观", exact: true }).click();
  const slider = page.getByRole("slider", { name: "品牌色色相", exact: true });
  await slider.evaluate(async (node) => { await Promise.all(node.closest(".popup-surface")!.getAnimations({ subtree: true }).map((animation) => animation.finished)); });
  const box = (await slider.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(32);
  await slider.focus();
  await expect(slider).toBeFocused();
  await page.keyboard.press("Home");
  expect(await slider.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await slider.click({ position: { x: box.width / 2, y: box.height / 2 } });
  expect(Number(await slider.inputValue())).toBeGreaterThan(150);
  const current = (await slider.boundingBox())!;
  await page.mouse.move(current.x + current.width / 2, current.y + current.height / 2);
  await page.mouse.down();
  await page.mouse.move(current.x + current.width * 0.8, current.y + current.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Number(await slider.inputValue())).toBeGreaterThan(250);
});

test("弹窗入场只在中心附近移动，不重复偏移半个弹窗", async ({ page }) => {
  await page.goto("/dev/design?section=feedback&example=overlays");
  await page.getByRole("button", { name: "确认弹窗", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((node) => {
    for (const animation of node.getAnimations()) { animation.pause(); animation.currentTime = 0; }
    const rect = node.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: innerWidth, height: innerHeight };
  });
  expect(Math.abs(geometry.x - geometry.width / 2)).toBeLessThan(2);
  expect(Math.abs(geometry.y - geometry.height / 2)).toBeLessThan(6);
});

test("减少动态效果时，弹层和持续加载动画不反复播放", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/design?section=feedback&example=progress");
  const styles = await page.locator('[data-gallery-preview] [role="progressbar"] > div').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    return { duration: style.animationDuration, iterations: style.animationIterationCount, transition: style.transitionDuration };
  }));
  expect(styles.length).toBeGreaterThan(0);
  for (const style of styles) {
    expect(style.iterations).not.toBe("infinite");
    expect(parseFloat(style.duration)).toBeLessThanOrEqual(0.001);
    expect(parseFloat(style.transition)).toBeLessThanOrEqual(0.001);
  }
  await page.getByRole("button", { name: "主题与外观", exact: true }).click();
  await expect(page.getByRole("slider", { name: "品牌色色相", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "主题与外观", exact: true })).toBeFocused();
});

test("320px 手机的主题和通知浮层保留两侧 12px 空间", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/dev/design");
  for (const name of ["主题与外观", "通知"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const panel = page.locator(".popup-surface");
    await expect(panel).toBeVisible();
    await panel.evaluate(async (node) => { await Promise.all(node.getAnimations().map((animation) => animation.finished)); });
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(11.9);
    expect(box.x + box.width).toBeLessThanOrEqual(308.1);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  }
});
