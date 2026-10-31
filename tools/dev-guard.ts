import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import type { Plugin } from "vite";
export function developmentGuard(): Plugin {
  return {
    name: "architecture-on-save",
    handleHotUpdate(context) {
      const name = relative(process.cwd(), context.file);

      if (name === "src/generated/version.json") return [];
      if (!/^(src\/|tools\/|framework\.lock|scaffold\.json|doc\/)/.test(name))
        return;
      try {
        execFileSync(
          process.execPath,
          ["--import", "tsx", "tools/check.ts", "--structure"],
          { stdio: "pipe" },
        );
      } catch (error) {
        const output = String(
          (error as { stderr?: Buffer }).stderr ?? "",
        ).trim();
        const message =
          output || (error instanceof Error ? error.message : "结构检查失败");
        context.server.ws.send({
          type: "error",
          err: {
            message: "当前修改不能运行：\n" + message,
            stack: "",
            plugin: "architecture-on-save",
          },
        });
        return [];
      }
    },
  };
}
