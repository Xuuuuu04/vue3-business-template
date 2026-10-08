/**
 * 产品的品牌、法律信息与外观：换产品时先改这一个文件。
 * 更新框架时本文件不会被覆盖。
 */
import type { ThemeSettings } from "@/shared/ui/public";
import pkg from "../../package.json";

export const appConfig = {
  /** 左上角、浏览器标签页、登录页和页脚显示的产品名称。 */
  name: "木木工作台",
  /** 没有图片 logo 时，logo 方块里显示的一个字。 */
  mark: "木",
  /** 图片 logo 的地址（放在 public/ 下，如 "/logo.svg"）；填了就替代上面的字。 */
  logo: undefined as string | undefined,
  /** 登录页左侧品牌面板的标语与三条产品亮点。 */
  tagline: "团队文件，清楚有序。",
  highlights: [
    { title: "集中管理", text: "文档、表格和图片，在同一个列表里查找。" },
    { title: "保留原件", text: "下载原文件，继续用熟悉的软件处理。" },
    { title: "按权限操作", text: "上传、查看和删除由组织权限决定。" },
  ],
  /** 出现在页脚、协议与关于里的公司信息。 */
  company: "示例科技有限公司",
  /** 网站备案号，如 "渝ICP备00000000号-1"；没有就留空。 */
  icp: "",
  /** 帮助与联系方式：忘记密码、遇到问题时给用户看。 */
  support: { email: "support@example.com", helpUrl: "" as string },
  /** 法律页面。reviewed 改为 true 之前，协议页面顶部会显示“模板文本，需法务审核”的提醒。 */
  legal: { reviewed: false },
  /** 产品默认主题。用户在界面里改过之后以用户的选择为准。 */
  theme: { palette: "graphite", mode: "light", sidebar: "light", density: "comfortable", texture: "dots" } as Partial<ThemeSettings>,
  version: pkg.version as string,
};
