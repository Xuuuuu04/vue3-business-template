/** 演示服务按登记的方法和路径找样例；未登记的接口回 404 JSON，样例出错回 500 JSON，不回网页。 */
import { expect, test } from "vitest";
import { answer, matchPath } from "../../tools/demo-api";

const routes = [
  { id: "orders.list", method: "GET", path: "/api/v1/orders", reply: { items: [], total: 0 } },
  {
    id: "orders.info",
    method: "GET",
    path: "/api/v1/orders/:id",
    reply: (_request: Request, params: Record<string, string>) => ({ id: params.id }),
  },
  { id: "orders.delete", method: "DELETE", path: "/api/v1/orders/:id", reply: () => new Response(null, { status: 204 }) },
  { id: "orders.fail", method: "POST", path: "/api/v1/orders", reply: () => { throw new Error("样例写错了"); } },
];
const call = (method: string, path: string) => answer(new Request(`http://localhost${path}`, { method }), routes);

test("路径参数按登记写法取出，段数或固定段不同就不算匹配", () => {
  expect(matchPath("/api/v1/orders/:id", "/api/v1/orders/a%2Fb")).toEqual({ id: "a/b" });
  expect(matchPath("/api/v1/orders/:id", "/api/v1/orders")).toBeUndefined();
  expect(matchPath("/api/v1/orders/:id", "/api/v1/users/1")).toBeUndefined();
});

test("固定值回 200 JSON，函数按请求计算，Response 原样返回", async () => {
  expect(await (await call("GET", "/api/v1/orders?offset=0")).json()).toEqual({ items: [], total: 0 });
  expect(await (await call("GET", "/api/v1/orders/A-1")).json()).toEqual({ id: "A-1" });
  expect((await call("DELETE", "/api/v1/orders/A-1")).status).toBe(204);
});

test("没有样例的接口回 404 JSON，样例出错回 500 JSON，并说清在哪里补", async () => {
  const missing = await call("PATCH", "/api/v1/orders/A-1");
  expect(missing.status).toBe(404);
  expect(missing.headers.get("Content-Type")).toContain("application/json");
  expect((await missing.json()).message).toContain("演示服务没有这个接口");
  const broken = await call("POST", "/api/v1/orders");
  expect(broken.status).toBe(500);
  expect((await broken.json()).message).toContain("orders.fail");
});
