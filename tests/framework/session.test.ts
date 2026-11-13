import { afterEach, expect, test, vi } from "vitest";
import { permissionAllowed, useSession } from "@/shared/session/session";
import { sendRequest } from "@/shared/http/client";
import { z } from "zod";

vi.mock("@/app/login.config", async () => {
  const { z } = await import("zod");
  return {
    loginConfig: {
      path: "/api/v1/access/login",
      orgCode: true,
      body: (form: Record<string, string>) => form,
      reply: z
        .object({
          access_token: z.string().min(1),
          token_type: z.string().regex(/^bearer$/i),
          expires_in: z.number().int().positive(),
          org_id: z.string().min(1),
        })
        .transform(({ access_token, expires_in, org_id }) => ({
          access_token,
          expires_in,
          org_id,
        })),
    },
  };
});

const input = {
  org_code: "synthetic",
  username: "tester",
  password: "synthetic-only",
  otp_code: "",
};
const token = `h.${btoa(JSON.stringify({ permissions: ["orders.read"] }))}.s`;
const response = () =>
  Response.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: 60,
    org_id: "synthetic",
  });

test.each([
  ["public", false, [], true],
  ["signed_in", false, [], false],
  ["signed_in", true, [], true],
  ["orders.write", true, ["*"], true],
  ["orders.read", true, ["orders.*"], true],
  ["files.read", true, ["orders.*"], false],
  ["orders.write", true, ["orders.read"], false],
  ["orders.write", false, ["*"], false],
] as const)(
  "权限提示遵循后端规则：%s %s %j",
  (permission, signedIn, permissions, expected) => {
    expect(permissionAllowed(permission, signedIn, permissions)).toBe(expected);
  },
);

test("两次登录反序完成时，旧结果不能覆盖新的账号与令牌", async () => {
  const releases = new Map<string, (reply: Response) => void>();
  let ready!: () => void;
  const started = new Promise<void>((resolve) => {
    ready = resolve;
  });
  vi.stubGlobal("fetch", (_url: string, options: RequestInit) => {
    const username = (
      JSON.parse(options.body as string) as { username: string }
    ).username;
    return new Promise<Response>((resolve) => {
      releases.set(username, resolve);
      if (releases.size === 2) ready();
    });
  });
  const old = useSession().login({ ...input, username: "old" });
  const latest = useSession().login({ ...input, username: "latest" });
  await started;
  releases.get("latest")!(
    Response.json({
      access_token: token,
      token_type: "bearer",
      expires_in: 60,
      org_id: "latest-org",
    }),
  );
  await latest;
  releases.get("old")!(
    Response.json({
      access_token: "old-token",
      token_type: "bearer",
      expires_in: 60,
      org_id: "old-org",
    }),
  );
  await expect(old).rejects.toMatchObject({ code: "login_cancelled" });
  expect(useSession().state.value.username).toBe("latest");
  expect(useSession().state.value.org).toBe("latest-org");
});
afterEach(() => {
  useSession().logoutLocal();
  vi.unstubAllGlobals();
});

test("登录只要求实际使用的四个响应字段，额外用户与刷新字段可以省略", async () => {
  vi.stubGlobal("fetch", async () => response());
  await useSession().login(input);
  expect(useSession().state.value.signedIn).toBe(true);
  expect(useSession().state.value.permissions).toEqual(["orders.read"]);
  expect(useSession().state.value.org).toBe("synthetic");
});

test("令牌载荷包含无填充 Base64URL 和中文字符时也能正常解析权限", async () => {
  const utf8Payload = Buffer.from(
    JSON.stringify({
      display_name: "林晓",
      permissions: ["orders.read", "files.write"],
    }),
    "utf8",
  ).toString("base64url");
  vi.stubGlobal("fetch", async () =>
    Response.json({
      access_token: `h.${utf8Payload}.s`,
      token_type: "bearer",
      expires_in: 60,
      org_id: "synthetic",
    }),
  );
  await useSession().login(input);
  expect(useSession().state.value.signedIn).toBe(true);
  expect(useSession().state.value.permissions).toEqual([
    "orders.read",
    "files.write",
  ]);
});

test("退出会话后，较晚的登录回复不能重新保存令牌", async () => {
  let release!: (reply: Response) => void;
  const started = new Promise<void>((resolve) => {
    vi.stubGlobal("fetch", () => {
      resolve();
      return new Promise<Response>((done) => {
        release = done;
      });
    });
  });
  const pending = useSession().login(input);
  await started;
  useSession().logoutLocal();
  release(response());
  await expect(pending).rejects.toMatchObject({ code: "login_cancelled" });
  expect(useSession().state.value.signedIn).toBe(false);
  let authorization: string | undefined;
  await sendRequest(
    {
      id: "probe.read",
      title: "读取",
      path: "/api/probe",
      method: "GET",
      response: z.null(),
    },
    {},
    new AbortController().signal,
    { endpoint: "probe.read", method: "GET", outcome: "running", elapsed: 0 },
    async (_url, init) => {
      authorization = (init?.headers as Record<string, string>).Authorization;
      return new Response(null, { status: 204 });
    },
  );
  expect(authorization).toBeUndefined();
});

test.each([0, -1, 1.5])(
  "无效的 expires_in=%s 不能建立会话",
  async (expires_in) => {
    vi.stubGlobal("fetch", async () =>
      Response.json({
        access_token: token,
        token_type: "bearer",
        expires_in,
        org_id: "synthetic",
      }),
    );
    await expect(useSession().login(input)).rejects.toThrow();
    expect(useSession().state.value.signedIn).toBe(false);
  },
);

test("登录约定来自产品文件：可以关掉组织代码、换路径、改请求字段和回包整理", async () => {
  vi.resetModules();
  vi.doMock("@/app/login.config", async () => {
    const { z } = await import("zod");
    return {
      loginConfig: {
        path: "/api/auth/token",
        orgCode: false,
        body: (form: { username: string; password: string }) => ({
          user: form.username,
          pass: form.password,
        }),
        reply: z
          .object({ token: z.string(), ttl: z.number() })
          .transform(({ token: access_token, ttl }) => ({
            access_token,
            expires_in: ttl,
            org_id: "",
          })),
      },
    };
  });
  let sent: unknown;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    sent = { url, body: JSON.parse(init.body as string) };
    return Response.json({ token, ttl: 60 });
  });
  const fresh = await import("@/shared/session/session");
  await fresh
    .useSession()
    .login({ org_code: "", username: "u", password: "p", otp_code: "" });
  expect(sent).toEqual({
    url: "/api/auth/token",
    body: { user: "u", pass: "p" },
  });
  expect(fresh.useSession().state.value.signedIn).toBe(true);
  expect(fresh.useSession().state.value.permissions).toEqual(["orders.read"]);
  fresh.useSession().logoutLocal();
  vi.doUnmock("@/app/login.config");
});

test("登录令牌权限声明格式异常时返回 response_invalid 且保持未登录", async () => {
  const malformedToken = `h.${btoa(JSON.stringify({ permissions: "orders.read" }))}.s`;
  vi.stubGlobal("fetch", async () =>
    Response.json({
      access_token: malformedToken,
      token_type: "Bearer",
      expires_in: 60,
      org_id: "synthetic",
    }),
  );
  await expect(useSession().login(input)).rejects.toMatchObject({
    code: "response_invalid",
  });
  expect(useSession().state.value.signedIn).toBe(false);
});
