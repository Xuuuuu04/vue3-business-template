<script setup lang="ts">
import { computed } from "vue";
/**
 * 产品标识：有图片 logo 就显示图片，没有就用一个字做成圆角方块标识。
 * 尺寸有四档：sm 侧栏收起与页脚，md 侧栏，lg 登录页，xl 品牌面板。
 */
const props = defineProps<{ name: string; mark?: string; logo?: string; size?: "sm" | "md" | "lg" | "xl"; wordmark?: boolean }>();
const px = computed(() => ({ sm: 28, md: 32, lg: 48, xl: 64 })[props.size ?? "md"]);
const letter = computed(() => props.mark ?? props.name.slice(0, 1));
</script>
<template>
  <span class="inline-flex items-center gap-3" :aria-label="name" role="img">
    <img v-if="logo" :src="logo" :alt="name" :style="{ height: px + 'px', width: 'auto', maxWidth: px * 3 + 'px' }" class="shrink-0 object-contain" />
    <span
      v-else
      class="relative grid shrink-0 place-items-center font-bold text-primary-ink bg-primary"
      :style="{ width: px + 'px', height: px + 'px', borderRadius: px * 0.28 + 'px', fontSize: px * 0.5 + 'px', background: 'var(--primary)' }"
    >{{ letter }}</span>
    <span v-if="wordmark" class="truncate font-semibold tracking-tight" :style="{ fontSize: Math.round(px * 0.48) + 'px' }">{{ name }}</span>
  </span>
</template>
