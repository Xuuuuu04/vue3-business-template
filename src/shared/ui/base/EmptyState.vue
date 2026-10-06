<script setup lang="ts">
/** 空状态：说明为什么没有内容，并给出能继续的下一步（放在默认插槽）。 */
defineProps<{ title: string; hint?: string }>();
</script>
<template>
  <div class="flex flex-col items-center gap-1 px-6 py-12 text-center">
    <div v-if="$slots.icon" class="mb-2 grid size-11 place-items-center rounded-full bg-muted text-fg-faint"><slot name="icon" /></div>
    <p class="font-semibold">{{ title }}</p>
    <p v-if="hint" class="text-fg-muted">{{ hint }}</p>
    <div v-if="$slots.default" class="mt-3 flex gap-2"><slot /></div>
  </div>
</template>
