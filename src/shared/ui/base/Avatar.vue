<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
}>();
const px = computed(
  () => ({ xs: 20, sm: 24, md: 32, lg: 40 })[props.size ?? "md"],
);
</script>
<template>
  <span
    class="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-medium text-fg ring-2 ring-surface"
    :style="{
      width: px + 'px',
      height: px + 'px',
      fontSize: Math.max(12, Math.round(px * 0.42)) + 'px',
    }"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" class="size-full object-cover" />
    <template v-else>{{ name.slice(0, 1) }}</template>
  </span>
</template>
