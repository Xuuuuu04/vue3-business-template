<script setup lang="ts">
import { computed } from "vue";
import Tip from "./Tip.vue";
import { formatDateTime, formatRelative } from "../lib/format";
/** 时间：近的显示“3 小时前”“昨天 14:20”，悬停看完整时间；absolute 时直接显示完整时间。 */
const props = defineProps<{ value: string; absolute?: boolean }>();
const full = computed(() => formatDateTime(props.value));
</script>
<template>
  <Tip :text="absolute ? '' : full"><time :datetime="value" class="text-[14px] text-fg-muted tabular-nums">{{ absolute ? full : formatRelative(value) }}</time></Tip>
</template>
