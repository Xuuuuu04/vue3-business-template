<script setup lang="ts">
/** 竖向排列。gap 只有四档，保证任何组合的间距都协调。 */
defineProps<{ gap?: "xs" | "sm" | "md" | "lg"; align?: "start" | "center" | "end" | "stretch" }>();
</script>
<template>
  <div class="flex flex-col min-w-0" :class="[
    { xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }[gap ?? 'md'],
    { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align ?? 'stretch'],
  ]"><slot /></div>
</template>
