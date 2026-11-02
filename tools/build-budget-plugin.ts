import type { Plugin } from "vite";
import {
  inspectBuildBudget,
  readBuildBudget,
  type BuildBudget,
} from "./build-budget.ts";

export function buildBudget(): Plugin {
  let budget: BuildBudget;
  let base: string;
  return {
    name: "build-code-budget",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      budget = readBuildBudget(config.root);
      base = config.base;
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const report = inspectBuildBudget(bundle, budget, base);
        for (const page of report.pages)
          this.info(
            `${page.html} 启动静态 JS/CSS gzip：${page.gzipBytes} / ${budget.initialCodeGzipBytes} B（${page.files.length} 个文件）`,
          );
        const largest = [...report.assets].sort(
          (left, right) => right.gzipBytes - left.gzipBytes,
        )[0];
        if (largest)
          this.info(
            `最大单个 JS/CSS gzip：${largest.file} ${largest.gzipBytes} / ${budget.assetGzipBytes} B`,
          );
        if (report.errors.length) this.error(report.errors.join("\n"));
      },
    },
  };
}
