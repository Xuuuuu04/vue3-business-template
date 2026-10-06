<script setup lang="ts">
/** 横向排列，放不下自动换行。between 把第一组放左、最后一组放右。 */
defineProps<{ gap?: "xs" | "sm" | "md" | "lg"; justify?: "start" | "between" | "end" | "center"; align?: "start" | "center" | "end" | "baseline"; nowrap?: boolean }>();
</script>
<template>
  <div class="flex min-w-0" :class="[
    nowrap ? 'flex-nowrap' : 'flex-wrap',
    { xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-6' }[gap ?? 'sm'],
    { start: 'justify-start', between: 'justify-between', end: 'justify-end', center: 'justify-center' }[justify ?? 'start'],
    { start: 'items-start', center: 'items-center', end: 'items-end', baseline: 'items-baseline' }[align ?? 'center'],
  ]"><slot /></div>
</template>
