<script setup lang="ts">
defineProps<{ title: string; hint?: string }>();
</script>
<template>
  <div class="flex flex-col items-center gap-1 px-6 py-12 text-center">
    <div
      v-if="$slots.icon"
      class="mb-2 grid size-11 place-items-center rounded-full bg-muted text-fg-faint"
    >
      <slot name="icon" />
    </div>
    <p class="font-semibold">{{ title }}</p>
    <p v-if="hint" class="text-fg-muted">{{ hint }}</p>
    <div v-if="$slots.default" class="mt-3 flex gap-2"><slot /></div>
  </div>
</template>
