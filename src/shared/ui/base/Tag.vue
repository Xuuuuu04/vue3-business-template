<script setup lang="ts">
/** 小标签。tone 表示含义：状态用 ok/warn/bad，强调用 primary，编码用 code。 */
defineProps<{ tone?: "neutral" | "primary" | "ok" | "warn" | "bad" | "info" | "code"; dot?: boolean }>();
</script>
<template>
  <span
    class="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap"
    :class="{
      'bg-muted text-fg-muted': !tone || tone === 'neutral',
      'bg-primary-soft text-primary-text': tone === 'primary',
      'bg-ok-soft text-ok': tone === 'ok',
      'bg-warn-soft text-warn': tone === 'warn',
      'bg-bad-soft text-bad': tone === 'bad',
      'bg-info-soft text-info': tone === 'info',
      'bg-muted font-mono text-[11.5px] text-fg-muted': tone === 'code',
    }"
  >
    <span v-if="dot" class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    <slot />
  </span>
</template>
