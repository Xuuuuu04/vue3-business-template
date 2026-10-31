<script setup lang="ts">
defineProps<{
  cols?: 1 | 2 | 3 | 4;
  ratio?: "2:1" | "3:2" | "1:2" | "3:1";
  gap?: "sm" | "md" | "lg";
}>();
</script>
<template>
  <div
    class="grid min-w-0 grid-cols-1"
    :class="[
      !ratio && 'items-start',
      { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }[gap ?? 'md'],
      ratio
        ? {
            '2:1': 'lg:grid-cols-[2fr_1fr]',
            '3:2': 'lg:grid-cols-[3fr_2fr]',
            '1:2': 'lg:grid-cols-[1fr_2fr]',
            '3:1': 'lg:grid-cols-[3fr_1fr]',
          }[ratio]
        : {
            1: '',
            2: 'md:grid-cols-2',
            3: 'md:grid-cols-2 xl:grid-cols-3',
            4: 'md:grid-cols-2 xl:grid-cols-4',
          }[cols ?? 1],
    ]"
  >
    <slot />
  </div>
</template>
