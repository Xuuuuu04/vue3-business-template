<script setup lang="ts">
/** 筛选条里的一个控件。宽度只有三档，让不同页面的筛选条看起来一致。 */
defineProps<{ size?: "sm" | "md" | "lg" }>();
</script>
<template><div class="min-w-0 max-sm:w-auto" :class="{ sm: 'w-36 max-sm:flex-[1_1_100px]', md: 'w-44 max-sm:flex-[1_1_140px]', lg: 'w-72 max-sm:flex-[1_1_180px]' }[size ?? 'md']"><slot /></div></template>
