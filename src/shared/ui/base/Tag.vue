<script setup lang="ts">
defineProps<{
  tone?: "neutral" | "primary" | "ok" | "warn" | "bad" | "info" | "code";
  dot?: boolean;
}>();
</script>
<template>
  <span
    class="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md border px-1.5 text-xs font-medium whitespace-nowrap"
    :class="{
      'border-line bg-surface text-fg-muted': !tone || tone === 'neutral',
      'border-transparent bg-primary-soft text-primary-text':
        tone === 'primary',
      'border-transparent bg-ok-soft text-ok': tone === 'ok',
      'border-transparent bg-warn-soft text-warn': tone === 'warn',
      'border-transparent bg-bad-soft text-bad': tone === 'bad',
      'border-transparent bg-info-soft text-info': tone === 'info',
      'border-line bg-subtle font-mono text-[12px] text-fg-muted':
        tone === 'code',
    }"
  >
    <span
      v-if="dot"
      class="size-1.5 rounded-full bg-current"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
