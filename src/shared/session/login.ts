import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import type { Endpoint, StepTools } from "@/shared/http/client";
import { loginConfig } from "@/app/login.config";
import type { LoginForm, LoginReply } from "./config";
const Input = z
  .object({
    org_code: loginConfig.orgCode ? z.string().min(1) : z.string(),
    username: z.string().min(1),
    password: z.string().min(1),
    otp_code: z.string(),
  })
  .strict();

const Session: z.ZodType<LoginReply> = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  org_id: z.string(),
});
type Work = LoginForm & { result: LoginReply };
async function signIn(data: Work, tools: StepTools) {
  data.result = await tools.request("session.login", {
    body: loginConfig.body({
      org_code: loginConfig.orgCode ? data.org_code : "",
      username: data.username,
      password: data.password,
      otp_code: data.otp_code,
    }),
  });
}
const sessionEndpoints: Endpoint[] = [
  {
    id: "session.login",
    title: "登录",
    method: "POST",
    path: loginConfig.path,
    response: loginConfig.reply,
  },
];
const loginAction = defineAction<LoginForm, LoginReply>({
  id: "session.login",
  title: "登录账号",
  input: Input,
  inputFields: ["org_code", "username", "password", "otp_code"],
  result: "result",
  fields: {
    org_code: { title: "组织代码", schema: z.string() },
    username: { title: "账号", schema: z.string(), secret: true },
    password: { title: "登录密码", schema: z.string(), secret: true },
    otp_code: { title: "两步验证码", schema: z.string(), secret: true },
    result: { title: "登录会话", schema: Session, secret: true },
  },
  steps: [
    defineStep<Work>({
      id: "session.sign_in",
      title: "验证账号并取得会话",
      rule: "S-01",
      reads: ["org_code", "username", "password", "otp_code"],
      writes: ["result"],
      uses: ["session.login"],
      run: signIn,
    }),
  ],
});

export type LoginInput = LoginForm;

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1];
  if (!segment) return {};
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch (error) {
    console.warn("无法解析登录令牌中的权限声明。", error);
    return {};
  }
}

export async function requestLogin(input: LoginInput) {
  const reply = await execute(
    loginAction,
    input,
    sessionEndpoints,
    new AbortController().signal,
  );
  const claims = decodeJwtPayload(reply.access_token);
  const permissions = z.array(z.string()).parse(claims.permissions || []);
  return { reply, permissions };
}
