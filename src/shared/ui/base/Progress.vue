<script setup lang="ts">
import { computed } from "vue";
/** 进度条：value 为 0–max；tone 表示含义；不给 value 时显示来回移动的不确定进度。 */
const props = defineProps<{ value?: number; max?: number; tone?: "primary" | "ok" | "warn" | "bad"; label?: string; size?: "sm" | "md" }>();
const pct = computed(() => (props.value === undefined ? undefined : Math.max(0, Math.min(100, (props.value / (props.max ?? 100)) * 100))));
</script>
<template>
  <div class="w-full overflow-hidden rounded-full bg-muted" :class="size === 'sm' ? 'h-1' : 'h-2'" role="progressbar" :aria-valuenow="value" :aria-valuemax="max ?? 100" :aria-label="label">
    <div
      class="h-full rounded-full transition-[width] duration-(--motion-panel) ease-(--ease)"
      :class="[{ primary: 'bg-primary', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' }[tone ?? 'primary'], pct === undefined && 'w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite]']"
      :style="pct === undefined ? undefined : { width: pct + '%' }"
    />
  </div>
</template>
