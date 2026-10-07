<script setup lang="ts">
import { CircleCheck, CircleAlert, Info } from "lucide-vue-next";
import { toastItems } from "../lib/toast";
</script>
<template>
  <div class="pointer-events-none fixed top-4 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite" role="status">
    <TransitionGroup enter-from-class="opacity-0 -translate-y-3" enter-active-class="transition duration-(--motion-panel) ease-(--ease)" leave-to-class="opacity-0 -translate-y-2" leave-active-class="transition duration-(--motion-normal)">
      <div v-for="t in toastItems" :key="t.id" class="pointer-events-auto flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 font-medium popup-surface">
        <CircleCheck v-if="t.tone === 'ok'" class="size-4 text-ok" />
        <CircleAlert v-else-if="t.tone === 'bad'" class="size-4 text-bad" />
        <Info v-else class="size-4 text-info" />
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
