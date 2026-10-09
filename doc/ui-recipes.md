# 页面配方

做页面先选配方，照骨架填数据。配方之外的写法会被结构检查拦下（`npm run check`），不用凭感觉排版。

## 先回答三个问题

1. 用户来这页要做什么？写进页面登记的 `task`，一句话。
2. 用户打开后第一眼要看到什么？这就是本页的重点，只有一个。
3. 主要操作是什么？最多一个 primary 按钮，放页头。

答不出就先问业务方，不要先画页面。

## 选哪种配方

| 用户要做的事 | 配方 | 重点 |
| --- | --- | --- |
| 看整体情况、发现要处理的事 | 总览 | 第一个 focus 面板 |
| 找到并处理一批对象 | 列表 | 表格 |
| 新建或修改一个对象 | 表单 | 表单本身（右侧自动目录） |
| 查看并处理一个对象 | 详情 | 摘要带 + 主体内容 |
| 与客户或模型对话 | 会话 | 消息流 |

参考实现都在 `/dev/examples`，源码 `src/app/dev/examples/`。

## 总览

```vue
<PageFrame title="筛查概览" workspace>
  <template #actions><UiSegmented v-model="range" :options="ranges" aria-label="统计范围" /></template>
  <template #filters>
    <FilterBar :loading="loading" @query="load" @reset="reset">
      <UiSelect v-model="hospital" :options="hospitals" aria-label="医院" />
      <UiSelect v-model="school" :options="schools" aria-label="学校" />
    </FilterBar>
  </template>
  <template #status><StatusLine :items="facts" /></template>
  <OverviewBoard>
    <Panel title="视力分布" focus :figure="{ value: '1,284', unit: '名学生' }" :loading="loading" :empty="!grades.length" empty-title="暂无报告">
      <BarChart :labels="grades.map(g => g.label)" :series="[{ name: '人数', values: grades.map(g => g.count) }]" />
    </Panel>
    <Panel title="待处理" flush :loading="loading">
      <ActionList :items="todos" />
    </Panel>
    <Panel title="月度变化"><LineChart ... /></Panel>
    <Panel title="学校排名" more="/students"><BarList ... /></Panel>
    <Panel title="关键数字"><StatList :items="stats" /></Panel>
  </OverviewBoard>
</PageFrame>
```

- 面板 2–6 个。第一个必须是 `focus`，放本页最重要的趋势、分布或排名，可带一个关键数字 `figure`。
- 第二个通常是“待处理”：`ActionList`，每行一件要去处理的事、数量和去处；数量为 0 的行自动收起。
- 每个面板只放一个展示组件：`LineChart`、`BarChart`、`BarList`、`DonutChart`、`DataTable`、`ActionList`、`StatList`、`ActivityFeed`、`Timeline`。
- 读取中、没数据用面板的 `loading`、`empty`、`empty-title`，不写 `v-if/v-else` 占位文字。
- 筛选放 `#filters`，作用于整页；控件用 `aria-label`，不套 `Field`。不分标签页，每个视角各占一个面板。
- 面板标题是固定文字，说明这一块回答什么问题，不重复。统计口径写进标题（如“任一眼低于 5.0 的比例”），不写在状态行。
- 状态行只写实际状态：数据截至时间、来源是否齐全、延迟或失败；不写统计方法、操作说明。
- 想加说明小字时，先想清楚：标题能不能说清？说不清就改标题，而不是加一行字。

## 列表

`PageFrame workspace` → `DataTable fill flat`。搜索和筛选放表格的 `#search`，主要操作（新建、导入）放页头。名称列用 `UiButton variant="text"` 进详情，数字列 `kind="number"` 右对齐并写 `unit`，状态用 `UiTag`。整行可点用 `row-clickable`。

## 表单

`PageFrame workspace` → `WorkArea form fill` → `<form>` → 多个 `FormSection`。保存放页头 primary。宽屏右侧自动出现表单目录与必填进度；要换成预览或摘要就传 `#aside`。

## 详情

`PageFrame workspace` → `WorkArea fill`，第一个子项 `SummaryBand`（第一项是本页重点：金额、状态或得分），后面是对象的主体内容（明细表、预览、记录）。流程、审批进度、关联对象放 `#aside`，`aside-title` 写清楚是什么。

## 演示数据

页面好不好看，一半取决于数据像不像真的。演示与测试数据要：

- 列表至少 12 行，名称、金额、时间各不相同，有长有短；
- 趋势至少 6 个时间点，有起伏；分类至少 3 类；
- 至少一条“待处理”不为 0，至少一条异常或失败状态；
- 用业务里真实会出现的名字（学校、门店、产品），不用“测试1”“aaa”。

只有一两条数据时，任何页面都显得空。先补数据，再评价排版。
