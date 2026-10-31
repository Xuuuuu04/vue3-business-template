import { test, expect, type Page } from "@playwright/test";

test("可点击的普通数据行有键盘入口，行内按钮不额外触发跳转", async ({
  page,
}) => {
  const table = await mountTable(page);
  const row = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(table).toHaveAttribute("data-row-click-count", "1");
  await page.keyboard.press("Space");
  await expect(table).toHaveAttribute("data-row-click-count", "2");
  await table.getByRole("button", { name: "文件甲", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(table).toHaveAttribute("data-row-click-count", "2");
});

test("读取中保留页码，总数确定减少后回到有效页", async ({ page }) => {
  const table = await mountTable(page, { page: 3, total: 60 });
  await expect(
    table.getByText("第 41–60 条，共 60 条", { exact: true }),
  ).toBeVisible();
  await table.evaluate((host) =>
    host.dispatchEvent(
      new CustomEvent("fixture-update", {
        detail: { loading: true, total: 0 },
      }),
    ),
  );
  await expect(table).not.toHaveAttribute("data-page");
  await table.evaluate((host) =>
    host.dispatchEvent(
      new CustomEvent("fixture-update", {
        detail: { loading: false, total: 20 },
      }),
    ),
  );
  await expect(table).toHaveAttribute("data-page", "1");
  await expect(
    table.getByText("第 1–20 条，共 20 条", { exact: true }),
  ).toBeVisible();
});

test("查询失败显示重新读取入口，不冒充空结果", async ({ page }) => {
  const table = await mountTable(page);
  await table.evaluate((host) =>
    host.dispatchEvent(
      new CustomEvent("fixture-update", { detail: { error: "连接已中断" } }),
    ),
  );
  await expect(table.getByRole("alert")).toContainText("读取失败");
  await expect(
    table.getByText("没有符合条件的数据", { exact: true }),
  ).toHaveCount(0);
  await table.getByRole("button", { name: "重新读取", exact: true }).click();
  await expect(table).toHaveAttribute("data-retried", "true");
  await expect(
    table.getByRole("button", { name: "文件甲", exact: true }),
  ).toBeVisible();
});

interface TableExample {
  grouped?: boolean;
  rowClickable?: boolean;
  numeric?: boolean;
  align?: "left" | "center" | "right";
  page?: number;
  total?: number;
}
async function mountTable(page: Page, options: TableExample = {}) {
  await page.goto("/dev/design");
  await page.evaluate(async (example) => {
    const tablePath = "/src/shared/ui/data/DataTable.vue";

    const source = await (await fetch(tablePath)).text();
    const vuePath = source.match(/from "([^\"]*\/vue\.js[^\"]*)"/)![1]!;
    const { createApp, h, reactive } = await import(vuePath);
    const { default: DataTable } = await import(tablePath);
    const host = document.createElement("div");
    host.dataset.tableInteractionTest = "";
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1000",
      background: "var(--surface)",
      padding: "24px",
      display: "flex",
    });
    document.body.append(host);
    const paging = reactive({
      page: example.page ?? 1,
      total: example.total ?? 2,
      loading: false,
      error: "",
    });
    host.addEventListener("fixture-update", (event) =>
      Object.assign(paging, (event as CustomEvent).detail),
    );
    const rows = [
      { id: "A", name: "文件甲", team: "资料", amount: 123.45 },
      { id: "B", name: "文件乙", team: "资料", amount: 9876.5 },
    ];
    createApp({
      render: () =>
        h(
          DataTable,
          {
            columns: [
              {
                key: example.numeric ? "amount" : "name",
                title: example.numeric ? "金额" : "文件名",
                kind: example.numeric ? "number" : "text",
                align: example.align,
                width: 260,
              },
              { key: "team", title: "分组", width: 120 },
            ],
            rows,
            rowKey: "id",
            fill: true,
            flat: true,
            settings: false,
            fullscreenable: false,
            page: paging.page,
            total: paging.total,
            loading: paging.loading,
            error: paging.error,
            retryable: true,
            "onUpdate:page": (value: number) => {
              paging.page = value;
              host.dataset.page = String(value);
            },
            onRetry: () => {
              paging.error = "";
              host.dataset.retried = "true";
            },
            rowClickable: example.rowClickable ?? true,
            groupBy: example.grouped ? "team" : undefined,
            onRowClick: (row: { id: string }) => {
              host.dataset.lastRowClick = row.id;
              host.dataset.rowClickCount = String(
                Number(host.dataset.rowClickCount ?? 0) + 1,
              );
            },
          },
          {
            expanded: ({ row }: { row: { name: string } }) =>
              h("p", `${row.name}的内容`),
            "cell-name": ({ row }: { row: { name: string } }) =>
              h("button", { type: "button" }, row.name),
            "cell-amount": ({ row }: { row: { amount: number } }) =>
              h("span", { "data-alignment-value": "" }, row.amount.toFixed(2)),
          },
        ),
    }).mount(host);
  }, options);
  return page.locator("[data-table-interaction-test]");
}

