<script setup lang="ts">
import { Search, X } from "lucide-vue-next";
import Button from "../base/Button.vue";
/**
 * 筛选条：控件放默认插槽，同一行排开；“查询”“复原”固定在最右。
 * 已生效的条件显示为可单独移除的标签，避免用户忘了自己筛过什么。
 */
defineProps<{ applied?: { key: string; label: string }[]; loading?: boolean }>();
const emit = defineEmits<{ query: []; reset: []; remove: [key: string] }>();
</script>
<template>
  <form class="flex flex-col gap-2" role="search" @submit.prevent="emit('query')">
    <div class="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3 shadow-card">
      <slot />
      <span class="flex-1" />
      <Button variant="ghost" @click="emit('reset')">复原</Button>
      <Button type="submit" variant="primary" :loading="loading"><Search class="size-4" />查询</Button>
    </div>
    <div v-if="applied?.length" class="flex flex-wrap gap-1.5">
      <span v-for="a in applied" :key="a.key" class="inline-flex h-6 items-center gap-1 rounded-full border border-primary-line bg-primary-soft pr-1 pl-2.5 text-[13px] text-primary-text">
        {{ a.label }}
        <button type="button" class="grid size-4 place-items-center rounded-full hover:bg-primary-soft-hover" :aria-label="`移除条件：${a.label}`" @click="emit('remove', a.key)"><X class="size-3" /></button>
      </span>
    </div>
  </form>
</template>
