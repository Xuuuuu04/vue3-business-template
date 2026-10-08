<script setup lang="ts">
/**
 * 详情摘要带：放在详情主区最上方，一行列出这个对象最要紧的 2–5 个事实。
 * 第一项是本页重点（金额、状态或得分），字号最大；其余是谁、何时、在哪一步。值不是文字时用 #value-key 插槽。
 */
defineProps<{ items: { label: string; value?: string; key?: string; unit?: string; tone?: "ok" | "warn" | "bad" }[] }>();
</script>
<template>
  <dl class="summary-band">
    <div v-for="(it, i) in items" :key="it.label" class="summary-item" :class="{ 'is-lead': i === 0 }">
      <dt>{{ it.label }}</dt>
      <dd :class="it.tone && `text-${it.tone}`"><slot :name="`value-${it.key ?? it.label}`">{{ it.value ?? "—" }}<small v-if="it.unit">{{ it.unit }}</small></slot></dd>
    </div>
  </dl>
</template>
