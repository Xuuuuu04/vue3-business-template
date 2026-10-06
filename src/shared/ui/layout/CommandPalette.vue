<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from "vue";
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from "reka-ui";
import { CornerDownLeft, Search } from "lucide-vue-next";
/**
 * 全局搜索（⌘K / Ctrl+K）：输入关键词跳到页面或执行操作。
 * 条目由应用传入；上下键选择，回车执行，Esc 关闭。
 */
const open = defineModel<boolean>("open", { default: false });
const props = defineProps<{ commands: { id: string; label: string; group: string; icon?: Component; hint?: string; run: () => void }[] }>();
const query = ref("");
const index = ref(0);
const input = ref<HTMLInputElement>();
const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.commands.filter((c) => !q || c.label.toLowerCase().includes(q) || (c.hint ?? "").toLowerCase().includes(q));
});
watch(open, (o) => { if (o) { query.value = ""; index.value = 0; void nextTick(() => input.value?.focus()); } });
watch(shown, () => (index.value = 0));
function run(c: { id: string; label: string; group: string; icon?: Component; hint?: string; run: () => void }) { open.value = false; void nextTick(() => c.run()); }
function key(e: KeyboardEvent) {
  if (e.key === "ArrowDown") { e.preventDefault(); index.value = Math.min(shown.value.length - 1, index.value + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); index.value = Math.max(0, index.value - 1); }
  else if (e.key === "Enter" && shown.value[index.value]) { e.preventDefault(); run(shown.value[index.value]!); }
}
</script>
<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-(--overlay) data-[state=open]:animate-[fade_.15s_ease-out]" />
      <DialogContent class="fixed top-[16vh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop outline-none data-[state=open]:animate-[pop_.16s_var(--ease)]" @open-auto-focus.prevent>
        <DialogTitle class="sr-only">全局搜索</DialogTitle>
        <DialogDescription class="sr-only">输入关键词，用上下键选择，回车执行</DialogDescription>
        <div class="flex items-center gap-3 border-b border-line px-4"><Search class="size-[18px] text-fg-faint" />
          <input ref="input" v-model="query" class="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-faint" placeholder="搜索页面和操作…" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-label="搜索页面和操作" @keydown="key" />
          <kbd class="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-fg-faint">Esc</kbd></div>
        <ul id="cmd-list" role="listbox" class="max-h-[50vh] overflow-auto p-1.5">
          <li v-if="!shown.length" class="px-3 py-8 text-center text-fg-muted">没有找到“{{ query }}”</li>
          <template v-for="(c, i) in shown" :key="c.id">
            <li v-if="c.group !== shown[i - 1]?.group" class="px-3 pt-2.5 pb-1 text-xs font-semibold text-fg-faint" role="presentation">{{ c.group }}</li>
            <li role="option" :aria-selected="i === index" class="flex h-10 cursor-pointer items-center gap-3 rounded-md px-3" :class="i === index && 'bg-primary-soft text-primary-text'" @mousemove="index = i" @click="run(c)">
              <component :is="c.icon" v-if="c.icon" class="size-4 shrink-0" :class="i === index ? '' : 'text-fg-faint'" /><span class="flex-1 truncate">{{ c.label }}</span>
              <span v-if="c.hint && i !== index" class="text-xs text-fg-faint">{{ c.hint }}</span><CornerDownLeft v-if="i === index" class="size-3.5" />
            </li>
          </template>
        </ul>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
