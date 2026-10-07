<script setup lang="ts">
/** 竖向排列。相邻分隔区块用 none，由区块内部留白；普通内容使用四档间距。 */
defineProps<{ gap?: "none" | "xs" | "sm" | "md" | "lg"; align?: "start" | "center" | "end" | "stretch" }>();
</script>
<template>
  <div class="flex flex-col min-w-0" :class="[
    { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }[gap ?? 'md'],
    { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align ?? 'stretch'],
  ]"><slot /></div>
</template>
