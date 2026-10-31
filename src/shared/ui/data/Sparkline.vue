<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ values: number[] }>();
const d = computed(() => {
  const mx = Math.max(...props.values),
    mn = Math.min(...props.values);
  return props.values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i * 100) / (props.values.length - 1)).toFixed(1)} ${(14 - ((v - mn) / (mx - mn || 1)) * 12 - 1).toFixed(1)}`,
    )
    .join(" ");
});
</script>
<template>
  <svg
    viewBox="0 0 100 14"
    preserveAspectRatio="none"
    class="h-4 w-20"
    aria-hidden="true"
  >
    <path
      :d="d"
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>
