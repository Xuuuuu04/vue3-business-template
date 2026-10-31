<script setup lang="ts">
defineProps<{ size?: "sm" | "md" | "lg" }>();
</script>
<template>
  <div
    class="min-w-0 max-sm:w-auto"
    :class="
      {
        sm: 'w-36 max-sm:flex-[1_1_100px]',
        md: 'w-44 max-sm:flex-[1_1_140px]',
        lg: 'w-72 max-sm:flex-[1_1_180px]',
      }[size ?? 'md']
    "
  >
    <slot />
  </div>
</template>