test("分组按钮能用 Enter 和空格折叠，焦点保留且展开状态准确", async ({
  page,
}) => {
  const table = await mountTable(page, { grouped: true });
  const group = table.getByRole("button", {
    name: "收起资料分组",
    exact: true,
  });
  await group.focus();
  await page.keyboard.press("Enter");
  const expand = table.getByRole("button", {
    name: "展开资料分组",
    exact: true,
  });
  await expect(expand).toBeFocused();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(
    table.getByRole("button", { name: "文件甲", exact: true }),
  ).toBeHidden();
  await page.keyboard.press("Space");
  await expect(group).toBeFocused();
  await expect(group).toHaveAttribute("aria-expanded", "true");
  await expect(
    table.getByRole("button", { name: "文件甲", exact: true }),
  ).toBeVisible();
});

test("默认行展开有独立键盘按钮，不触发行跳转且不撑高数据行", async ({
  page,
}) => {
  const table = await mountTable(page);
  const expand = table.getByRole("button", {
    name: "展开文件甲详情",
    exact: true,
  });
  const row = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  const before = await row.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(before).toBeCloseTo(48, 0);
  await expand.focus();
  await page.keyboard.press("Space");
  const collapse = table.getByRole("button", {
    name: "收起文件甲详情",
    exact: true,
  });
  await expect(collapse).toBeFocused();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).not.toHaveAttribute("data-last-row-click");
  await page.keyboard.press("Enter");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByText("文件甲的内容", { exact: true })).toHaveCount(0);
  expect(
    await row.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeCloseTo(before, 0);
  await row.getByRole("cell", { name: "资料", exact: true }).click();
  await expect(table).toHaveAttribute("data-last-row-click", "A");
});

test("双击行内按钮不会额外展开，手机仍能用默认按钮打开详情", async ({
  page,
}) => {
  const table = await mountTable(page, { rowClickable: false });
  await table.getByRole("button", { name: "文件甲", exact: true }).dblclick();
  await expect(
    table.getByRole("button", { name: "展开文件甲详情", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(table).not.toHaveAttribute("data-last-row-click");
  const row = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  await row.getByRole("cell", { name: "资料", exact: true }).dblclick();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).not.toHaveAttribute("data-last-row-click");
  await table
    .getByRole("button", { name: "收起文件甲详情", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await table
    .getByRole("button", { name: "展开文件甲详情", exact: true })
    .click();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  expect(
    await table.evaluate((element) => element.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(390);
});

test("可导航行的双击只触发行点击，展开交给独立按钮", async ({ page }) => {
  const table = await mountTable(page);
  const row = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "文件甲", exact: true }) });
  await row.getByRole("cell", { name: "资料", exact: true }).dblclick();

  await expect(table).toHaveAttribute("data-last-row-click", "A");
  await expect(table).toHaveAttribute("data-row-click-count", "2");
  const expand = table.getByRole("button", {
    name: "展开文件甲详情",
    exact: true,
  });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(table.getByText("文件甲的内容", { exact: true })).toHaveCount(0);
  await expand.click();
  await expect(table.getByText("文件甲的内容", { exact: true })).toBeVisible();
  await expect(table).toHaveAttribute("data-row-click-count", "2");
});

for (const alignment of [undefined, "right", "center", "left"] as const) {
  test(`首列数字带展开按钮仍保留${alignment ?? "默认右"}排版`, async ({
    page,
  }) => {
    const table = await mountTable(page, { numeric: true, align: alignment });
    const geometry = await table
      .locator("[data-alignment-value]")
      .first()
      .evaluate((value) => {
        const cell = value.closest("td")!;
        const button = value.parentElement!.querySelector("button")!;
        const cellRect = cell.getBoundingClientRect(),
          valueRect = value.getBoundingClientRect(),
          buttonRect = button.getBoundingClientRect();
        const cellStyle = getComputedStyle(cell);
        return {
          left: buttonRect.left,
          right: valueRect.right,
          contentLeft: cellRect.left + Number.parseFloat(cellStyle.paddingLeft),
          contentRight:
            cellRect.right - Number.parseFloat(cellStyle.paddingRight),
        };
      });
    if (alignment === "center")
      expect((geometry.left + geometry.right) / 2).toBeCloseTo(
        (geometry.contentLeft + geometry.contentRight) / 2,
        0,
      );
    else if (alignment === "left")
      expect(geometry.left).toBeCloseTo(geometry.contentLeft, 0);
    else expect(geometry.right).toBeCloseTo(geometry.contentRight, 0);
  });
}

test("实际组件目录每行仅有一个展开入口，详情操作单独保留", async ({ page }) => {
  await page.goto("/dev/design?section=data&example=table");
  const row = page.getByRole("row").filter({ hasText: "矿泉水 550ml" });
  await expect(row).toBeVisible();
  await expect(row.locator("button[aria-expanded]")).toHaveCount(1);
  await expect(
    row.getByRole("button", { name: "依据", exact: true }),
  ).toHaveCount(0);
  await expect(
    row.getByRole("button", { name: "详情", exact: true }),
  ).toBeVisible();
  const expand = row.locator("button[aria-expanded]");
  await expand.click();
  await expect(expand).toHaveAttribute("aria-expanded", "true");
});
