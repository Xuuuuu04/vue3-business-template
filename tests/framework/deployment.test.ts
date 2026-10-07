/** 配置保护和更新默认检查；Docker 实测需要显式 RUN_NGINX_CHECKS=1。 */
import { afterEach, expect, test } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { lockData, protectedFiles, verifyLock } from "../../tools/framework-lock";

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })));
const configuration = readFileSync("deploy/nginx.conf", "utf8");
function directory() {
  const path = mkdtempSync(join(tmpdir(), "vue-nginx-check-"));
  temporary.push(path);
  return path;
}
function write(root: string, file: string, text: string) {
  mkdirSync(resolve(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), text);
}
function saveLock(root: string) {
  write(root, "framework.lock", JSON.stringify(lockData(root)));
}
function update(product: string, source: string, apply = false) {
  return execFileSync(process.execPath, [
    "--import", import.meta.resolve("tsx"), resolve("tools/update-framework.ts"),
    "--source", source, ...(apply ? ["--apply"] : []),
  ], { cwd: product, encoding: "utf8", stdio: "pipe", timeout: 30000 });
}
function versions() {
  const root = directory();
  const source = join(root, "source");
  const product = join(root, "product");
  write(source, "deploy/nginx.conf", configuration + "\n# 新版部署参考\n");
  saveLock(source);
  write(product, "deploy/nginx.conf", configuration);
  write(product, ".template/base.json", JSON.stringify({ "deploy/nginx.conf": configuration }));
  saveLock(product);
  return { source, product };
}

test("部署文件进入保护范围，配置改变后需要重新检查", () => {
  expect(protectedFiles().map((file) => relative(process.cwd(), file))).toContain("deploy/nginx.conf");
  const root = directory();
  write(root, "deploy/nginx.conf", configuration);
  saveLock(root);
  expect(verifyLock(root)).toEqual([]);
  write(root, "deploy/nginx.conf", configuration + "\n# 修改配置\n");
  expect(verifyLock(root)).toEqual(["框架文件 deploy/nginx.conf 已改变，需要单独检查并更新保护记录"]);
});

test("部署模板更新先预览，明确执行后才更新配置", () => {
  const { source, product } = versions();
  const preview = JSON.parse(update(product, source)) as { changes: { file: string }[] };
  expect(preview.changes.map((item) => item.file)).toEqual(["deploy/nginx.conf"]);
  expect(readFileSync(join(product, "deploy/nginx.conf"), "utf8")).toBe(configuration);
  update(product, source, true);
  expect(readFileSync(join(product, "deploy/nginx.conf"), "utf8")).toContain("新版部署参考");
  expect(verifyLock(product)).toEqual([]);
});

test("产品和模板都修改部署配置时，不覆盖产品修改", () => {
  const { source, product } = versions();
  const local = configuration + "\n# 产品独立修改\n";
  write(product, "deploy/nginx.conf", local);
  expect(() => update(product, source, true)).toThrow("产品与模板同时改变");
  expect(readFileSync(join(product, "deploy/nginx.conf"), "utf8")).toBe(local);
  expect(JSON.parse(readFileSync(join(product, ".template/base.json"), "utf8"))).toEqual({ "deploy/nginx.conf": configuration });
});

const backend = String.raw`
import json, socket, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
finished = threading.Event()
class Handler(BaseHTTPRequestHandler):
    writes = 0
    def log_message(self, *args): pass
    def reply(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        if self.path == "/api/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("X-Accel-Buffering", "yes")
            self.end_headers()
            self.wfile.write(b"data: first\n\n")
            self.wfile.flush()
            finished.wait(5)
            self.wfile.write(b"data: second\n\n")
            self.wfile.flush()
            self.close_connection = True
        else:
            if self.path == "/api/release-event": finished.set()
            self.reply(200, {"path": self.path, "writes": Handler.writes,
                "accept_encoding": self.headers.get("Accept-Encoding", ""), "padding": "x" * 2048})
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        Handler.writes += 1
        self.connection.shutdown(socket.SHUT_RDWR)
        self.connection.close()
ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
`;

