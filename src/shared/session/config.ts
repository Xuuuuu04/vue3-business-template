/** 登录约定的形状：产品在 src/app/login.config.ts 里填写，框架只负责调用、校验回包和保存会话。 */
import type { z } from "zod";
/** 登录页收集的内容；不用组织代码时 org_code 为空字符串。 */
export interface LoginForm {
  org_code: string;
  username: string;
  password: string;
  otp_code: string;
}
/** 回包整理后框架实际使用的三项。 */
export interface LoginReply {
  access_token: string;
  expires_in: number;
  org_id: string;
}
export interface LoginConfig {
  /** 登录接口路径，固定用 POST。 */
  path: string;
  /** 是否填写组织代码；关掉后登录页不显示这一栏。 */
  orgCode: boolean;
  /** 把登录表单变成请求体。 */
  body: (form: LoginForm) => Record<string, unknown>;
  /** 校验回包，并整理成 access_token、expires_in、org_id。 */
  reply: z.ZodType<LoginReply>;
}
