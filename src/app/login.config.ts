/**
 * 登录接口约定，产品按自己的后台改这里；这个文件不受 framework.lock 保护，改了不用 --accept。
 * 默认值与后端模板的账号包一致：POST /api/v1/access/login，请求 org_code、username、password、otp_code，
 * 回包至少有非空 access_token、Bearer token_type、正整数 expires_in 和非空 org_id。
 */
import { z } from "zod";
import type { LoginConfig } from "@/shared/session/config";

export const loginConfig: LoginConfig = {
  path: "/api/v1/access/login",
  // 后台不分组织时改成 false：登录页不显示组织代码，请求也不带 org_code；回包没有 org_id 时在 reply 里补上。
  orgCode: true,
  body: (form) => ({
    ...(form.org_code ? { org_code: form.org_code } : {}),
    username: form.username,
    password: form.password,
    otp_code: form.otp_code,
  }),
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
};
