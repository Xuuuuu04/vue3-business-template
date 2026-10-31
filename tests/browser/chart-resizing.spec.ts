import { test, expect } from "@playwright/test";

test("图表切换与调整窗口尺寸不产生 ResizeObserver 循环，文字和高度保持可读", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const example of ["line", "bars"]) {
    await page.goto(`/dev/design?section=data&example=${example}`);
    const chart = page.locator('[data-gallery-preview] svg[role="img"]');
    await expect(chart).toBeVisible();
    for (const width of [1440, 768, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          chart.evaluate((svg) =>
            Math.abs(
              svg.getBoundingClientRect().width -
                (svg as SVGSVGElement).viewBox.baseVal.width,
            ),
          ),
        )
        .toBeLessThan(1);
      const box = (await chart.boundingBox())!;
      expect(box.height).toBeCloseTo(example === "line" ? 240 : 220, 0);
    }
  }
  expect(errors).toEqual([]);
});
