<script setup lang="ts">
/** 横向条形排名：名称、条、数值三列，条的长度按最大值比例，进入时从左长出。 */
import { computed } from "vue";
const props = defineProps<{ items: { label: string; value: number; text?: string }[] }>();
const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)));
</script>
<template>
  <ol class="flex flex-col gap-3">
    <li v-for="(it, i) in items" :key="it.label" class="grid grid-cols-[20px_1fr_auto] items-center gap-x-2.5 gap-y-1.5">
      <span class="text-fg-faint tabular-nums">{{ i + 1 }}</span>
      <span class="truncate">{{ it.label }}</span>
      <span class="text-fg-muted tabular-nums">{{ it.text ?? it.value.toLocaleString("zh-CN") }}</span>
      <span class="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-muted"><span class="block h-full rounded-full bg-primary" :style="{ width: `${(it.value / max) * 100}%` }" /></span>
    </li>
  </ol>
</template>
