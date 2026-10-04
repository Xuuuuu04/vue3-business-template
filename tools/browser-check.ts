/** 浏览器测试成功与源码版本一起保存，失败也不会保留旧成功状态。 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fingerprint, run } from "./lib";
run(process.execPath, ["--import", "tsx", "tools/check.ts", "--structure"]);
mkdirSync("var/checks", { recursive: true });
const result = spawnSync("npx", ["playwright", "test"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: "var/checks/browser-tests.json",
  },
});
const report = existsSync("var/checks/browser-tests.json")
  ? (JSON.parse(readFileSync("var/checks/browser-tests.json", "utf8")) as {
      stats?: unknown;
    })
  : {};
writeFileSync(
  "var/checks/browser.json",
  JSON.stringify(
    {
      fingerprint: fingerprint(),
      checkedAt: new Date().toISOString(),
      status: result.status === 0 ? "通过" : "失败",
      scope: "浏览器与独立演示 HTTP 服务",
      stats: report.stats,
    },
    null,
    2,
  ) + "\n",
);
process.exit(result.status ?? 1);
