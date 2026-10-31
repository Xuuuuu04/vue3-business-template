<script setup lang="ts">
import { computed } from "vue";
import Progress from "../base/Progress.vue";

const props = defineProps<{
  label: string;
  used: number;
  limit: number;
  unit?: string;
  format?: (v: number) => string;
}>();
const pct = computed(() =>
  props.limit ? (props.used / props.limit) * 100 : 0,
);
const fmt = (v: number) =>
  props.format ? props.format(v) : v.toLocaleString("zh-CN");
</script>
<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <span>{{ label }}</span
      ><span class="text-help text-fg-muted tabular-nums"
        ><b class="font-semibold text-fg">{{ fmt(used) }}</b> / {{ fmt(limit)
        }}{{ unit }}</span
      >
    </div>
    <Progress
      :value="used"
      :max="limit"
      :tone="pct >= 95 ? 'bad' : pct >= 80 ? 'warn' : 'primary'"
      :label="label"
      size="sm"
    />
  </div>
</template>
