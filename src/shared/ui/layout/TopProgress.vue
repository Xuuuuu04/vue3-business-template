<script setup lang="ts">
import { ref, watch } from "vue";
/** 页面切换时顶部的细进度条：开始后缓慢推进，完成后补满并淡出。 */
const props = defineProps<{ active: boolean }>();
const width = ref(0);
const visible = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
watch(() => props.active, (on) => {
  clearInterval(timer);
  if (on) {
    visible.value = true; width.value = 8;
    timer = setInterval(() => (width.value += (90 - width.value) * 0.12), 120);
  } else if (visible.value) {
    width.value = 100;
    setTimeout(() => { visible.value = false; width.value = 0; }, 260);
  }
});
</script>
<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-[250] h-0.5" aria-hidden="true">
    <div class="h-full bg-primary transition-[width,opacity] duration-(--motion-normal) ease-out" :style="{ width: width + '%', opacity: visible ? 1 : 0 }" />
  </div>
</template>
