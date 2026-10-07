<script setup lang="ts">
import { computed } from "vue";
import { CircleCheck, CircleX, CircleHelp, CircleDashed, Loader2, CircleMinus } from "lucide-vue-next";
import Progress from "../base/Progress.vue";
/** 批量执行的进度与逐项结果；配合 shared/public 的 useBatch 使用。 */
const props = defineProps<{ items: { key: string; label: string; status: string; error?: string }[]; verb?: string }>();
const done = computed(() => props.items.filter((i) => !["waiting", "running"].includes(i.status)).length);
const count = (s: string) => props.items.filter((i) => i.status === s).length;
</script>
<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between text-help"><span class="font-medium tabular-nums">{{ done }} / {{ items.length }}</span>
      <span class="flex gap-3 text-fg-muted"><span v-if="count('ok')" class="text-ok">{{ verb ?? "完成" }} {{ count("ok") }}</span><span v-if="count('failed')" class="text-bad">失败 {{ count("failed") }}</span><span v-if="count('unknown')" class="text-warn">未确认 {{ count("unknown") }}</span><span v-if="count('skipped')">未执行 {{ count("skipped") }}</span></span></div>
    <Progress :value="done" :max="items.length" :tone="count('unknown') ? 'warn' : count('failed') ? 'bad' : 'primary'" label="批量进度" />
    <ul class="max-h-64 overflow-auto rounded-lg border border-line">
      <li v-for="it in items" :key="it.key" class="flex items-start gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
        <Loader2 v-if="it.status === 'running'" class="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
        <CircleCheck v-else-if="it.status === 'ok'" class="mt-0.5 size-4 shrink-0 text-ok" />
        <CircleX v-else-if="it.status === 'failed'" class="mt-0.5 size-4 shrink-0 text-bad" />
        <CircleHelp v-else-if="it.status === 'unknown'" class="mt-0.5 size-4 shrink-0 text-warn" />
        <CircleMinus v-else-if="it.status === 'skipped'" class="mt-0.5 size-4 shrink-0 text-fg-faint" />
        <CircleDashed v-else class="mt-0.5 size-4 shrink-0 text-fg-faint" />
        <span class="min-w-0 flex-1"><span class="block truncate">{{ it.label }}</span><span v-if="it.error" class="block text-help text-fg-muted">{{ it.error }}</span><span v-else-if="it.status === 'skipped'" class="block text-help text-fg-faint">前一项结果未确认，已停止</span></span>
      </li>
    </ul>
  </div>
</template>