function docker(...args: string[]) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: "pipe", timeout: 30000 }).trim();
}
function security(reply: Response) {
  const policy = reply.headers.get("content-security-policy")!;
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  expect(policy).toContain("font-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(reply.headers.get("x-content-type-options")).toBe("nosniff");
  expect(reply.headers.get("x-frame-options")).toBe("DENY");
  expect(reply.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  expect(reply.headers.get("strict-transport-security")).toBeNull();
}

test.skipIf(process.env.RUN_NGINX_CHECKS !== "1")("隔离容器实际验证 Nginx 配置、代理、缓存、安全头和流式响应", async () => {
  const root = directory();
  const site = join(root, "site");
  const frontendName = `vue-nginx-${randomUUID()}`;
  const backendName = `${frontendName}-backend`;
  const image = process.env.NGINX_TEST_IMAGE || "nginx:stable-alpine";
  const backendImage = process.env.NGINX_TEST_BACKEND_IMAGE || "python:3.12-slim";
  const owned: string[] = [];
  try {
    docker("image", "inspect", image);
    docker("image", "inspect", backendImage);
    write(site, "index.html", "<!doctype html><html><body>isolated-spa</body></html>");
    write(site, "assets/app-Ab12Cd34.js", 'export const marker = "isolated-safe";\n'.repeat(80));
    write(site, "assets/style-Ab12Cd34.css", ".isolated { color: black; }\n".repeat(80));
    write(site, "assets/font-Ab12Cd34.woff2", "isolated-font-placeholder");
    write(site, "assets/app-Ab12Cd34.js.map", "must-not-be-public");
    write(site, "assets/custom.css", ".custom { color: blue; }");
    write(site, ".env", "isolated-hidden-file");
    write(site, "assets/.private", "isolated-hidden-asset");
    write(root, "backend.py", backend);
    owned.push(frontendName);
    docker("run", "--detach", "--rm", "--pull=never", "--name", frontendName,
      "--read-only", "--tmpfs", "/var/cache/nginx", "--tmpfs", "/var/run",
      "--publish", "127.0.0.1::8080",
      "--volume", `${resolve("deploy/nginx.conf")}:/etc/nginx/conf.d/default.conf:ro`,
      "--volume", `${site}:/usr/share/nginx/html:ro`, "--entrypoint", "nginx", image, "-g", "daemon off;");
    owned.push(backendName);
    docker("run", "--detach", "--rm", "--pull=never", "--name", backendName,
      "--read-only", "--network", `container:${frontendName}`,
      "--volume", `${root}/backend.py:/checks/backend.py:ro`,
      backendImage, "python", "-B", "-u", "/checks/backend.py");
    const syntax = spawnSync("docker", ["exec", frontendName, "nginx", "-t"], { encoding: "utf8", timeout: 10000 });
    expect(syntax.status, syntax.stderr).toBe(0);
    expect(syntax.stderr).toContain("syntax is ok");
    expect(syntax.stderr).toContain("test is successful");
    const address = `http://${docker("port", frontendName, "8080/tcp")}`;
    const request = (path: string, options?: RequestInit) => fetch(address + path, { ...options, signal: AbortSignal.timeout(5000) });
    let ready = false;
    for (let attempt = 0; attempt < 20 && !ready; attempt++) {
      const reply = await request("/api/ready").catch(() => undefined);
      ready = reply?.status === 200;
      await reply?.arrayBuffer();
      if (!ready) await new Promise((done) => setTimeout(done, 100));
    }
    expect(ready).toBe(true);
    for (const path of ["/", "/index.html", "/files/direct-detail"]) {
      const reply = await request(path);
      expect(reply.status).toBe(200);
      security(reply);
      expect(reply.headers.get("cache-control")).toBe("no-store");
      expect(await reply.text()).toContain("isolated-spa");
    }
    for (const path of ["/assets/app-Ab12Cd34.js", "/assets/style-Ab12Cd34.css"]) {
      const reply = await request(path, { headers: { "Accept-Encoding": "gzip" } });
      expect(reply.status).toBe(200);
      security(reply);
      expect(reply.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(reply.headers.get("content-encoding")).toBe("gzip");
      expect(reply.headers.get("vary")).toContain("Accept-Encoding");
      await reply.arrayBuffer();
    }
    const font = await request("/assets/font-Ab12Cd34.woff2");
    expect(font.status).toBe(200);
    expect(font.headers.get("cache-control")).toContain("immutable");
    await font.arrayBuffer();
    const custom = await request("/assets/custom.css");
    expect(custom.headers.get("cache-control")).toBe("no-store");
    await custom.arrayBuffer();
    for (const path of ["/assets/missing-Ab12Cd34.js", "/assets/app-Ab12Cd34.js.map", "/.env", "/assets/.private"]) {
      const reply = await request(path);
      expect(reply.status).toBe(404);
      security(reply);
      expect(reply.headers.get("cache-control")).toBe("no-store");
      expect(await reply.text()).not.toContain("isolated-spa");
    }
    for (const path of ["/api", "/api/", "/api/a%2Fb?offset=10"]) {
      const reply = await request(path, { headers: { "Accept-Encoding": "gzip" } });
      security(reply);
      expect(reply.headers.get("cache-control")).toBe("no-store");
      expect(reply.headers.get("content-encoding")).toBeNull();
      expect(await reply.json()).toMatchObject({ path, accept_encoding: "" });
    }
    const failedWrite = await request("/api/failed-write", { method: "POST", body: "{}" });
    expect(failedWrite.status).toBe(502);
    security(failedWrite);
    expect(failedWrite.headers.get("cache-control")).toBe("no-store");
    await failedWrite.arrayBuffer();
    expect(await (await request("/api/write-count")).json()).toMatchObject({ writes: 1 });
    const stream = await request("/api/events");
    expect(stream.headers.get("content-encoding")).toBeNull();
    const reader = stream.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("data: first\n\n");
    await (await request("/api/release-event")).arrayBuffer();
    let remaining = "";
    for (let part = await reader.read(); !part.done; part = await reader.read()) remaining += new TextDecoder().decode(part.value);
    expect(remaining).toBe("data: second\n\n");
  } finally {
    // 只处理本次随机命名的容器，即使创建或检查中途失败也清理。
    for (const name of owned.reverse()) spawnSync("docker", ["rm", "--force", name], { stdio: "pipe", timeout: 10000 });
  }
}, 60000);
