<script setup lang="ts">
/** 键值对列表：详情页、抽屉里展示一个对象的字段。值不是文字时给条目一个 key，用 #value-key 插槽自定义。 */
defineProps<{ items: { label: string; value?: string; key?: string }[]; columns?: 1 | 2 }>();
</script>
<template>
  <dl class="grid gap-x-8 gap-y-3" :class="columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'">
    <div v-for="it in items" :key="it.label" class="grid grid-cols-[96px_1fr] gap-3">
      <dt class="text-fg-faint">{{ it.label }}</dt>
      <dd class="min-w-0 break-words tabular-nums"><slot :name="`value-${it.key ?? it.label}`">{{ it.value ?? "—" }}</slot></dd>
    </div>
  </dl>
</template>
