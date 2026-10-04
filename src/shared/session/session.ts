/** 登录令牌只放内存。页面权限用于提示，后台仍然决定访问是否允许。 */
import { readonly, shallowRef } from "vue";
import { z } from "zod";
import { defineAction, defineStep } from "@/shared/actions/definitions";
import { execute } from "@/shared/actions/runtime";
import {
  setAccessToken,
  type Endpoint,
  type StepTools,
} from "@/shared/http/client";
const Reply = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
  user_id: z.number(),
  org_id: z.string(),
});
const Input = z
  .object({
    org_code: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
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
export const sessionEndpoints: Endpoint[] = [
  {
    id: "session.login",
    title: "登录",
    method: "POST",
    path: "/api/v1/access/login",
    response: Reply,
  },
];
export const loginAction = defineAction<
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
const state = shallowRef({
  signedIn: false,
  org: import.meta.env?.VITE_ORG_ID || "demo-team",
  username: "",
  permissions: [] as string[],
});
const demo = import.meta.env?.VITE_API_MODE !== "real";
let expiration: ReturnType<typeof setTimeout> | undefined;
/** UI 权限仅来自收到的令牌内容；不把解码当作签名验证。 */
export async function login(input: z.infer<typeof Input>) {
  const reply = await execute(
    loginAction,
    input,
    sessionEndpoints,
    new AbortController().signal,
  );
  const payload = reply.access_token.split(".")[1];
  const claims = payload
    ? (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
        permissions?: unknown;
      })
    : {};
  const permissions = z.array(z.string()).parse(claims.permissions || []);
  setAccessToken(reply.access_token);
  state.value = {
    signedIn: true,
    org: reply.org_id,
    username: input.username,
    permissions,
  };
  clearTimeout(expiration);
  expiration = setTimeout(
    logoutLocal,
    Math.min(reply.expires_in * 1000, 2_147_483_647),
  );
}
/** 清除本机访问凭据。后台刷新令牌未保存，也不会自动刷新或重试写入。 */
export function logoutLocal() {
  clearTimeout(expiration);
  setAccessToken("");
  state.value = {
    ...state.value,
    signedIn: false,
    username: "",
    permissions: [],
  };
}
export function useSession() {
  return {
    state: readonly(state),
    demo,
    login,
    logoutLocal,
    can: (permission: string) =>
      demo ||
      (state.value.signedIn && state.value.permissions.includes(permission)),
  };
}
