import type { DataColumn } from "@/shared/ui/public";

export interface Item {
  id: string;
  name: string;
  store: string;
  sku: string;
  orig: number;
  act: number;
  rate: number;
  chg: number;
  kind: string;
}
export const rows: Item[] = [
  ["矿泉水 550ml", "南岸门店", "AX100245", 2.0, 0.99, 37.4, 1.9, "报名价"],
  ["红烧牛肉面 桶装", "渝中门店", "AX100482", 5.5, 3.2, -7.8, -3.2, "活动价"],
  ["纯牛奶 250ml", "沙坪坝门店", "AX100628", 4.0, 2.25, 16.4, 5.1, "报名价"],
  ["薯片 原味 70g", "南岸门店", "AX100774", 6.5, 4.05, 28.4, 0.6, "活动价"],
  ["夹心饼干 97g", "渝中门店", "AX100801", 7.8, 5.2, 30.8, -1.4, "活动价"],
].map(
  (r, i) =>
    ({
      id: String(i),
      name: r[0],
      store: r[1],
      sku: r[2],
      orig: r[3],
      act: r[4],
      rate: r[5],
      chg: r[6],
      kind: r[7],
    }) as Item,
);
export const columns: DataColumn[] = [
  { key: "name", title: "商品 / 门店", sticky: "left", width: 240 },
  {
    key: "orig",
    title: "原价",
    unit: "元",
    kind: "number",
    sortable: true,
    width: 100,
    format: (v) => (v as number).toFixed(2),
  },
  {
    key: "act",
    title: "活动价",
    unit: "元",
    kind: "number",
    sortable: true,
    width: 120,
  },
  {
    key: "rate",
    title: "毛利率",
    unit: "%",
    kind: "number",
    sortable: true,
    width: 110,
    format: (v) => (v as number).toFixed(1),
  },
  {
    key: "chg",
    title: "较昨日",
    unit: "%",
    kind: "delta",
    sortable: true,
    width: 100,
  },
  {
    key: "actions",
    title: "操作",
    align: "right",
    sticky: "right",
    width: 130,
  },
];
export const kinds = [
  { value: "", label: "全部价型" },
  { value: "活动价", label: "活动价" },
  { value: "报名价", label: "报名价" },
];

export const days = Array.from({ length: 30 }, (_, i) => `${i + 1} 日`);
const a = Array.from({ length: 30 }, (_, i) =>
  Math.round(
    52000 + Math.sin(i / 3.5) * 11000 + i * 700 + ((i * 13) % 7) * 800,
  ),
);
export const series = [
  { name: "本月", values: a },
  {
    name: "上月同期",
    values: a.map((v, i) => Math.round(v * 0.9 + Math.cos(i / 4) * 2000)),
    dashed: true,
  },
];

export function createActivity() {
  return [
    {
      id: "1",
      actor: "林知远",
      action: "上传了",
      target: "2026 第三季度经营报告.pdf",
      time: new Date(Date.now() - 2 * 3600e3).toISOString(),
    },
    {
      id: "2",
      actor: "周晓",
      action: "评论了",
      target: "采购计划-十月.csv",
      time: new Date(Date.now() - 5 * 3600e3).toISOString(),
      note: "矿泉水的数量再核一下，上周到货偏多。",
    },
    {
      id: "3",
      actor: "陈一鸣",
      action: "下载了",
      target: "年度预算草案.pdf",
      time: new Date(Date.now() - 26 * 3600e3).toISOString(),
    },
    {
      id: "4",
      actor: "何静",
      action: "删除了",
      target: "旧版门店照片.zip",
      time: new Date(Date.now() - 50 * 3600e3).toISOString(),
    },
  ];
}
