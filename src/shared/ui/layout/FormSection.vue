<script setup lang="ts">
/** 设置类表单的一节：左边标题和说明，右边控件；多节之间用分隔线。窄屏变成上下排列。 */
defineProps<{ title: string; text?: string }>();
</script>
<template>
  <section class="grid gap-4 border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(160px,1fr)_2fr] md:gap-8">
    <div><h3 class="font-medium leading-6">{{ title }}</h3><p v-if="text" class="mt-1 text-help text-fg-muted">{{ text }}</p></div>
    <div class="flex min-w-0 flex-col gap-4"><slot /></div>
  </section>
</template>
