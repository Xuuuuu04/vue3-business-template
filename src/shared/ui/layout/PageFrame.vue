<script setup lang="ts">
/**
 * 页面骨架：标题与操作、可选的标签页和状态行，然后是内容。
 * 标题下面不放说明文字；需要让人知道的状态放进 status 插槽。narrow 用于表单和详情，靠左对齐，与其他页面共用左边线。
 */
defineProps<{ title: string; narrow?: boolean }>();
</script>
<template>
  <section class="w-full animate-[rise_.4s_var(--ease)] px-(--page-px) pt-5 pb-16" :class="narrow ? 'max-w-4xl' : 'max-w-[1440px]'" :aria-label="title">
    <header class="mb-4 flex min-h-9 flex-wrap items-center gap-3">
      <h1 class="min-w-0 flex-1 truncate text-xl leading-7 font-semibold tracking-tight">{{ title }}</h1>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>
    <div v-if="$slots.tabs" class="mb-4"><slot name="tabs" /></div>
    <div v-if="$slots.status" class="mb-3"><slot name="status" /></div>
    <div class="flex flex-col gap-3"><slot /></div>
  </section>
</template>
