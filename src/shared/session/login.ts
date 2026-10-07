/** 登录声明只在提交登录时加载，页面启动只读取轻量会话状态。 */
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import type { Endpoint, StepTools } from "@/shared/http/client";
const Reply = z.object({
  access_token: z.string().min(1),
  token_type: z.string().regex(/^bearer$/i),
  expires_in: z.number().int().positive(),
  org_id: z.string().min(1),
});
const Input = z
  .object({
    org_code: z.string().min(1, "请填写组织代码"),
    username: z.string().min(1, "请填写账号"),
    password: z.string().min(1, "请填写密码"),
    otp_code: z.string(),
  })
  .strict();
type Work = z.infer<typeof Input> & { result: z.infer<typeof Reply> };
async function signIn(data: Work, tools: StepTools) {
  data.result = await tools.request("session.login", {
    body: {
      org_code: data.org_code,
      username: data.username,
      password: data.password,
      otp_code: data.otp_code,
    },
  });
}
const sessionEndpoints: Endpoint[] = [
  {
    id: "session.login",
    title: "登录",
    method: "POST",
    path: "/api/v1/access/login",
    response: Reply,
  },
];
const loginAction = defineAction<
  z.infer<typeof Input>,
  z.infer<typeof Reply>
>({
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
    result: { title: "登录会话", schema: Reply, secret: true },
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

export type LoginInput = z.infer<typeof Input>;
/** 响应与权限由运行时校验，不能把令牌解码当作签名验证。 */
export async function requestLogin(input: LoginInput) {
  const reply = await execute(loginAction, input, sessionEndpoints, new AbortController().signal);
  const payload = reply.access_token.split(".")[1];
  const claims = payload
    ? (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { permissions?: unknown })
    : {};
  const permissions = z.array(z.string()).parse(claims.permissions || []);
  return { reply, permissions };
}
