import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { fingerprint, parseArgs, run } from "./lib";
parseArgs("用法：npm run test:browser", {});
mkdirSync("var/checks", { recursive: true });
let checkedFingerprint = fingerprint();
const output = "var/checks/browser-tests.json";
function save(status: string, fields: Record<string, unknown> = {}) {
  writeFileSync(
    "var/checks/browser.json",
    JSON.stringify(
      {
        fingerprint: checkedFingerprint,
        checkedAt: new Date().toISOString(),
        status,
        scope: "浏览器与独立演示 HTTP 服务",
        ...fields,
      },
      null,
      2,
    ) + "\n",
  );
}
save("本轮尚未通过");
rmSync(output, { force: true });
try {
  run(process.execPath, ["--import", "tsx", "tools/check.ts", "--structure"]);
  checkedFingerprint = fingerprint();
  save("本轮尚未通过");
  const result = spawnSync("npx", ["playwright", "test"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: output,
    },
  });
  if (result.error) throw result.error;
  const report = existsSync(output)
    ? (JSON.parse(readFileSync(output, "utf8")) as { stats?: unknown })
    : undefined;
  if (result.status === 0 && !report)
    throw new Error("浏览器测试没有生成本轮结果");
  if (fingerprint() !== checkedFingerprint)
    throw new Error("浏览器检查期间代码发生变化，请重新检查");
  save(result.status === 0 ? "通过" : "失败", { stats: report?.stats });
  process.exitCode = result.status ?? 1;
} catch (error) {
  const message = error instanceof Error ? error.message : "浏览器检查失败";
  save("失败", { error: message });
  console.error(message);
  process.exitCode = 1;
}
