<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowDown } from "lucide-vue-next";
import generatedGraph from "@/generated/graph.json";
import type { describe } from "@/shared/modules/graph";
import { PageFrame, StatusLine, Grid, Card, Stack, Row, SelectList, UiTag, UiEmpty, UiCopy } from "@/shared/ui/public";

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
  <PageFrame title="功能地图">
    <template #status><StatusLine :items="[{ text: `${graph.length} 个业务模块` }, { text: `${total} 个操作` }, { text: '点左边的操作，右边看它依次做了什么' }]" /></template>
    <UiEmpty v-if="!items.length" title="还没有业务模块" hint="用 npm run new:module -- 包名 --title 中文名 创建第一个，创建后运行 npm run docs。" />
    <Grid v-else ratio="1:2">
      <Card title="操作" flush><div class="px-2 pb-2"><SelectList v-model="selected" label="操作列表" :items="items" /></div></Card>
      <Stack v-if="action && owner">
        <Card :title="action.title">
          <Stack gap="sm">
            <p class="text-fg-muted">用户在这些页面上会触发它：</p>
            <Row v-for="p in pages" :key="p.id"><b class="font-medium">{{ p.title }}</b><UiTag tone="code">{{ p.path }}</UiTag><span class="text-[13px] text-fg-faint">{{ p.file }}</span></Row>
            <p v-if="!pages.length" class="text-fg-faint">没有页面直接使用这个操作。</p>
            <p v-if="action.inputFields.length" class="text-fg-muted">需要用户或页面提供：{{ names(action.inputFields).join("、") }}</p>
          </Stack>
        </Card>
        <Card title="执行过程">
          <ol class="flex flex-col">
            <li v-for="(step, i) in action.steps" :key="step.id" class="flex flex-col">
              <div v-if="i" class="flex h-6 items-center pl-3 text-fg-faint"><ArrowDown class="size-4" /></div>
              <div class="rounded-lg border border-line bg-subtle p-4">
                <div class="mb-2 flex items-center gap-2"><span class="grid size-6 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-text">{{ i + 1 }}</span><b class="font-semibold">{{ step.title }}</b><UiTag v-if="step.rule" class="ml-auto">规则 {{ step.rule }}</UiTag></div>
                <dl class="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5">
                  <dt class="text-fg-faint">用到的数据</dt><dd>{{ names(step.reads).join("、") || "无" }}</dd>
                  <dt class="text-fg-faint">得到的数据</dt><dd>{{ names(step.writes).join("、") || "无" }}</dd>
                  <template v-if="step.uses.length"><dt class="text-fg-faint">调用的接口</dt><dd class="flex flex-wrap gap-1.5"><UiTag v-for="u in step.uses" :key="u" tone="code">{{ endpoint(u) }}</UiTag></dd></template>
                  <template v-if="step.when"><dt class="text-fg-faint">执行条件</dt><dd>{{ step.when.title }}</dd></template>
                  <dt class="text-fg-faint">代码位置</dt>
                  <dd class="flex items-center gap-2" v-if="step.source"><UiTag tone="code">{{ where(step.source) }}</UiTag><span class="text-fg-faint">{{ step.source.symbol }}</span>
                    <UiCopy :text="where(step.source)" :label="`复制 ${where(step.source)}`" /></dd>
                  <dd v-else class="text-warn">没有找到代码位置，请运行 npm run docs</dd>
                </dl>
              </div>
            </li>
          </ol>
        </Card>
      </Stack>
    </Grid>
  </PageFrame>
</template>
