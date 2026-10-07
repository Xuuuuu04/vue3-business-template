<script setup lang="ts">
import { computed } from "vue";
import { FileText } from "lucide-vue-next";
import { fileKind } from "../lib/format";
/** 文件图标：默认使用中性线条；tone=color 时按类型着色并显示扩展名。sm 用于表格，lg 用于详情页标题。 */
const props = defineProps<{ name: string; type?: string; size?: "sm" | "lg"; tone?: "neutral" | "color" }>();
const kind = computed(() => fileKind(props.name, props.type));
const px = computed(() => (props.size === "lg" ? 48 : 30));
</script>
<template>
  <FileText v-if="tone !== 'color'" class="shrink-0 text-fg-muted" :class="size === 'lg' ? 'size-10' : 'size-5'" :aria-hidden="true" />
  <span v-else class="relative inline-grid shrink-0 place-items-end overflow-hidden font-bold tracking-wide text-white" :style="{ width: px * 0.82 + 'px', height: px + 'px', borderRadius: px * 0.14 + 'px', background: `oklch(0.6 0.15 ${kind.hue})`, fontSize: (size === 'lg' ? 10 : 7.5) + 'px' }" :title="kind.label" aria-hidden="true">
    <span class="absolute top-0 right-0 size-[30%] rounded-bl-[3px] bg-white/35" />
    <span class="w-full pb-[18%] text-center leading-none">{{ kind.ext.slice(0, 4) }}</span>
  </span>
</template>
