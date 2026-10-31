import type { z } from "zod";

export interface LoginForm {
  org_code: string;
  username: string;
  password: string;
  otp_code: string;
}

export interface LoginReply {
  access_token: string;
  expires_in: number;
  org_id: string;
}
export interface LoginConfig {
  path: string;

  orgCode: boolean;

  body: (form: LoginForm) => Record<string, unknown>;

  reply: z.ZodType<LoginReply>;
}
