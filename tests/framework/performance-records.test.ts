import { expect, test } from "vitest";
import { navigationName, recordBrowserEntry, usePerformance } from "@/shared/records/performance";

function entry(name: string, initiatorType?: string): PerformanceEntry & { initiatorType?: string } {
  return { name, entryType: "resource", startTime: 420, duration: 0, toJSON: () => ({}), initiatorType };
}
test("绘制记录保存420ms时点，不能把恒零的duration写成首次绘制耗时", () => {
  recordBrowserEntry("paint", entry("first-contentful-paint"));
  expect(usePerformance().signals.value.at(-1)?.duration).toBe(420);
});
test.each([
  "https://user:synthetic_private@cdn.example/assets/app.js?token=synthetic_private#fragment",
  "https://site.example/api/users/synthetic_private?token=synthetic_private",
  "not a URL synthetic_private",
])("资源记录在进入页面内存前移除敏感地址内容：%s", (name) => {
  recordBrowserEntry("resource", entry(name));
  expect(usePerformance().signals.value.at(-1)?.name).not.toContain("synthetic_private");
});
test("静态代码位置仍可排查，接口位置沿用动作中的登记记录", () => {
  recordBrowserEntry("resource", entry("https://site.example/assets/app.js?cache=123", "script"));
  expect(usePerformance().signals.value.at(-1)?.name).toBe("https://site.example/assets/app.js");
  recordBrowserEntry("resource", entry("https://site.example/custom/path/private", "fetch"));
  expect(usePerformance().signals.value.at(-1)?.name).toBe("接口请求");
});
test("动态详情只记录登记页面，未匹配地址不保留原值", () => {
  expect(navigationName({ name: "files.detail", matched: [{ path: "/files/:id" }] })).toBe("files.detail");
  expect(navigationName({ matched: [{ path: "/files/:id" }] })).toBe("/files/:id");
  expect(navigationName({ matched: [{ path: "/:pathMatch(.*)*" }] })).toBe("未匹配页面");
});
