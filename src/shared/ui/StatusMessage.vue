<script setup lang="ts">
import { Loader2, CircleAlert } from "lucide-vue-next";
import type { TaskStatus } from "@/shared/state/task";
/** 动作状态提示：处理中显示一行进度；失败或结果未知显示可操作的提醒，补救按钮放默认插槽。 */
defineProps<{ status: TaskStatus; error?: string }>();
</script>
<template>
  <p v-if="status === 'loading'" class="flex items-center gap-2 text-fg-muted" role="status"><Loader2 class="size-4 animate-spin" />正在处理，请稍候…</p>
  <div v-else-if="status === 'error' || status === 'unknown'" class="flex flex-col items-start gap-2 rounded-lg border px-4 py-3" :class="status === 'unknown' ? 'border-warn/40 bg-warn-soft text-fg' : 'border-bad/40 bg-bad-soft text-fg'" role="alert">
    <p class="flex items-start gap-2"><CircleAlert class="mt-0.5 size-4 shrink-0" :class="status === 'unknown' ? 'text-warn' : 'text-bad'" /><span>{{ error }}</span></p>
    <slot />
  </div>
</template>
