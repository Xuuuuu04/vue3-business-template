import { describe, expect, it } from "vitest";
import { baseParse } from "@vue/compiler-dom";
import { inspectPageLayout } from "../../tools/page-layout";
import type { Page } from "../../src/shared/modules/definitions";
const page: Page = {
  id: "files",
  title: "文件",
  task: "查找文件",
  path: "/files",
  file: "pages/Main.vue",
  actions: [],
  components: [],
  load: async () => ({ default: {} }),
};
const check = (markup: string, script = "") =>
  inspectPageLayout(baseParse(markup), [script], page).join(" ");
describe("业务页的单一任务结构", () => {
  it("总览用 OverviewBoard 放 2–6 个面板，第一个是唯一的 focus 面板", () => {
    const board = (panels: string) => check(`<PageFrame workspace title="总览"><OverviewBoard>${panels}</OverviewBoard></PageFrame>`);
    expect(board('<Panel title="趋势" focus /><Panel title="待处理" />')).toBe("");
    expect(board('<Panel title="趋势" focus />')).toContain("2–6 个 Panel");
    expect(board('<Panel title="趋势" /><Panel title="待处理" />')).toContain("只能有一个 focus");
    expect(board('<Panel title="待处理" /><Panel title="趋势" focus />')).toContain("放在 OverviewBoard 第一个");
    expect(board('<Panel title="趋势" focus /><WorkArea />')).toContain("只能直接放 Panel");
    expect(check('<PageFrame workspace><WorkArea><Panel title="零散" /></WorkArea></PageFrame>')).toContain("Panel 只能作为 OverviewBoard 的直接子项");
  });
  it("筛选条一行最多 3 个条件，其余放更多筛选", () => {
    const page = (bar: string) => check(`<PageFrame workspace><template #filters>${bar}</template><DataTable fill flat /></PageFrame>`);
    expect(page("<FilterBar><UiSelect /><UiSelect /><UiSearchInput /></FilterBar>")).toBe("");
    expect(page("<FilterBar><UiSelect /><UiSelect /><UiSelect /><UiDatePicker /></FilterBar>")).toContain("最多放 3 个");
    expect(page("<FilterBar><UiSelect /><template #more><Field><UiSelect /></Field><Field><UiDatePicker /></Field></template></FilterBar>")).toBe("");
  });
  it("业务页不能直接写原生表单控件", () => {
    expect(check('<PageFrame workspace><WorkArea><input type="date" /></WorkArea></PageFrame>')).toContain("UiDatePicker");
    expect(check('<PageFrame workspace><WorkArea><select /></WorkArea></PageFrame>')).toContain("UiSelect");
    expect(check('<PageFrame workspace><WorkArea><button>保存</button></WorkArea></PageFrame>')).toContain("UiButton");
  });
  it("总览面板只放一个展示组件，筛选在页面层，标题固定且不重复", () => {
    const board = (panels: string, extra = "") => check(`<PageFrame workspace title="总览">${extra}<OverviewBoard>${panels}</OverviewBoard></PageFrame>`);
    expect(board('<Panel title="趋势" focus><LineChart /></Panel><Panel title="待处理" flush><ActionList /></Panel>', '<template #filters><FilterBar><UiSelect /></FilterBar></template>')).toBe("");
    expect(board('<Panel title="趋势" focus><FilterBar /><LineChart /></Panel><Panel title="待处理"><ActionList /></Panel>')).toContain("只放一个展示组件");
    expect(board('<Panel title="趋势" focus><FormSection /></Panel><Panel title="待处理"><ActionList /></Panel>')).toContain("不能放 FormSection");
    expect(board('<Panel title="趋势" focus><LineChart /></Panel><Panel title="待处理">暂无</Panel>')).toContain("不能直接写文字");
    expect(board('<Panel :title="t" focus><LineChart /></Panel><Panel title="待处理"><ActionList /></Panel>')).toContain("固定文字");
    expect(board('<Panel title="趋势" focus><LineChart /></Panel><Panel title="趋势"><ActionList /></Panel>')).toContain("重复");
    expect(board('<Panel title="趋势" focus><StatList /></Panel><Panel title="待处理"><ActionList /></Panel>')).toContain("focus 面板要放趋势");
    expect(board('<Panel title="趋势" focus><LineChart /></Panel><Panel title="待处理"><ActionList /></Panel>', '<template #tabs><UiTabs /></template>')).toContain("总览不分标签页");
    expect(board('<Panel title="趋势" focus><LineChart /></Panel><Panel title="待处理"><ActionList /></Panel>', '<template #filters><FilterBar><Field><UiSelect /></Field></FilterBar></template>')).toContain("不套 Field");
  });
  it("允许一个主区、状态行和按需确认", () => {
    expect(
      check(
        '<PageFrame workspace title="文件"><template #actions><UiButton variant="primary">上传</UiButton></template><template #status><StatusMessage /></template><DataTable fill flat /><UiDialog><UiButton variant="primary">确认</UiButton></UiDialog></PageFrame>',
      ),
    ).toBe("");
  });
  it("阻止卡片堆叠、标题下面的说明段落和多个独立面板", () => {
    for (const body of [
      "<Card /><Card />",
      "<p>这是系统的说明</p><WorkArea />",
      "<WorkArea /><WorkArea />",
    ])
      expect(check(`<PageFrame workspace>${body}</PageFrame>`)).toContain(
        "只有一个",
      );
  });
  it("说明文字不能放进 status 冒充状态，正文也不能重复大标题", () => {
    expect(
      check(
        "<PageFrame workspace><template #status><p>这里是说明</p></template><WorkArea /></PageFrame>",
      ),
    ).toContain("status 只展示");
    expect(
      check(
        "<PageFrame workspace><WorkArea><h1>重复标题</h1></WorkArea></PageFrame>",
      ),
    ).toContain("重复 h1");
  });
  it("改名导入 Card 也不能绕过检查", () => {
    expect(
      check(
        "<PageFrame workspace><Panel /></PageFrame>",
        "import {Card as Panel} from '@/shared/ui/public'",
      ),
    ).toContain("不能导入 Card");
  });
  it("命名空间导入也不能绕过页面限制", () => {
    expect(
      check(
        "<PageFrame workspace><WorkArea><UI.Card /></WorkArea></PageFrame>",
        "import * as UI from '@/shared/ui/public'",
      ),
    ).toContain("必须具名导入");
  });
  it("主操作不能同时出现两个，也不能动态切换 variant 隐藏它", () => {
    expect(
      check(
        '<PageFrame workspace><WorkArea><UiButton variant="primary"/><UiButton variant="primary"/></WorkArea></PageFrame>',
      ),
    ).toContain("只能有一个 primary");
    expect(
      check(
        '<PageFrame workspace><WorkArea><UiButton :variant="kind"/></WorkArea></PageFrame>',
      ),
    ).toContain("明确的 variant");
  });
  it("页面必须登记任务，正文必须进入 workspace", () => {
    expect(
      inspectPageLayout(baseParse("<PageFrame><WorkArea /></PageFrame>"), [], {
        ...page,
        task: undefined,
      }).join(" "),
    ).toContain("task");
    expect(check("<PageFrame><WorkArea /></PageFrame>")).toContain("workspace");
  });
});
