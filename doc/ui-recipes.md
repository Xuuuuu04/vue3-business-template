# 页面配方

做页面先选配方，照骨架填数据。这里是页面结构的唯一说明，AGENTS、Skill 和其他文档都只链接到这里。

结构检查（`npm run check`、开发服务保存、打包）会拦下多个主区、多个主要按钮、Card 拼页、正文前的说明段落、重复 h1 和原生表单控件，总览面板和筛选条的写法也会逐条检查；详情、表单、会话的内部排布检查管不到，要照配方写。

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
| 调整一类设置 | 设置 | 当前这一类设置 |

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
- 每个面板只放一个展示组件：`LineChart`、`BarChart`、`BarList`、`DonutChart`、`DataTable`、`ActionList`、`StatList`、`ActivityFeed`、`Timeline`、`TraceWaterfall`。
- 读取中、没数据用面板的 `loading`、`empty`、`empty-title`，不写 `v-if/v-else` 占位文字。
- 筛选放 `#filters`，作用于整页；控件用 `aria-label`，不套 `Field`。不分标签页，每个视角各占一个面板。
- 面板标题是固定文字，说明这一块回答什么问题，不重复。统计口径写进标题（如“任一眼低于 5.0 的比例”），不写在状态行。
- 状态行只写实际状态：数据截至时间、来源是否齐全、延迟或失败；不写统计方法、操作说明。
- 想加说明小字时，先想清楚：标题能不能说清？说不清就改标题，而不是加一行字。

## 列表

`PageFrame workspace` → `DataTable fill flat`。只有一个搜索框和一两个快捷筛选时放表格的 `#search`；条件更多时放 `PageFrame #filters` 的 `FilterBar`：一行最多 3 个最常用的条件（不套 Field，用 aria-label），其余放 `<template #more>` 收进“更多筛选”，弹层里可以用 Field 写名称，`more-active` 传其中已生效的数量。不要在表格上方铺一整块带标题的筛选表单。主要操作（新建、导入）放页头。名称列用 `UiButton variant="text"` 进详情，数字列 `kind="number"` 右对齐并写 `unit`，状态用 `UiTag`。整行可点用 `row-clickable`。

## 表单

`PageFrame workspace` → `WorkArea form fill` → `<form>` → 多个 `FormSection`。保存放页头 primary。宽屏右侧自动出现表单目录与必填进度；要换成预览或摘要就传 `#aside`。

## 详情

`PageFrame workspace` → `WorkArea fill`，第一个子项 `SummaryBand`（第一项是本页重点：金额、状态或得分），后面是对象的主体内容（明细表、预览、记录）。流程、审批进度、关联对象放 `#aside`，`aside-title` 写清楚是什么。

同一个事实在页面上只出现一次。状态行、摘要带、右侧栏各管一类：
- 状态行（`#status`）：只放会过期或需要留意的状态，例如“数据截至 10:30”“结果待确认”；对象自己的状态不放这里。
- 摘要带：对象最要紧的 2–5 个事实（金额、状态、负责人、期限）。
- 右侧栏：流程进度、关联对象、可操作的下一步；不重复摘要带里已有的状态、负责人和时间。

写完数一数：同一个名称或数值出现两次以上，就删掉多余的。

## 会话

```vue
<PageFrame title="客服会话" workspace>
  <WorkArea fill>
    <SplitWorkspace v-model:view="view" list-label="会话列表" :detail-label="`${active.name}的会话`">
      <template #listHeader><UiSearchInput v-model="search" placeholder="搜索姓名或主题" /></template>
      <template #list><ConversationList v-model="selected" :items="items" label="选择会话" /></template>
      <template #heading><!-- 当前对象名称、处理状态、标记已处理 --></template>
      <ConversationThread :thread-id="active.id" :messages="active.messages" :label="active.name" />
      <template #composer><PromptInput v-model="draft" aria-label="回复客户" @send="send" /></template>
    </SplitWorkspace>
  </WorkArea>
</PageFrame>
```

- 选择区和消息流属于同一个任务，用一个 `SplitWorkspace`：桌面并排，手机用 `v-model:view` 在列表和内容之间切换。
- 搜索和范围切换放 `#listHeader`；当前对象的名称、状态和处理操作放 `#heading`，不放状态行。
- 草稿按对象分开保存。`PromptInput` 只发出 `send`，页面确认发送成功后才清空与本次发送相同的草稿；失败或结果未知时保留。
- 未读、处理状态和权限由页面或业务包管理。参考 `/dev/examples/inbox`。

## 设置

`PageFrame workspace` → `#tabs` 放 `UiTabs` 切换设置类别 → 一个 `WorkArea form fill`，一次只显示一类设置。每类用 `FormSection` 分组，名称和说明在左、控件在右。立即生效的开关用 `UiSwitch`，不另放保存按钮；需要保存的设置把保存放页头 primary。参考 `/settings`。

## 演示数据

页面好不好看，一半取决于数据像不像真的。演示与测试数据要：

- 列表至少 12 行，名称、金额、时间各不相同，有长有短；
- 趋势至少 6 个时间点，有起伏；分类至少 3 类；
- 至少一条“待处理”不为 0，至少一条异常或失败状态；
- 用业务里真实会出现的名字（学校、门店、产品），不用“测试1”“aaa”。

只有一两条数据时，任何页面都显得空。先补数据，再评价排版。
