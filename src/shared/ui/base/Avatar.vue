<script setup lang="ts">
import { computed } from "vue";
/** 头像：有图片显示图片，没有就用名字的第一个字，底色按名字固定（同一个人颜色不变）。 */
const props = defineProps<{ name: string; src?: string; size?: "xs" | "sm" | "md" | "lg" }>();
const px = computed(() => ({ xs: 20, sm: 24, md: 32, lg: 40 })[props.size ?? "md"]);
const hue = computed(() => [...props.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
</script>
<template>
  <span class="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold ring-2 ring-surface" :style="{ width: px + 'px', height: px + 'px', fontSize: px * 0.42 + 'px', background: `oklch(0.9 0.05 ${hue})`, color: `oklch(0.4 0.1 ${hue})` }" :title="name">
    <img v-if="src" :src="src" :alt="name" class="size-full object-cover" />
    <template v-else>{{ name.slice(0, 1) }}</template>
  </span>
</template>
