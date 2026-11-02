import { spawn } from "node:child_process";
import { createServer, createConnection } from "node:net";
export async function requireFreePort(port: number) {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
}
export async function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1000, () => finish(true));
  });
}
export function runPlaywright(env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        "tools/acceptance/config.ts",
      ],
      {
        stdio: "inherit",
        env,
        detached: process.platform !== "win32",
      },
    );
    let interrupted = false;
    const stop = () => {
      interrupted = true;
      child.kill("SIGINT");
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const cleanup = () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    };
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code) => {
      cleanup();
      resolve(interrupted ? 130 : (code ?? 1));
    });
  });
}
