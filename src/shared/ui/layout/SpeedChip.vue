<script setup lang="ts">
/** 开发时顶栏的速度小标：最近一次页面切换或操作耗时，颜色按快慢分档，点开进入页面速度。 */
import { RouterLink } from "vue-router";
import { Zap } from "lucide-vue-next";
const props = defineProps<{ value?: number; to: string }>();
const tone = () => (props.value === undefined ? "" : props.value <= 100 ? "is-ok" : props.value <= 300 ? "is-warn" : "is-bad");
</script>
<template>
  <RouterLink :to="to" class="speed-chip" :class="tone()" :aria-label="value === undefined ? '页面速度' : `最近耗时 ${Math.round(value)} 毫秒，查看页面速度`">
    <Zap class="size-3.5" /><span class="tabular-nums">{{ value === undefined ? "—" : value < 10 ? value.toFixed(1) : Math.round(value) }}</span><small>ms</small>
  </RouterLink>
</template>
