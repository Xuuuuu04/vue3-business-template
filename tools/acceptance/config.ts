import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { context, shellArgument } from "./context";
const run = context();
const backendCommand = [
  "uv",
  "run",
  "--locked",
  "dev",
  "acceptance-server",
  "--port",
  String(run.backendPort),
  "--run-id",
  run.runId,
  "--lifecycle-file",
  resolve(run.output, "backend-lifecycle.json"),
  ...(run.seed ? ["--seed"] : []),
]
  .map(shellArgument)
  .join(" ");
export default defineConfig({
  testDir: resolve(
    run.infrastructure ? "tools/acceptance/smoke" : "tests/acceptance",
  ),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 30000,
  globalTimeout: 300000,
  globalSetup: resolve("tools/acceptance/setup.ts"),
  outputDir: resolve(run.output, "artifacts"),
  reporter: [[resolve("tools/acceptance/reporter.ts")]],
  use: {
    baseURL: `http://127.0.0.1:${run.frontendPort}`,
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: backendCommand,
      cwd: resolve(run.backend, "server"),
      url: `http://127.0.0.1:${run.backendPort}/health/ready`,
      reuseExistingServer: false,
      timeout: 60000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `${shellArgument(process.execPath)} node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${run.frontendPort}`,
      cwd: process.cwd(),
      env: {
        VITE_API_MODE: "real",
        API_PROXY_TARGET: `http://127.0.0.1:${run.backendPort}`,
      },
      url: `http://127.0.0.1:${run.frontendPort}`,
      reuseExistingServer: false,
      timeout: 60000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
