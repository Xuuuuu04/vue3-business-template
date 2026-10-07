<script setup lang="ts">
/** 单一任务的内容区。表单限制行宽，预览和列表使用全部可用空间；不形成独立卡片。 */
defineProps<{ form?: boolean; fill?: boolean }>();
</script>
<template>
  <div
    class="work-area"
    :class="{ 'work-area-form': form, 'work-area-fill': fill }"
  >
    <slot />
  </div>
</template>
