import { test, expect } from "@playwright/test";

/**
 * 每套配色在浅色、深色和三种侧栏风格下，文字与底色的对比度都要达标：
 * 正文类 4.5:1，提示与占位类 3:1。换主题、改色阶后先跑这个测试。
 */
const PAIRS: [string, string, number][] = [
  ["fg", "canvas", 4.5], ["fg", "surface", 4.5], ["fg", "muted", 4.5],
  ["fg-muted", "surface", 4.5], ["fg-muted", "canvas", 4.5], ["fg-muted", "subtle", 4.5],
  ["fg-faint", "surface", 3],
  ["primary-ink", "primary", 4.5], ["primary-text", "primary-soft", 4.5], ["primary-text", "surface", 4.5],
  ["ok", "ok-soft", 4.5], ["warn", "warn-soft", 4.5], ["bad", "bad-soft", 4.5], ["info", "info-soft", 4.5],
  ["ok", "surface", 4.5], ["bad", "surface", 4.5],
  ["side-fg", "side-bg", 4.5], ["side-active", "side-bg", 4.5], ["side-fg-faint", "side-bg", 3],
];
const PALETTES = ["graphite", "sand", "sea", "pine", "rose", "ink", "night"];

test("所有配色、明暗、侧栏组合的文字对比度达标", async ({ page }) => {
  await page.goto("/dev/design");
  const failures = await page.evaluate(
    async ([pairs, palettes]) => {
      // 通过开发服务器直接加载主题引擎，和页面使用同一份代码。
      const url = "/src/shared/ui/theme/theme.ts";
      const { applyTheme } = (await import(/* @vite-ignore */ url)) as {
        applyTheme: (settings: Record<string, unknown>) => void;
      };
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      const rgb = (value: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)] as [number, number, number];
      };
      const lum = ([r, g, b]: number[]) => {
        const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
      };
      /** 半透明底色先叠在页面底色上，再算对比度。 */
      const flatten = (probe: HTMLElement, name: string, under: [number, number, number]) => {
        probe.style.color = `var(--${name})`;
        const cs = getComputedStyle(probe).color;
        const m = cs.match(/\/\s*([\d.]+)\)/);
        const base = rgb(cs);
        const a = m ? Number(m[1]) : 1;
        return base.map((c, i) => Math.round(c * a + under[i]! * (1 - a))) as [number, number, number];
      };
      const probe = document.createElement("div");
      document.body.append(probe);
      const bad: string[] = [];
      for (const palette of palettes as string[])
        for (const mode of ["light", "dark"] as const)
          for (const sidebar of ["dark", "light", "brand"] as const) {
            applyTheme({ palette, mode, radius: "soft", density: "compact", sidebar, brandHue: null });
            const canvas = flatten(probe, "canvas", [255, 255, 255]);
            for (const [fg, bg, min] of pairs as [string, string, number][]) {
              const under = bg.startsWith("primary-soft") || bg.endsWith("-soft") ? canvas : [255, 255, 255] as [number, number, number];
              const back = flatten(probe, bg, under);
              const front = flatten(probe, fg, back);
              const [hi, lo] = [lum(front), lum(back)].sort((x, y) => y - x) as [number, number];
              const ratio = (hi + 0.05) / (lo + 0.05);
              if (ratio < min) bad.push(`${palette}/${mode}/${sidebar}：${fg} 在 ${bg} 上只有 ${ratio.toFixed(2)}:1（要求 ${min}）`);
            }
          }
      return bad;
    },
    [PAIRS, PALETTES] as const,
  );
  expect(failures).toEqual([]);
});
