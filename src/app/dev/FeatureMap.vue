<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowDown } from "lucide-vue-next";
import generatedGraph from "@/generated/graph.json";
import type { describe } from "@/shared/modules/graph";
import { PageFrame, StatusLine, WorkArea, Stack, Row, SelectList, UiTag, UiEmpty, UiCopy } from "@/shared/ui/public";

const graph = generatedGraph as unknown as ReturnType<typeof describe>;
const items = graph.flatMap((m) => m.actions.map((a) => ({ value: a.id, label: a.title, group: m.title, hint: a.id })));
const selected = ref(items[0]?.value ?? "");
const owner = computed(() => graph.find((m) => m.actions.some((a) => a.id === selected.value)));
const action = computed(() => owner.value?.actions.find((a) => a.id === selected.value));
const pages = computed(() => owner.value?.pages.filter((p) => p.actions.includes(selected.value)) ?? []);
/** 字段名换成中文含义；没有登记含义的原样显示。 */
const names = (keys: string[]) => keys.map((k) => action.value?.fields[k]?.title ?? k);
function endpoint(id: string) {
  const e = owner.value?.endpoints.find((x) => x.id === id);
  return e ? `${e.method} ${e.path}` : id;
}
function where(s?: { file: string; line: number }) { return s ? `${s.file}:${s.line}` : ""; }
const total = graph.reduce((n, m) => n + m.actions.length, 0);
</script>
<template>
  <PageFrame title="功能地图" workspace>
    <template #status><StatusLine :items="[{ text: `${graph.length} 个业务模块` }, { text: `${total} 个操作` }, { text: '点左边的操作，右边看它依次做了什么' }]" /></template>
    <UiEmpty v-if="!items.length" title="还没有业务模块" hint="用 npm run new:module -- 包名 --title 中文名 创建第一个，创建后运行 npm run docs。" />
    <WorkArea v-else fill><div class="grid min-h-0 flex-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="min-h-0 overflow-auto lg:border-r lg:border-line lg:pr-4"><SelectList v-model="selected" label="操作列表" :items="items" /></aside>
      <div v-if="action && owner" class="min-h-0 overflow-auto pr-1">
        <header class="mb-8"><h2 class="mb-4 text-[20px] font-semibold">{{ action.title }}</h2>
          <Stack gap="sm">
            <p class="text-fg-muted">用户在这些页面上会触发它：</p>
            <Row v-for="p in pages" :key="p.id"><b class="font-medium">{{ p.title }}</b><UiTag tone="code">{{ p.path }}</UiTag><span class="min-w-0 break-all text-[13px] text-fg-muted">{{ p.file }}</span></Row>
            <p v-if="!pages.length" class="text-fg-faint">没有页面直接使用这个操作。</p>
            <p v-if="action.inputFields.length" class="text-fg-muted">需要用户或页面提供：{{ names(action.inputFields).join("、") }}</p>
          </Stack>
        </header>
        <section><h3 class="mb-4 font-medium">执行过程</h3>
          <ol class="flex flex-col">
            <li v-for="(step, i) in action.steps" :key="step.id" class="flex flex-col">
              <div v-if="i" class="flex h-6 items-center pl-3 text-fg-faint"><ArrowDown class="size-4" /></div>
              <div class="border-l-2 border-line pl-5 py-3">
                <div class="mb-2 flex items-center gap-2"><span class="grid size-6 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-text">{{ i + 1 }}</span><b class="font-medium">{{ step.title }}</b><UiTag v-if="step.rule" class="ml-auto">规则 {{ step.rule }}</UiTag></div>
                <dl class="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                  <dt class="text-fg-faint">用到的数据</dt><dd class="min-w-0 break-words">{{ names(step.reads).join("、") || "无" }}</dd>
                  <dt class="text-fg-faint">得到的数据</dt><dd class="min-w-0 break-words">{{ names(step.writes).join("、") || "无" }}</dd>
                  <template v-if="step.uses.length"><dt class="text-fg-faint">调用的接口</dt><dd class="flex min-w-0 flex-wrap gap-1.5 overflow-auto"><UiTag v-for="u in step.uses" :key="u" tone="code">{{ endpoint(u) }}</UiTag></dd></template>
                  <template v-if="step.when"><dt class="text-fg-faint">执行条件</dt><dd>{{ step.when.title }}</dd></template>
                  <dt class="text-fg-faint">代码位置</dt>
                  <dd class="flex min-w-0 items-center gap-2 overflow-auto" v-if="step.source"><UiTag tone="code">{{ where(step.source) }}</UiTag><span class="text-fg-faint">{{ step.source.symbol }}</span>
                    <UiCopy :text="where(step.source)" :label="`复制 ${where(step.source)}`" /></dd>
                  <dd v-else class="text-warn">没有找到代码位置，请运行 npm run docs</dd>
                </dl>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </div></WorkArea>
  </PageFrame>
</template>
