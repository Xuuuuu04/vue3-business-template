<script setup lang="ts">
import { computed } from "vue";
import { FileText } from "lucide-vue-next";
import { fileKind } from "../lib/format";
/** 文件图标默认使用中性线条；color 只给线条着色，类型名称由相邻文字提供。 */
const props = defineProps<{ name: string; type?: string; size?: "sm" | "lg"; tone?: "neutral" | "color" }>();
const kind = computed(() => fileKind(props.name, props.type));
</script>
<template>
  <FileText class="shrink-0" :class="[size === 'lg' ? 'size-10' : 'size-5', tone === 'color' ? 'text-(--file-icon)' : 'text-fg-muted']" :style="tone === 'color' ? { '--file-hue': kind.hue } : undefined" :title="kind.label" aria-hidden="true" />
</template>
