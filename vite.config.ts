import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { execFileSync } from "node:child_process";
import { demoApi } from "./tools/demo-api.ts";
import { developmentGuard } from "./tools/dev-guard.ts";
import { sourceFingerprint } from "./tools/lib.ts";
export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  if (command === "serve")
    execFileSync(
      process.execPath,
      ["--import", "tsx", "tools/check.ts", "--structure"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_DISABLED_MODULES: env.VITE_DISABLED_MODULES || "",
        },
      },
    );
  const demo = env.VITE_API_MODE !== "real";
  if (command === "build" && demo && env.ALLOW_DEMO_BUILD !== "true")
    throw new Error(
      "生产打包必须设置 VITE_API_MODE=real；样板预览请显式设置 ALLOW_DEMO_BUILD=true",
    );
  return {
    plugins: [
      vue(),
      tailwindcss(),
      developmentGuard(),
      ...(demo ? [demoApi()] : []),
    ],
    define: {
      "import.meta.env.VITE_CODE_VERSION": JSON.stringify(
        env.VITE_CODE_VERSION || sourceFingerprint().slice(0, 16),
      ),
    },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      port: 5180,
      strictPort: true,
      proxy: demo
        ? undefined
        : {
            "/api": {
              target: env.API_PROXY_TARGET || "http://127.0.0.1:8000",
              changeOrigin: true,
            },
          },
    },
    preview: { host: "127.0.0.1", port: 5181, strictPort: true },
    build: { sourcemap: false, chunkSizeWarningLimit: 500 },
  };
});
