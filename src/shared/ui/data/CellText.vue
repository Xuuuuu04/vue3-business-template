<script setup lang="ts">
/** 两行单元格：上面是主文字，下面是辅助信息（门店、编码标签等放默认插槽）。 */
defineProps<{ title: string }>();
</script>
<template>
  <div class="flex min-w-0 flex-col gap-0.5">
    <span class="truncate font-medium">{{ title }}</span>
    <span v-if="$slots.default" class="flex flex-wrap items-center gap-1.5 text-xs text-fg-faint"><slot /></span>
  </div>
</template>
