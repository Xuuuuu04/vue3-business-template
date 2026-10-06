/**
 * 产品的品牌与外观设置：换产品时先改这一个文件。
 * 更新框架时本文件不会被覆盖。
 */
import type { ThemeSettings } from "@/shared/ui/public";

export const appConfig = {
  /** 左上角、浏览器标签页和登录页显示的产品名称。 */
  name: "木木工作台",
  /** 没有图片 logo 时，logo 方块里显示的一个字。 */
  mark: "木",
  /** 图片 logo 的地址（放在 public/ 下，如 "/logo.svg"）；填了就替代上面的字。 */
  logo: undefined as string | undefined,
  /** 登录页左侧的一句话。 */
  tagline: "打开就能做事，每一步都看得见结果。",
  /** 产品默认主题。用户在界面里改过之后以用户的选择为准。 */
  theme: { palette: "graphite", sidebar: "light" } as Partial<ThemeSettings>,
};
