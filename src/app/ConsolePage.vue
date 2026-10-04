<script setup lang="ts">
import { computed, ref } from "vue";
import { modules } from "./catalog";
import { describe } from "@/shared/modules/graph";
import { useRecords } from "@/shared/records/store";
import { usePerformance } from "@/shared/records/performance";
import { PageFrame, UiButton, UiInput } from "@/shared/ui/public";
const graph = describe(modules);
const { items, dropped } = useRecords();
const { signals, gaps } = usePerformance();
const tab = ref("structure");
const filter = ref("");
const selected = ref(graph[0]?.actions[0]?.id || "");
const selectedRun = ref("");
const action = computed(() =>
  graph.flatMap((m) => m.actions).find((a) => a.id === selected.value),
);
const owner = computed(() =>
  graph.find((m) => m.actions.some((a) => a.id === selected.value)),
);
const runs = computed(() =>
  items.value.filter((r) => `${r.title} ${r.action}`.includes(filter.value)),
);
const run = computed(
  () => items.value.find((r) => r.id === selectedRun.value) || runs.value[0],
);
const statusNames: Record<string, string> = {
  running: "执行中",
  ok: "完成",
  failed: "失败",
  skipped: "条件不满足，已跳过",
  cancelled: "已取消",
  unknown: "结果未知",
};
function millis(value: number) {
  return `${value.toFixed(1)} ms`;
}
function exportRuns() {
  const body = JSON.stringify(
    {
      codeVersion: run.value?.codeVersion,
      removed: dropped(),
      runs: items.value,
    },
    null,
    2,
  );
  const blob = new Blob([body], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "frontend-runs.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>
<template>
  <PageFrame
    title="结构与运行"
    description="从开发包进入动作，再查看步骤的数据来源、执行结果和源码位置。"
  >
    <template #actions
      ><UiButton @click="exportRuns">导出当前运行记录</UiButton></template
    >
    <div class="tabs" role="tablist" aria-label="查看内容">
      <UiButton
        :aria-selected="tab === 'structure'"
        role="tab"
        @click="tab = 'structure'"
        >模块与计算图</UiButton
      ><UiButton
        :aria-selected="tab === 'runs'"
        role="tab"
        @click="tab = 'runs'"
        >实际运行（{{ items.length }}）</UiButton
      ><UiButton
        :aria-selected="tab === 'performance'"
        role="tab"
        @click="tab = 'performance'"
        >浏览器性能</UiButton
      >
    </div>
    <div v-if="tab === 'structure'" class="graph-layout">
      <nav class="graph-tree" aria-label="模块动作">
        <div v-for="module in graph" :key="module.name">
          <h2>{{ module.title }}</h2>
          <p class="muted">{{ module.description }}</p>
          <button
            v-for="entry in module.actions"
            :key="entry.id"
            class="graph-node"
            :aria-current="selected === entry.id"
            @click="selected = entry.id"
          >
            {{ entry.title }}
          </button>
        </div>
      </nav>
      <section v-if="action && owner" aria-label="动作计算图">
        <h2>{{ action.title }}</h2>
        <p class="run-source">{{ owner.source }}</p>
        <p>
          输入：{{
            action.inputFields
              .map((key) => action!.fields[key]?.title)
              .join("、")
          }}
        </p>
        <ol class="graph-steps">
          <li v-for="(step, index) in action.steps" :key="step.id">
            <p v-if="index" class="graph-connector">↓ 上一步结果进入下一步</p>
            <div class="graph-step">
              <h2>{{ index + 1 }}. {{ step.title }}</h2>
              <p>规则：{{ step.rule }}</p>
              <p>
                读取：{{
                  step.reads
                    .map((key) => action!.fields[key]?.title)
                    .join("、") || "无"
                }}
              </p>
              <p>
                产出：{{
                  step.writes
                    .map((key) => action!.fields[key]?.title)
                    .join("、") || "无"
                }}
              </p>
              <p v-if="step.when">条件：{{ step.when.title }}</p>
              <p v-if="step.uses.length">接口：{{ step.uses.join("、") }}</p>
              <p class="run-source">
                {{
                  step.source
                    ? `${step.source.file}:${step.source.line} · ${step.source.symbol}`
                    : "源码索引缺失，请重新生成"
                }}
              </p>
            </div>
          </li>
        </ol>
        <section class="content-section">
          <h2>进入这个动作的页面</h2>
          <ul class="plain-list">
            <li
              v-for="page in owner.pages.filter((p) =>
                p.actions.includes(action!.id),
              )"
              :key="page.id"
            >
              {{ page.title }} · {{ page.path }}
              <p class="run-source">{{ page.file }}</p>
              <p>状态：{{ page.state }}</p>
              <p>组件：{{ page.components.join("、") }}</p>
            </li>
          </ul>
        </section>
        <section class="content-section">
          <h2>模块依赖</h2>
          <p>{{ owner.dependsOn.join("、") || "没有其他业务模块依赖" }}</p>
        </section>
      </section>
      <div v-else class="empty-section">当前没有已登记的动作。</div>
    </div>
    <template v-else-if="tab === 'runs'"
      ><div class="toolbar">
        <div class="field filter-field">
          <label for="run-filter">查找动作</label
          ><UiInput
            id="run-filter"
            v-model="filter"
            placeholder="动作名或编号"
          />
        </div>
        <p class="muted">最多保留 100 次 · 已移除 {{ dropped() }} 次</p>
      </div>
      <div class="graph-layout">
        <nav class="run-picker" aria-label="运行记录">
          <button
            v-for="entry in runs"
            :key="entry.id"
            class="graph-node"
            :aria-current="run?.id === entry.id"
            @click="selectedRun = entry.id"
          >
            {{ entry.title }} · {{ statusNames[entry.status] }}
            <p>{{ millis(entry.elapsed) }}</p>
          </button>
        </nav>
        <section v-if="run" aria-label="运行详情">
          <h2>{{ run.title }} · {{ statusNames[run.status] }}</h2>
          <div class="stat-line">
            <span>动作持续 {{ millis(run.elapsed) }}</span
            ><span>版本 {{ run.codeVersion }}</span>
          </div>
          <p class="run-source">运行编号 {{ run.id }}</p>
          <p v-if="run.error" role="alert">{{ run.error }}</p>
          <p v-for="gap in run.gaps" :key="gap">{{ gap }}</p>
          <ol class="graph-steps">
            <li v-for="step in run.steps" :key="step.id" class="graph-step">
              <h2>
                {{ step.title }} · {{ statusNames[step.status] }} ·
                {{ millis(step.elapsed) }}
              </h2>
              <p class="run-source">
                {{
                  step.source
                    ? `${step.source.file}:${step.source.line} · ${step.source.symbol}`
                    : "无源码索引"
                }}
              </p>
              <p v-if="step.error" role="alert">{{ step.error }}</p>
              <p v-for="output in step.outputs" :key="output">{{ output }}</p>
              <div
                v-for="(request, index) in step.requests"
                :key="index"
                class="content-section"
              >
                <p>
                  {{ request.method }} {{ request.endpoint }} ·
                  {{ request.status || request.outcome }} ·
                  {{ millis(request.elapsed) }}
                </p>
                <p>请求编号：{{ request.requestId || "没有返回编号" }}</p>
                <p>
                  后台运行编号：{{
                    request.backendRun || "未返回；演示服务不会伪造后台编号"
                  }}
                </p>
              </div>
            </li>
          </ol>
        </section>
        <div v-else class="empty-section">
          还没有实际运行。先去文件管理执行一次操作。
        </div>
      </div></template
    >
    <template v-else
      ><p>
        下面来自浏览器性能事件。接口等待与后台耗时不能相加，DOM
        更新完成也不等于屏幕已经绘制。
      </p>
      <p v-for="gap in gaps" :key="gap" class="muted">{{ gap }}</p>
      <ul class="plain-list">
        <li
          v-for="(signal, index) in signals.slice(-30).reverse()"
          :key="index"
        >
          {{ signal.kind }} · {{ signal.name }} · {{ millis(signal.duration) }}
        </li>
      </ul></template
    >
  </PageFrame>
</template>
