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
