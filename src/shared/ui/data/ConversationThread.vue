<script setup lang="ts">
/** 人员会话：保留换行，不解析 HTML。新消息仅在用户仍看底部时滚动，切换对象回到最新消息。 */
import { nextTick, ref, watch } from "vue";
const props = defineProps<{ threadId: string; messages: { id: string; direction: "incoming" | "outgoing"; text: string; time: string }[]; label: string }>();
const box = ref<HTMLElement>();
const pinned = ref(true);
function onScroll() { const el = box.value; if (el) pinned.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }
function scrollToLatest() { void nextTick(() => { if (pinned.value && box.value) box.value.scrollTop = box.value.scrollHeight; }); }
watch(() => props.threadId, () => { pinned.value = true; scrollToLatest(); }, { immediate: true });
watch(() => props.messages.map((message) => `${message.id}:${message.text.length}`).join(","), scrollToLatest);
</script>
<template>
  <div ref="box" role="log" :aria-label="label" aria-live="polite" tabindex="0" class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto py-6" @scroll="onScroll">
    <div v-for="message in messages" :key="message.id" class="flex flex-col gap-1.5" :class="message.direction === 'outgoing' ? 'items-end' : 'items-start'">
      <p class="max-w-[90%] rounded-lg px-4 py-3 whitespace-pre-wrap break-words leading-6 sm:max-w-[78%]" :class="message.direction === 'outgoing' ? 'bg-primary-soft text-fg' : 'bg-subtle text-fg'">{{ message.text }}</p>
      <p class="text-xs text-fg-faint tabular-nums">{{ message.direction === 'outgoing' ? '我' : label }} · <time>{{ message.time }}</time></p>
    </div>
  </div>
</template>
