<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Check, Globe, Play } from "lucide-vue-next";
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
        <section aria-label="执行过程">
          <h3 class="mb-4 font-medium">执行过程</h3>
          <ol class="flow">
            <li class="flow-node is-terminal"><span class="flow-dot"><Play class="size-3" /></span><div class="flow-terminal">页面触发<span v-if="action.inputFields.length" class="text-fg-faint">，带上 {{ names(action.inputFields).join("、") }}</span></div></li>
            <li v-for="(step, i) in action.steps" :key="step.id" class="flow-node" :style="{ animationDelay: `${i * 50}ms` }">
              <span class="flow-dot">{{ i + 1 }}</span>
              <div class="flow-card">
                <div class="flex flex-wrap items-center gap-2">
                  <b class="font-medium">{{ step.title }}</b>
                  <UiTag v-if="step.when" tone="warn">仅当 {{ step.when.title }}</UiTag>
                  <UiTag v-if="step.rule" class="ml-auto">规则 {{ step.rule }}</UiTag>
                </div>
                <div class="flow-data">
                  <span class="flow-chips"><span v-for="r in names(step.reads)" :key="r" class="flow-chip">{{ r }}</span><span v-if="!step.reads.length" class="text-fg-faint">不读取数据</span></span>
                  <ArrowRight class="size-4 shrink-0 text-fg-faint" />
                  <span class="flow-chips"><span v-for="w in names(step.writes)" :key="w" class="flow-chip is-out">{{ w }}</span><span v-if="!step.writes.length" class="text-fg-faint">不产生数据</span></span>
                </div>
                <div v-if="step.uses.length" class="flex flex-wrap gap-1.5"><span v-for="u in step.uses" :key="u" class="flow-endpoint"><Globe class="size-3.5" />{{ endpoint(u) }}</span></div>
                <div class="flow-source">
                  <template v-if="step.source"><code>{{ where(step.source) }}</code><span class="text-fg-faint">{{ step.source.symbol }}</span><UiCopy :text="where(step.source)" :label="`复制 ${where(step.source)}`" /></template>
                  <span v-else class="text-warn">没有找到代码位置，请运行 npm run docs</span>
                </div>
              </div>
            </li>
            <li class="flow-node is-terminal"><span class="flow-dot"><Check class="size-3" /></span><div class="flow-terminal">页面得到结果<span v-if="action.steps.at(-1)?.writes.length" class="text-fg-faint">：{{ names(action.steps.at(-1)!.writes).join("、") }}</span></div></li>
          </ol>
        </section>
      </div>
    </div></WorkArea>
  </PageFrame>
</template>
