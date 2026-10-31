<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{ active: boolean }>();
const width = ref(0);
const visible = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
let finishTimer: ReturnType<typeof setTimeout> | undefined;
function clearTimers() {
  clearInterval(timer);
  clearTimeout(finishTimer);
  timer = undefined;
  finishTimer = undefined;
}
watch(
  () => props.active,
  (on) => {
    clearTimers();
    if (on) {
      visible.value = true;
      width.value = 8;
      timer = setInterval(
        () => (width.value += (90 - width.value) * 0.12),
        120,
      );
    } else if (visible.value) {
      width.value = 100;
      finishTimer = setTimeout(() => {
        visible.value = false;
        width.value = 0;
      }, 260);
    }
  },
  { immediate: true },
);
onBeforeUnmount(clearTimers);
</script>
<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[250] h-0.5"
    aria-hidden="true"
  >
    <div
      class="h-full bg-primary transition-[width,opacity] duration-(--motion-normal) ease-out"
      :style="{ width: width + '%', opacity: visible ? 1 : 0 }"
    />
  </div>
</template>
