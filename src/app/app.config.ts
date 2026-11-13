import type { ThemeSettings } from "@/shared/ui/public";
import pkg from "../../package.json";

export const appConfig = {
  name: "木木工作台",

  mark: "木",

  logo: undefined as string | undefined,

  tagline: "团队文件，清楚有序。",
  highlights: [
    { title: "集中管理", text: "文档、表格和图片，在同一个列表里查找。" },
    { title: "保留原件", text: "下载原文件，继续用熟悉的软件处理。" },
    { title: "按权限操作", text: "上传、查看和删除由组织权限决定。" },
  ],

  company: "示例科技有限公司",

  icp: "",

  support: { email: "support@example.com", helpUrl: "" as string },

  legal: { reviewed: false },

  theme: {
    palette: "graphite",
    mode: "light",
    sidebar: "light",
    density: "comfortable",
    texture: "plain",
  } as Partial<ThemeSettings>,
  version: pkg.version as string,
};
