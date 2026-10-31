<script setup lang="ts">
defineProps<{
  items: {
    label: string;
    value?: string;
    key?: string;
    unit?: string;
    tone?: "ok" | "warn" | "bad";
  }[];
}>();
</script>
<template>
  <dl class="summary-band">
    <div
      v-for="(it, i) in items"
      :key="it.label"
      class="summary-item"
      :class="{ 'is-lead': i === 0 }"
    >
      <dt>{{ it.label }}</dt>
      <dd :class="it.tone && `text-${it.tone}`">
        <slot :name="`value-${it.key ?? it.label}`"
          >{{ it.value ?? "—"
          }}<small v-if="it.unit">{{ it.unit }}</small></slot
        >
      </dd>
    </div>
  </dl>
</template>
