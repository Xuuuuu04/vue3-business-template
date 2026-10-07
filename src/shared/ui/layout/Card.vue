<script setup lang="ts">
/** 卡片：只用于需要独立浏览或操作的一组信息。表格用 flush 贴边。 */
defineProps<{ title?: string; flush?: boolean }>();
</script>
<template>
  <section
    class="min-w-0 rounded-lg border border-line bg-surface shadow-card"
    :aria-label="title"
  >
    <header
      v-if="title || $slots.actions"
      class="flex min-h-14 items-center gap-3 px-6 pt-5"
      :class="flush && 'pb-3'"
    >
      <h2 class="min-w-0 flex-1 truncate text-[17px] font-semibold">
        {{ title }}
      </h2>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? '' : 'p-6'"><slot /></div>
  </section>
</template>
