<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { ArrowUp, Square } from "lucide-vue-next";
/**
 * 提问输入框：随内容长高；回车发送，Shift+回车换行，输入法组字时不发送。
 * 生成中按钮变成“停止”。左下角放附件、模型选择等（#tools 插槽）。
 */
const model = defineModel<string>({ default: "" });
const props = defineProps<{ busy?: boolean; placeholder?: string; disabled?: boolean }>();
const emit = defineEmits<{ send: [text: string]; stop: [] }>();
const el = ref<HTMLTextAreaElement>();
function fit() { if (!el.value) return; el.value.style.height = "auto"; el.value.style.height = Math.min(el.value.scrollHeight, 200) + "px"; }
watch(model, () => nextTick(fit));
function send() { const t = model.value.trim(); if (!t || props.busy || props.disabled) return; emit("send", t); model.value = ""; }
function key(e: KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } }
</script>
<template>
  <div class="rounded-xl border border-line bg-surface p-2 shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_2px_var(--ring)]">
    <textarea ref="el" v-model="model" rows="1" :placeholder="placeholder ?? '输入问题，回车发送，Shift+回车换行'" :disabled="disabled" aria-label="输入问题" class="block max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5 leading-relaxed outline-none placeholder:text-fg-faint" @keydown="key" />
    <div class="flex items-center gap-1 pt-1">
      <slot name="tools" />
      <span class="flex-1" />
      <button v-if="busy" type="button" class="grid size-8 place-items-center rounded-lg bg-fg text-surface transition-opacity hover:opacity-85" aria-label="停止生成" @click="emit('stop')"><Square class="size-3.5 fill-current" /></button>
      <button v-else type="button" class="grid size-8 place-items-center rounded-lg bg-primary text-primary-ink transition-opacity hover:opacity-90 disabled:opacity-35" :disabled="!model.trim() || disabled" aria-label="发送" @click="send"><ArrowUp class="size-4" :stroke-width="2.5" /></button>
    </div>
  </div>
</template>
