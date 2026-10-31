<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { Copy, Check } from "lucide-vue-next";
import Tip from "./Tip.vue";
import { useToast } from "../lib/toast";
const props = defineProps<{ text: string; label?: string }>();
const done = ref(false);
const copying = ref(false);
const toast = useToast();
let timer: ReturnType<typeof setTimeout> | undefined;
let active = true;
async function copy() {
  if (copying.value) return;
  copying.value = true;
  done.value = false;
  clearTimeout(timer);
  try {
    await navigator.clipboard.writeText(props.text);
    if (!active) return;
    done.value = true;
    timer = setTimeout(() => (done.value = false), 1500);
  } catch {
    if (active) toast.error("复制失败，请选择文字后手动复制。");
  } finally {
    if (active) copying.value = false;
  }
}
onBeforeUnmount(() => {
  active = false;
  clearTimeout(timer);
});
</script>
<template>
  <Tip :text="done ? '已复制' : (label ?? '复制')">
    <button
      type="button"
      class="grid size-7 shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-muted hover:text-fg"
      :aria-label="label ?? '复制'"
      :disabled="copying"
      @click.stop="copy"
    >
      <Check v-if="done" class="size-3.5 text-ok" /><Copy
        v-else
        class="size-3.5"
      />
    </button>
    <span class="sr-only" role="status">{{ done ? "已复制" : "" }}</span>
  </Tip>
</template>
