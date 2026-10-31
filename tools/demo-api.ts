import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import vue from "@vitejs/plugin-vue";
import type { DemoData } from "../src/shared/http/demo";

interface Route {
  id: string;
  method: string;
  path: string;
  reply: DemoData[string];
}
type Load = (path: string) => Promise<Record<string, unknown>>;
const BODY_LIMIT = 16 * 1024 * 1024;

export function matchPath(pattern: string, path: string) {
  const want = pattern.split("/");
  const have = path.split("/");
  if (want.length !== have.length) return undefined;
  const params: Record<string, string> = {};
  for (const [index, part] of want.entries()) {
    const actual = have[index]!;
    if (part.startsWith(":")) {
      if (!actual) return undefined;
      params[part.slice(1)] = decodeURIComponent(actual);
    } else if (part !== actual) return undefined;
  }
  return params;
}

async function routesOf(load: Load): Promise<Route[]> {
  const { modules } = (await load("/src/app/catalog.ts")) as {
    modules: { name: string }[];
  };
  const routes: Route[] = [];
  for (const { name } of modules) {
    if (!existsSync(resolve(`src/modules/${name}/demo.ts`))) continue;
    const [{ endpoints }, { default: demo }] = (await Promise.all([
      load(`/src/modules/${name}/api.ts`),
      load(`/src/modules/${name}/demo.ts`),
    ])) as [
      { endpoints: { id: string; method: string; path: string }[] },
      { default: DemoData },
    ];
    for (const endpoint of endpoints)
      if (Object.hasOwn(demo, endpoint.id))
        routes.push({ ...endpoint, reply: demo[endpoint.id]! });
  }
  return routes;
}

export async function answer(request: Request, routes: Route[]) {
  const { pathname } = new URL(request.url);
  for (const route of routes) {
    const params =
      route.method === request.method && matchPath(route.path, pathname);
    if (!params) continue;
    try {
      const value =
        typeof route.reply === "function"
          ? await route.reply(request, params)
          : route.reply;
      return value instanceof Response ? value : Response.json(value);
    } catch (error) {
      return Response.json(
        {
          code: "demo_failed",
          message: `演示数据 ${route.id} 出错：${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      );
    }
  }
  return Response.json(
    {
      code: "demo_missing",
      message: `演示服务没有这个接口：${request.method} ${pathname}。在对应业务包的 demo.ts 里按接口编号补上样例。`,
    },
    { status: 404 },
  );
}

async function toRequest(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  if (req.method !== "GET" && req.method !== "HEAD")
    for await (const part of req as AsyncIterable<Buffer>) {
      size += part.length;
      if (size > BODY_LIMIT) return undefined;
      chunks.push(part);
    }
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers))
    if (typeof value === "string") headers.set(name, value);
  return new Request(new URL(req.url!, "http://localhost"), {
    method: req.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

function middleware(load: Load) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/api/")) return next();
    void (async () => {
      const request = await toRequest(req);
      const reply = request
        ? await answer(request, await routesOf(load))
        : Response.json(
            { code: "demo_too_large", message: "请求内容过大" },
            { status: 413 },
          );
      res.statusCode = reply.status;
      reply.headers.forEach((value, name) => res.setHeader(name, value));
      res.setHeader(
        "X-Request-ID",
        String(req.headers["x-request-id"] ?? randomUUID()),
      );
      res.setHeader("X-Demo-Mode", "true");
      res.end(Buffer.from(await reply.arrayBuffer()));
    })().catch((error: unknown) => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          code: "demo_failed",
          message: `演示服务出错：${String(error)}`,
        }),
      );
    });
  };
}

export function demoApi(): Plugin {
  return {
    name: "explicit-demo-api",
    configureServer(server) {
      server.middlewares.use(middleware((path) => server.ssrLoadModule(path)));
    },

    configurePreviewServer(server) {
      let loader: Promise<ViteDevServer> | undefined;
      server.middlewares.use(
        middleware(async (path) => {
          loader ??= createServer({
            configFile: false,
            appType: "custom",
            logLevel: "error",
            plugins: [vue()],
            resolve: { alias: { "@": resolve("src") } },
            optimizeDeps: { noDiscovery: true },
            server: {
              middlewareMode: true,
              hmr: false,
              ws: false,
              watch: null,
            },
          });
          return (await loader).ssrLoadModule(path);
        }),
      );
    },
  };
}
