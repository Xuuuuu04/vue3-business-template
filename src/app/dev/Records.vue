<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Download, History } from "lucide-vue-next";
import { useRecords } from "@/shared/records/store";
import { endpointLabel } from "./endpoint";
import { PageFrame, StatusLine, DataTable, FilterItem, UiTag, UiButton, UiDrawer, UiEmpty, UiSegmented, UiSearchInput, UiCopy, DescriptionList, StatusMessage, Stack, type DataColumn } from "@/shared/ui/public";

const router = useRouter();
const { items, dropped } = useRecords();
const open = ref(false);
const pickedId = ref("");
const picked = computed(() => items.value.find((r) => r.id === pickedId.value));
const tone = { running: "info", ok: "ok", failed: "bad", cancelled: "neutral", unknown: "warn", skipped: "neutral" } as const;
const label = { running: "进行中", ok: "成功", failed: "失败", cancelled: "已取消", unknown: "结果未确认", skipped: "已跳过" } as const;
const ms = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("zh-CN", { hour12: false });
const show = ref<string>("all");
const query = ref("");
const rows = computed(() => items.value.filter((r) => (show.value === "all" || r.status === show.value) && (!query.value || r.title.includes(query.value))).map((r) => ({ ...r, requests: r.steps.reduce((n, s) => n + s.requests.length, 0), stepCount: r.steps.length })));
const columns: DataColumn[] = [
  { key: "started", title: "时间", width: 110 },
  { key: "title", title: "操作", minWidth: 200 },
  { key: "status", title: "结果", width: 130 },
  { key: "elapsed", title: "耗时", kind: "number", width: 110, sortable: true },
  { key: "stepCount", title: "步骤", kind: "number", width: 80 },
  { key: "requests", title: "接口请求", kind: "number", width: 100 },
  { key: "view", title: "", align: "right", width: 90 },
];
function show2(id: string) { pickedId.value = id; open.value = true; }
const facts = computed(() => picked.value ? [
  { label: "开始时间", value: clock(picked.value.started) },
  { label: "总耗时", value: ms(picked.value.elapsed) },
  { label: "运行编号", value: picked.value.id },
  { label: "代码版本", value: picked.value.codeVersion.slice(0, 12) },
] : []);
function exportRuns() {
  const blob = new Blob([JSON.stringify({ removed: dropped(), runs: items.value }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "操作记录.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
</script>
<template>
  <PageFrame title="操作记录" workspace>
    <template #actions><UiButton :disabled="!items.length" @click="exportRuns"><Download class="size-4" />导出记录</UiButton></template>
    <template #status><StatusLine :items="[{ text: `最近 ${items.length} 次操作` }, { text: '最多保留 100 次，刷新页面后清空' }, ...(dropped() ? [{ text: `已移除较早的 ${dropped()} 次`, tone: 'warn' as const }] : [])]" /></template>
    <DataTable fill flat :columns="columns" :rows="rows" row-key="id" :settings="false" :fullscreenable="false" row-clickable @row-click="(r) => show2(r.id)">
      <template #search><FilterItem size="lg"><UiSearchInput v-model="query" placeholder="按操作名查找" /></FilterItem><UiSegmented v-model="show" size="sm" aria-label="按结果筛选" :options="[{ value: 'all', label: '全部' }, { value: 'failed', label: '失败' }, { value: 'unknown', label: '结果未确认' }]" /></template>
      <template #cell-started="{ row }"><span class="text-fg-muted tabular-nums">{{ clock(row.started) }}</span></template>
      <template #cell-status="{ row }"><UiTag :tone="tone[row.status as keyof typeof tone]" dot>{{ label[row.status as keyof typeof label] }}</UiTag></template>
      <template #cell-elapsed="{ row }">{{ ms(row.elapsed) }}</template>
      <template #cell-view="{ row }"><UiButton variant="link" @click="show2(row.id)">查看过程</UiButton></template>
      <template #empty><UiEmpty title="还没有操作记录" hint="去产品页面做一次操作，比如打开文件列表，这里就会出现。"><template #icon><History class="size-5" /></template><UiButton variant="primary" @click="router.push('/')">去产品页面</UiButton></UiEmpty></template>
    </DataTable>
    <UiDrawer v-model:open="open" :title="picked?.title ?? '操作过程'" width="lg">
      <Stack v-if="picked" gap="lg">
        <StatusMessage v-if="picked.error" status="error" :error="picked.error" />
        <DescriptionList :items="facts" />
        <div>
          <h3 class="mb-3 text-[13px] font-semibold text-fg-muted">执行过程</h3>
          <ol class="flex flex-col gap-3">
            <li v-for="(s, i) in picked.steps" :key="s.id" class="border-b border-line py-4 last:border-0">
              <div class="flex items-center gap-2"><span class="grid size-5 place-items-center rounded-full bg-muted text-xs text-fg-muted">{{ i + 1 }}</span><b class="font-medium">{{ s.title }}</b><UiTag class="ml-auto" :tone="tone[s.status]" dot>{{ label[s.status] }}</UiTag><span class="text-fg-muted tabular-nums">{{ ms(s.elapsed) }}</span></div>
              <p v-if="s.error" class="mt-2 text-bad">{{ s.error }}</p>
              <p v-for="o in s.outputs" :key="o" class="mt-1.5 text-[13px] text-fg-muted">{{ o }}</p>
              <ul v-if="s.requests.length" class="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
                <li v-for="(r, k) in s.requests" :key="k" class="text-[13px]">
                  <span class="flex flex-wrap items-center gap-2"><UiTag tone="code">{{ endpointLabel(r.endpoint, r.method) }}</UiTag><span :class="r.outcome === 'ok' ? 'text-ok' : 'text-bad'">{{ r.status ?? r.outcome }}</span><span class="text-fg-muted tabular-nums">{{ ms(r.elapsed) }}</span></span>
                  <span class="mt-1 flex flex-wrap items-center gap-x-1 text-fg-faint">请求编号：{{ r.requestId || "无" }}<UiCopy v-if="r.requestId" :text="r.requestId" label="复制请求编号" />· 后台运行编号：{{ r.backendRun || "后台没有返回（演示服务不会编造）" }}<UiCopy v-if="r.backendRun" :text="r.backendRun" label="复制后台运行编号" /></span>
                </li>
              </ul>
            </li>
          </ol>
        </div>
        <p v-for="g in picked.gaps" :key="g" class="text-[13px] text-warn">{{ g }}</p>
      </Stack>
    </UiDrawer>
  </PageFrame>
</template>
