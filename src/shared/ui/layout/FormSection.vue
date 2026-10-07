<script setup lang="ts">
/** 表单默认左右分组；详情用 stacked 让标题在上方、内容使用整行。相邻区块用分隔线。 */
defineProps<{ title: string; text?: string; layout?: "split" | "stacked" }>();
</script>
<template>
  <section class="grid gap-4 border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0" :class="layout !== 'stacked' && 'md:grid-cols-[minmax(160px,1fr)_2fr] md:gap-8'">
    <div><h3 class="font-medium leading-6">{{ title }}</h3><p v-if="text" class="mt-1 text-help text-fg-muted">{{ text }}</p></div>
    <div class="flex min-w-0 flex-col gap-4"><slot /></div>
  </section>
</template>
