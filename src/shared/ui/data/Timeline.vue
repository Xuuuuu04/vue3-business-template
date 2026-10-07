<script setup lang="ts">
/** 时间线：最新一条在最上面，用主色圆点标出。 */
defineProps<{ items: { title: string; time: string; note?: string }[] }>();
</script>
<template>
  <ol class="flex flex-col">
    <li v-for="(it, i) in items" :key="i" class="relative grid grid-cols-[14px_1fr_auto] gap-3 pb-4 last:pb-0">
      <span class="relative mt-[7px] size-[7px] rounded-full" :class="i === 0 ? 'bg-primary' : 'bg-line-strong'" />
      <span v-if="i < items.length - 1" class="absolute top-4 bottom-0 left-[3px] w-px bg-line" aria-hidden="true" />
      <div class="min-w-0"><p>{{ it.title }}</p><p v-if="it.note" class="text-help text-fg-faint">{{ it.note }}</p></div>
      <time class="text-help text-fg-faint tabular-nums">{{ it.time }}</time>
    </li>
  </ol>
</template>
