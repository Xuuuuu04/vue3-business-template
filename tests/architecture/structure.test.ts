/** 模拟廉价代理常见误写，验证检查能指出具体文件。 */
import { expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectModule, inspectProject } from "../../tools/inspect";
import type { BusinessModule } from "@/shared/modules/definitions";
const base: BusinessModule = {
  name: "sample",
  title: "样例",
  description: "测试",
  dependsOn: [],
  files: ["data.ts", "pages/Main.vue"],
  actions: [],
  endpoints: [],
  pages: [
    {
      id: "main",
      title: "主页",
      path: "/main",
      file: "pages/Main.vue",
      actions: [],
      components: ["PageFrame"],
      load: async () => ({ default: {} }),
    },
  ],
};
function fixture(
  data: string,
  view = '<template><PageFrame title="样例" /></template>',
) {
  const root = mkdtempSync(join(tmpdir(), "vue-structure-"));
  mkdirSync(join(root, "src/modules/sample/pages"), { recursive: true });
  writeFileSync(join(root, "src/modules/sample/data.ts"), data);
  writeFileSync(join(root, "src/modules/sample/pages/Main.vue"), view);
  return root;
}
test("拒绝私写样式、未登记组件、裸请求和共用内部导入", () => {
  const root = fixture(
    "import x from '@/shared/http/client'; window.fetch('/api');",
    '<template><PageFrame style="color:red"/><UiCard /></template><style>.x{font-size:10px}</style>',
  );
  try {
    const errors = inspectModule(root, base);
    expect(errors.join(" ")).toContain("内部文件");
    expect(errors.join(" ")).toContain("效果 window");
    expect(errors.join(" ")).toContain("样式");
    expect(errors.join(" ")).toContain("UiCard");
  } finally {
    rmSync(root, { recursive: true });
  }
});
test("未生成的文件和未登记的包都阻止运行", () => {
  const root = fixture("export const x=1;");
  writeFileSync(join(root, "src/modules/sample/random.ts"), "");
  try {
    expect(inspectModule(root, base).join(" ")).toContain("没有经过生成器登记");
    expect(inspectProject(root, []).join(" ")).toContain("未登记");
    expect(inspectProject(root, [base]).join(" ")).toContain("生成器登记表");
  } finally {
    rmSync(root, { recursive: true });
  }
});
test("跨包内部导入与依赖循环不能通过", () => {
  const root = fixture("import x from '@/modules/other/data';");
  try {
    expect(inspectModule(root, base).join(" ")).toContain("跨模块");
    const cycle = { ...base, dependsOn: ["sample"] };
    expect(inspectProject(root, [cycle]).join(" ")).toContain("成环");
  } finally {
    rmSync(root, { recursive: true });
  }
});
