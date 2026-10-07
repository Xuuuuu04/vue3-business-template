import { test, expect, type Page } from "@playwright/test";

interface TableExample { grouped?: boolean; rowClickable?: boolean; numeric?: boolean; align?: "left" | "center" | "right" }
async function mountTable(page: Page, options: TableExample = {}) {
  await page.goto("/files");
  await page.evaluate(async (example) => {
    const vuePath = "/node_modules/.vite/deps/vue.js";
    const tablePath = "/src/shared/ui/data/DataTable.vue";
    const { createApp, h } = await import(vuePath);
    const { default: DataTable } = await import(tablePath);
    const host = document.createElement("div");
    host.dataset.tableInteractionTest = "";
    Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "1000", background: "var(--surface)", padding: "24px", display: "flex" });
    document.body.append(host);
    const rows = [
      { id: "A", name: "文件甲", team: "资料", amount: 123.45 },
      { id: "B", name: "文件乙", team: "资料", amount: 9876.5 },
    ];
    createApp({ render: () => h(DataTable, {
      columns: [{ key: example.numeric ? "amount" : "name", title: example.numeric ? "金额" : "文件名", kind: example.numeric ? "number" : "text", align: example.align, width: 260 }, { key: "team", title: "分组", width: 120 }],
      rows, rowKey: "id", fill: true, flat: true, settings: false, fullscreenable: false,
      rowClickable: example.rowClickable ?? true, groupBy: example.grouped ? "team" : undefined,
      onRowClick: (row: { id: string }) => { host.dataset.lastRowClick = row.id; host.dataset.rowClickCount = String(Number(host.dataset.rowClickCount ?? 0) + 1); },
    }, {
      expanded: ({ row }: { row: { name: string } }) => h("p", `${row.name}的内容`),
      "cell-name": ({ row }: { row: { name: string } }) => h("button", { type: "button" }, row.name),
      "cell-amount": ({ row }: { row: { amount: number } }) => h("span", { "data-alignment-value": "" }, row.amount.toFixed(2)),
    }) }).mount(host);
  }, options);
  return page.locator("[data-table-interaction-test]");
}

test("分组按钮能用 Enter 和空格折叠，焦点保留且展开状态准确", async ({ page }) => {
  const table = await mountTable(page, { grouped: true });
  const group = table.getByRole("button", { name: "收起资料分组", exact: true });
  await group.focus();
  await page.keyboard.press("Enter");
  const expand = table.getByRole("button", { name: "展开资料分组", exact: true });
  await expect(expand).toBeFocused();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByRole("button", { name: "文件甲", exact: true })).toBeHidden();
  await page.keyboard.press("Space");
  await expect(group).toBeFocused();
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await expect(table.getByRole("button", { name: "文件甲", exact: true })).toBeVisible();
});

test("默认行展开有独立键盘按钮，不触发行跳转且不撑高数据行", async ({ page }) => {
  const table = await mountTable(page);
  const expand = table.getByRole("button", { name: "展开文件甲详情", exact: true });
  const row = table.getByRole("row").filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  const before = await row.evaluate((element) => element.getBoundingClientRect().height);
  expect(before).toBeCloseTo(48, 0);
  await expand.focus();
  await page.keyboard.press("Space");
  const collapse = table.getByRole("button", { name: "收起文件甲详情", exact: true });
  await expect(collapse).toBeFocused();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).not.toHaveAttribute("data-last-row-click");
  await page.keyboard.press("Enter");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByText("文件甲的内容", { exact: true })).toHaveCount(0);
  expect(await row.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(before, 0);
  await row.getByRole("cell", { name: "资料", exact: true }).click();
  await expect(table).toHaveAttribute("data-last-row-click", "A");
});

test("双击行内按钮不会额外展开，手机仍能用默认按钮打开详情", async ({ page }) => {
  const table = await mountTable(page, { rowClickable: false });
  await table.getByRole("button", { name: "文件甲", exact: true }).dblclick();
  await expect(table.getByRole("button", { name: "展开文件甲详情", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(table).not.toHaveAttribute("data-last-row-click");
  const row = table.getByRole("row").filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  await row.getByRole("cell", { name: "资料", exact: true }).dblclick();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).not.toHaveAttribute("data-last-row-click");
  await table.getByRole("button", { name: "收起文件甲详情", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await table.getByRole("button", { name: "展开文件甲详情", exact: true }).click();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  expect(await table.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
});

test("可导航行的双击只触发行点击，展开交给独立按钮", async ({ page }) => {
  const table = await mountTable(page);
  const row = table.getByRole("row").filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  await row.getByRole("cell", { name: "资料", exact: true }).dblclick();
  // 浏览器双击会依次产生两次 click；dblclick 本身不能再增加展开或行操作。
  await expect(table).toHaveAttribute("data-last-row-click", "A");
  await expect(table).toHaveAttribute("data-row-click-count", "2");
  const expand = table.getByRole("button", { name: "展开文件甲详情", exact: true });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByText("文件甲的内容", { exact: true })).toHaveCount(0);
  await expand.click();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).toHaveAttribute("data-row-click-count", "2");
});

for (const alignment of [undefined, "right", "center", "left"] as const) {
  test(`首列数字带展开按钮仍保留${alignment ?? "默认右"}排版`, async ({ page }) => {
    const table = await mountTable(page, { numeric: true, align: alignment });
    const geometry = await table.locator("[data-alignment-value]").first().evaluate((value) => {
      const cell = value.closest("td")!;
      const button = value.parentElement!.querySelector("button")!;
      const cellRect = cell.getBoundingClientRect(), valueRect = value.getBoundingClientRect(), buttonRect = button.getBoundingClientRect();
      const cellStyle = getComputedStyle(cell);
      return {
        left: buttonRect.left, right: valueRect.right,
        contentLeft: cellRect.left + Number.parseFloat(cellStyle.paddingLeft),
        contentRight: cellRect.right - Number.parseFloat(cellStyle.paddingRight),
      };
    });
    if (alignment === "center") expect((geometry.left + geometry.right) / 2).toBeCloseTo((geometry.contentLeft + geometry.contentRight) / 2, 0);
    else if (alignment === "left") expect(geometry.left).toBeCloseTo(geometry.contentLeft, 0);
    else expect(geometry.right).toBeCloseTo(geometry.contentRight, 0);
  });
}
