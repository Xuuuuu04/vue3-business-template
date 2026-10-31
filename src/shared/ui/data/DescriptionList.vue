<script setup lang="ts">
defineProps<{
  items: { label: string; value?: string; key?: string }[];
  columns?: 1 | 2;
}>();
</script>
<template>
  <dl
    class="grid gap-x-8 gap-y-4"
    :class="columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'"
  >
    <div
      v-for="it in items"
      :key="it.label"
      class="grid grid-cols-[104px_minmax(0,1fr)] gap-3"
    >
      <dt class="text-label leading-6 text-fg-muted">{{ it.label }}</dt>
      <dd class="min-w-0 break-words tabular-nums">
        <slot :name="`value-${it.key ?? it.label}`">{{ it.value ?? "—" }}</slot>
      </dd>
    </div>
  </dl>
</template>
