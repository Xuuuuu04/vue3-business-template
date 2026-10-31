import { describe, expect, it } from "vitest";
import {
  currentNavItem,
  containsNavItem,
} from "../../src/shared/ui/lib/navigation";
import { moduleNavigation } from "../../src/app/navigation";
import {
  defineModule,
  type Module,
} from "../../src/shared/modules/definitions";

const page = (id: string, path: string, permission?: string) => ({
  id,
  path,
  permission,
  title: id,
  file: "pages/Page.vue",
  actions: [],
  components: [],
  load: async () => ({ default: {} }),
});
const module: Module = {
  name: "orders",
  title: "订单",
  description: "测试菜单",
  dependsOn: [],
  files: [],
  pages: [
    page("list", "/orders", "read"),
    page("new", "/orders/new", "write"),
    page("detail", "/orders/:id", "read"),
  ],
  navigation: [
    {
      label: "订单处理",
      children: [
        { label: "列表", page: "list" },
        { label: "新建", page: "new" },
      ],
    },
  ],
  load: async () => ({ actions: [], endpoints: [] }),
};

describe("多级导航", () => {
  it("模块只有一个同名公开入口时直接显示入口，避免重复目录与旧样板入口", () => {
    const single: Module = {
      ...module,
      title: "总额计算",
      pages: [page("main", "/calculation"), page("form", "/calculation/form")],
      navigation: [{ label: "总额计算", page: "form" }],
    };
    const nav = moduleNavigation(single, () => true)!;
    expect(nav.label).toBe("总额计算");
    expect(nav.to).toBe("/calculation/form");
    expect(nav.children).toEqual([]);
    expect(currentNavItem([nav], "/calculation/form")).toBe(nav);
  });
  it("深层页只选中最具体的子项，保留全部祖先目录", () => {
    const nav = moduleNavigation(module, () => true)!;
    const current = currentNavItem([nav], "/orders/new");
    expect(current?.label).toBe("新建");
    expect(containsNavItem(nav, current)).toBe(true);
    expect(containsNavItem(nav.children![0]!, current)).toBe(true);
    expect(currentNavItem([nav], "/orders-other")).toBeUndefined();
  });
  it("同地址的父入口和子页只选择子页", () => {
    const nav = moduleNavigation(module, () => true)!;
    expect(currentNavItem([nav], "/orders")?.label).toBe("列表");
  });
  it("没有写入权限时隐藏新建；没有任何页面权限时隐藏整个模块", () => {
    const nav = moduleNavigation(module, (p) => p === "read")!;
    expect(nav.children![0]!.children!.map((i) => i.label)).toEqual(["列表"]);
    expect(moduleNavigation(module, () => false)).toBeUndefined();
  });
  it("禁止未登记页面、参数详情页和空目录进入菜单", () => {
    for (const item of [
      { label: "未知", page: "missing" },
      { label: "详情", page: "detail" },
      { label: "空目录" },
    ])
      expect(() => defineModule({ ...module, navigation: [item] })).toThrow();
  });
});
