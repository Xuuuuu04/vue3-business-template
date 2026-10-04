/** 保存违规源码时拒绝热更新并显示具体原因；新启动仍执行完整结构检查。 */
import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import type { Plugin } from "vite";
export function developmentGuard(): Plugin {
  return {
    name: "architecture-on-save",
    handleHotUpdate(context) {
      const name = relative(process.cwd(), context.file);
      if (!/^(src\/|tools\/|framework\.lock|scaffold\.json|doc\/)/.test(name))
        return;
      try {
        execFileSync(
          process.execPath,
          ["--import", "tsx", "tools/check.ts", "--structure"],
          { stdio: "pipe" },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "结构检查失败";
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
