<script setup lang="ts">
/** 选择列表：左边选一项，右边看详情（主从布局）。分组标题用 group 字段。 */
const model = defineModel<string>({ required: true });
defineProps<{ items: { value: string; label: string; hint?: string; group?: string }[]; label: string }>();
</script>
<template>
  <nav class="flex flex-col gap-0.5" :aria-label="label">
    <template v-for="(it, i) in items" :key="it.value">
      <p v-if="it.group && it.group !== items[i - 1]?.group" class="px-3 pt-3 pb-1 text-xs font-semibold text-fg-faint first:pt-1">{{ it.group }}</p>
      <button type="button" class="flex min-h-9 flex-col items-start justify-center rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted" :class="model === it.value && 'bg-primary-soft font-medium text-fg'" :aria-current="model === it.value ? 'true' : undefined" @click="model = it.value">
        <span>{{ it.label }}</span>
        <span v-if="it.hint" class="text-xs font-normal text-fg-faint">{{ it.hint }}</span>
      </button>
    </template>
  </nav>
</template>
