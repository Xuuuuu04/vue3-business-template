<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { Sparkles } from "lucide-vue-next";
import Avatar from "../base/Avatar.vue";
import CopyButton from "../base/CopyButton.vue";
import Markdown from "./Markdown.vue";
/**
 * 对话：用户消息靠右，助手消息靠左带标识；助手回复按 Markdown 显示，可复制。
 * 新消息或流式输出时自动滚到底部；用户往上翻看时不打扰。每条助手消息下方的额外操作用 #actions 插槽。
 */
const props = defineProps<{ messages: { id: string; role: "user" | "assistant"; content: string; streaming?: boolean; error?: string }[]; userName?: string; assistantName?: string }>();
const box = ref<HTMLElement>();
const pinned = ref(true);
function onScroll() { const el = box.value!; pinned.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }
watch(() => props.messages.map((m) => m.content.length).join(","), () => nextTick(() => { if (pinned.value && box.value) box.value.scrollTop = box.value.scrollHeight; }));
</script>
<template>
  <div ref="box" class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-1 py-4" role="log" aria-live="polite" @scroll="onScroll">
    <template v-for="m in messages" :key="m.id">
      <div v-if="m.role === 'user'" class="flex justify-end gap-3">
        <div class="max-w-[75%] rounded-xl bg-subtle px-4 py-2.5 whitespace-pre-wrap">{{ m.content }}</div>
        <Avatar :name="userName ?? '我'" size="md" />
      </div>
      <div v-else class="group flex gap-3">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-ink"><Sparkles class="size-4" /></span>
        <div class="min-w-0 flex-1 pt-1">
          <p class="mb-1 text-[13px] font-medium text-fg-muted">{{ assistantName ?? "助手" }}</p>
          <Markdown :text="m.content" :streaming="m.streaming" />
          <p v-if="m.error" class="mt-2 rounded-md bg-bad-soft px-3 py-2 text-[13px] text-bad" role="alert">{{ m.error }}</p>
          <div v-if="!m.streaming && m.content" class="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><CopyButton :text="m.content" label="复制回答" /><slot name="actions" :message="m" /></div>
        </div>
      </div>
    </template>
  </div>
</template>
