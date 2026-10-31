<script setup lang="ts">
defineProps<{ width?: string; height?: string }>();
</script>
<template>
  <span
    class="block rounded-md bg-[linear-gradient(90deg,var(--muted)_25%,var(--line)_37%,var(--muted)_63%)] bg-[length:400%_100%] animate-[shimmer_1.3s_infinite]"
    :style="{ width: width ?? '100%', height: height ?? '12px' }"
    aria-hidden="true"
  />
</template>
