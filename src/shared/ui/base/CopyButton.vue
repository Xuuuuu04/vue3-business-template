<script setup lang="ts">
import { ref } from "vue";
import { Copy, Check } from "lucide-vue-next";
import Tip from "./Tip.vue";
/** 复制按钮：点一下复制 text，图标变成对勾 1.5 秒。 */
const props = defineProps<{ text: string; label?: string }>();
const done = ref(false);
async function copy() {
  try { await navigator.clipboard.writeText(props.text); done.value = true; setTimeout(() => (done.value = false), 1500); } catch { /* 浏览器不允许时不提示成功 */ }
}
</script>
<template>
  <Tip :text="done ? '已复制' : (label ?? '复制')">
    <button type="button" class="grid size-7 shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-muted hover:text-fg" :aria-label="label ?? '复制'" @click.stop="copy">
      <Check v-if="done" class="size-3.5 text-ok" /><Copy v-else class="size-3.5" />
    </button>
  </Tip>
</template>
