import type { DataColumn } from "@/shared/ui/public";

export type CustomerStatus = "active" | "prospect" | "paused";
export type Industry =
  "technology" | "retail" | "design" | "manufacturing" | "services";
export interface Customer {
  id: string;
  company: string;
  contact: string;
  phone: string;
  industry: Industry;
  city: string;
  status: CustomerStatus;
  owner: string;
  created: string;
  updated: string;
}
type CustomerSeed = [
  string,
  string,
  string,
  Industry,
  string,
  CustomerStatus,
  string,
  string,
];
const seeds: CustomerSeed[] = [
  [
    "云杉数字科技",
    "顾思远",
    "13800000001",
    "technology",
    "杭州",
    "active",
    "林晓",
    "2026-10-07",
  ],
  [
    "星河零售集团",
    "许知夏",
    "13800000002",
    "retail",
    "上海",
    "active",
    "周宁",
    "2026-10-07",
  ],
  [
    "江南设计事务所",
    "沈亦舟",
    "13800000003",
    "design",
    "苏州",
    "prospect",
    "林晓",
    "2026-10-06",
  ],
  [
    "远望工业设备",
    "何嘉树",
    "13800000004",
    "manufacturing",
    "宁波",
    "active",
    "陈可",
    "2026-10-06",
  ],
  [
    "青禾生活用品",
    "陆清和",
    "13800000005",
    "retail",
    "成都",
    "prospect",
    "周宁",
    "2026-10-06",
  ],
  [
    "启明企业服务",
    "梁以安",
    "13800000006",
    "services",
    "北京",
    "active",
    "陈可",
    "2026-10-05",
  ],
  [
    "见山建筑设计",
    "林若溪",
    "13800000007",
    "design",
    "深圳",
    "active",
    "林晓",
    "2026-10-05",
  ],
  [
    "万里精密制造",
    "程星野",
    "13800000008",
    "manufacturing",
    "东莞",
    "paused",
    "周宁",
    "2026-10-04",
  ],
  [
    "松果软件工作室",
    "赵语桐",
    "13800000009",
    "technology",
    "武汉",
    "prospect",
    "林晓",
    "2026-10-04",
  ],
  [
    "北辰供应链管理",
    "宋知行",
    "13800000010",
    "services",
    "天津",
    "active",
    "陈可",
    "2026-10-03",
  ],
  [
    "白鹭文创商店",
    "唐予安",
    "13800000011",
    "retail",
    "厦门",
    "active",
    "周宁",
    "2026-10-03",
  ],
  [
    "海川智能科技",
    "叶书言",
    "13800000012",
    "technology",
    "南京",
    "prospect",
    "陈可",
    "2026-10-02",
  ],
  [
    "拾光品牌设计",
    "徐南乔",
    "13800000013",
    "design",
    "广州",
    "active",
    "林晓",
    "2026-10-02",
  ],
  [
    "山海商业管理",
    "韩景初",
    "13800000014",
    "services",
    "重庆",
    "paused",
    "周宁",
    "2026-10-01",
  ],
  [
    "瑞泽医疗设备",
    "方遇之",
    "13800000015",
    "manufacturing",
    "合肥",
    "active",
    "陈可",
    "2026-09-30",
  ],
  [
    "梧桐城市服务",
    "吴初晴",
    "13800000016",
    "services",
    "长沙",
    "prospect",
    "林晓",
    "2026-09-30",
  ],
  [
    "新叶连锁书店",
    "朱子墨",
    "13800000017",
    "retail",
    "济南",
    "active",
    "周宁",
    "2026-09-29",
  ],
  [
    "观澜空间设计",
    "郑雨辰",
    "13800000018",
    "design",
    "佛山",
    "prospect",
    "陈可",
    "2026-09-29",
  ],
  [
    "安拓自动化技术",
    "邓一川",
    "13800000019",
    "manufacturing",
    "无锡",
    "active",
    "林晓",
    "2026-09-28",
  ],
  [
    "墨泉数据服务",
    "彭星澄",
    "13800000020",
    "technology",
    "西安",
    "paused",
    "周宁",
    "2026-09-27",
  ],
];
export const statuses = [
  { value: "", label: "全部状态" },
  { value: "active", label: "合作中" },
  { value: "prospect", label: "洽谈中" },
  { value: "paused", label: "暂停合作" },
];
export const industries = [
  { value: "technology", label: "信息技术" },
  { value: "retail", label: "零售消费" },
  { value: "design", label: "设计创意" },
  { value: "manufacturing", label: "工业制造" },
  { value: "services", label: "企业服务" },
];
export const statusLabel = (status: CustomerStatus) =>
  statuses.find((item) => item.value === status)!.label;
export const statusTone = (status: CustomerStatus) =>
  (({ active: "ok", prospect: "info", paused: "neutral" }) as const)[status];
export const industryLabel = (industry: Industry) =>
  industries.find((item) => item.value === industry)!.label;
export const columns: DataColumn[] = [
  { key: "company", title: "客户名称", minWidth: 240, sortable: true },
  { key: "contact", title: "联系人", width: 150 },
  { key: "industry", title: "行业", width: 116 },
  { key: "city", title: "城市", width: 80 },
  { key: "status", title: "合作状态", width: 116 },
  { key: "owner", title: "负责人", width: 90 },
  { key: "updated", title: "最近更新", width: 132, sortable: true },
];

export function createCustomers(): Customer[] {
  return seeds.map(
    (
      [company, contact, phone, industry, city, status, owner, updated],
      index,
    ) => ({
      id: `KH-${String(1001 + index)}`,
      company,
      contact,
      phone,
      industry,
      city,
      status,
      owner,
      created: "2026-07-16",
      updated,
    }),
  );
}
