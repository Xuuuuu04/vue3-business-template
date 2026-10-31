import { z } from "zod";
import type { LoginConfig } from "@/shared/session/config";

export const loginConfig: LoginConfig = {
  path: "/api/v1/access/login",

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
