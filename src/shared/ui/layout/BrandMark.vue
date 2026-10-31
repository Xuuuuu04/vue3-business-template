<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  name: string;
  mark?: string;
  logo?: string;
  size?: "sm" | "md" | "lg" | "xl";
  wordmark?: boolean;
  inverse?: boolean;
}>();
const px = computed(
  () => ({ sm: 28, md: 32, lg: 48, xl: 64 })[props.size ?? "md"],
);
const letter = computed(() => props.mark ?? props.name.slice(0, 1));
</script>
<template>
  <span class="inline-flex items-center gap-2.5" :aria-label="name" role="img">
    <img
      v-if="logo"
      :src="logo"
      :alt="name"
      :style="{ height: px + 'px', width: 'auto', maxWidth: px * 3 + 'px' }"
      class="shrink-0 object-contain"
    />
    <span
      v-else
      class="brand-tile grid shrink-0 place-items-center font-semibold"
      :class="inverse && 'is-inverse'"
      :style="{
        width: px + 'px',
        height: px + 'px',
        borderRadius: Math.round(px * 0.3) + 'px',
        fontSize: Math.round(px * 0.5) + 'px',
      }"
      ><span>{{ letter }}</span></span
    >
    <span
      v-if="wordmark"
      class="truncate font-semibold tracking-[-0.02em]"
      :style="{ fontSize: Math.round(px * 0.5) + 'px' }"
      >{{ name }}</span
    >
  </span>
</template>
