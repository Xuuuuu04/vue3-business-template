<script setup lang="ts">
/** 状态行：来源是否齐备、业务日、汇总数量等一眼要看的事实，用竖线隔开。 */
defineProps<{ items: { text: string; tone?: "ok" | "warn" | "bad" | "neutral" }[] }>();
</script>
<template>
  <div class="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 text-help text-fg-muted">
    <template v-for="(item, i) in items" :key="i">
      <span v-if="i" class="h-3 w-px bg-line-strong" aria-hidden="true" />
      <span class="inline-flex items-center gap-1.5" :class="item.tone && item.tone !== 'neutral' && 'text-fg'">
        <span v-if="item.tone && item.tone !== 'neutral'" class="size-1.5 rounded-full" :class="{ ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }[item.tone]" aria-hidden="true" />
        {{ item.text }}
      </span>
    </template>
    <span class="flex-1" />
    <slot />
  </div>
</template>
