import { describe, expect, it } from "vitest";
import { formatRelative } from "../../src/shared/ui/lib/format";

describe("相对时间显示", () => {
  const now = new Date(2026, 9, 31, 13, 0);
  it("同日未来时间显示具体时刻，不显示负数小时前", () => {
    expect(formatRelative(new Date(2026, 9, 31, 15, 0), now)).toBe(
      "今天 15:00",
    );
  });
  it("已经发生的时间继续显示经过时长", () => {
    expect(formatRelative(new Date(2026, 9, 31, 11, 0), now)).toBe("2 小时前");
    expect(formatRelative(new Date(2026, 9, 31, 12, 55), now)).toBe("5 分钟前");
  });
  it("跨日期显示日期和时刻，跨年份保留年份", () => {
    expect(formatRelative(new Date(2026, 9, 30, 15, 0), now)).toBe(
      "昨天 15:00",
    );
    expect(formatRelative(new Date(2027, 0, 1, 15, 0), now)).toBe(
      "2027年1月1日",
    );
  });
});
