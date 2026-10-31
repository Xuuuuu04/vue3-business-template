export type Mode = "light" | "dark";
export type Radius = "sharp" | "soft" | "round";
export type Density = "compact" | "comfortable";
export type SidebarStyle = "dark" | "light" | "brand";

export type Texture = "plain" | "soft" | "dots" | "grain";

export interface Palette {
  id: string;
  name: string;

  character: string;

  neutralHue: number;
  neutralChroma: number;

  brandHue: number;
  brandChroma: number;
  brandLightness: number;

  onPrimary: string;
  mode: Mode;
  sidebar: SidebarStyle;
}

export const palettes: Palette[] = [
  {
    id: "graphite",
    name: "石墨",
    character: "冷静克制，适合开发者工具与数据平台",
    neutralHue: 262,
    neutralChroma: 0.01,
    brandHue: 264,
    brandChroma: 0.18,
    brandLightness: 0.52,
    onPrimary: "oklch(0.99 0 0)",
    mode: "light",
    sidebar: "light",
  },
  {
    id: "sand",
    name: "暖砂",
    character: "温和实在，适合零售、供应链与运营后台",
    neutralHue: 85,
    neutralChroma: 0.014,
    brandHue: 78,
    brandChroma: 0.16,
    brandLightness: 0.77,
    onPrimary: "oklch(0.25 0.04 78)",
    mode: "light",
    sidebar: "dark",
  },
  {
    id: "sea",
    name: "海盐",
    character: "清爽可信，适合医疗、教育与服务型 SaaS",
    neutralHue: 215,
    neutralChroma: 0.01,
    brandHue: 195,
    brandChroma: 0.11,
    brandLightness: 0.5,
    onPrimary: "oklch(0.99 0 0)",
    mode: "light",
    sidebar: "light",
  },
  {
    id: "pine",
    name: "松林",
    character: "稳重沉着，适合财务、合规与企业管理",
    neutralHue: 150,
    neutralChroma: 0.012,
    brandHue: 152,
    brandChroma: 0.13,
    brandLightness: 0.49,
    onPrimary: "oklch(0.99 0 0)",
    mode: "light",
    sidebar: "dark",
  },
  {
    id: "rose",
    name: "绛红",
    character: "有力量感，适合品牌运营与内容、电商平台",
    neutralHue: 20,
    neutralChroma: 0.01,
    brandHue: 18,
    brandChroma: 0.2,
    brandLightness: 0.54,
    onPrimary: "oklch(0.99 0 0)",
    mode: "light",
    sidebar: "light",
  },
  {
    id: "ink",
    name: "墨黑",
    character: "近乎无彩色，适合想让内容自己说话的产品",
    neutralHue: 255,
    neutralChroma: 0.01,
    brandHue: 265,
    brandChroma: 0.04,
    brandLightness: 0.21,
    onPrimary: "oklch(0.99 0 0)",
    mode: "light",
    sidebar: "light",
  },
  {
    id: "night",
    name: "夜航",
    character: "深色界面，适合 AI 应用与长时间监控",
    neutralHue: 275,
    neutralChroma: 0.02,
    brandHue: 285,
    brandChroma: 0.17,
    brandLightness: 0.7,
    onPrimary: "oklch(0.2 0.04 285)",
    mode: "dark",
    sidebar: "dark",
  },
];

export function paletteById(id: string): Palette {
  return palettes.find((p) => p.id === id) ?? palettes[0]!;
}
