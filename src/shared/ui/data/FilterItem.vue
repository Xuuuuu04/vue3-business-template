<script setup lang="ts">
/** 筛选条里的一个控件。宽度只有三档，让不同页面的筛选条看起来一致。 */
defineProps<{ size?: "sm" | "md" | "lg" }>();
</script>
<template><div class="min-w-0" :class="{ sm: 'w-36', md: 'w-44', lg: 'w-72' }[size ?? 'md']"><slot /></div></template>
