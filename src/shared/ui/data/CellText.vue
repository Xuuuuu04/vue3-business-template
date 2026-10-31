<script setup lang="ts">
defineProps<{ title: string }>();
</script>
<template>
  <div class="flex min-w-0 flex-col gap-0.5">
    <span class="truncate font-medium">{{ title }}</span>
    <span
      v-if="$slots.default"
      class="flex flex-wrap items-center gap-1.5 text-xs text-fg-faint"
      ><slot
    /></span>
  </div>
</template>
