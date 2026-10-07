<script setup lang="ts">
/** 卡片仅用于组件目录展示；业务页面使用 WorkArea 或 DataTable。flush 用于目录里的贴边示例。 */
defineProps<{ title?: string; flush?: boolean }>();
</script>
<template>
  <section
    class="min-w-0 rounded-lg border border-line bg-surface"
    :aria-label="title"
  >
    <header
      v-if="title || $slots.actions"
      class="flex min-h-14 items-center gap-3 px-6 pt-5"
      :class="flush && 'pb-3'"
    >
      <h2 class="min-w-0 flex-1 truncate text-[16px] font-medium">
        {{ title }}
      </h2>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? '' : 'p-6'"><slot /></div>
  </section>
</template>
