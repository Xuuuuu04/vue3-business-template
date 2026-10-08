<script setup lang="ts">
/**
 * 总览面板：只能放在 OverviewBoard 里。标题说明这一块回答的问题，more 指向完整列表。
 * focus 面板占两列、标题区可放一个关键数字（figure），作为整页的视觉重点。
 */
import { RouterLink } from "vue-router";
import { ArrowUpRight } from "lucide-vue-next";
defineProps<{
  title: string;
  focus?: boolean;
  /** 完整页面地址，显示为右上角“查看全部”。 */
  more?: string;
  /** 关键数字，只在 focus 面板使用。 */
  figure?: { value: string; unit?: string; delta?: number; deltaLabel?: string; goodWhenUp?: boolean };
  /** 内容贴边（表格、列表）；默认留内边距。 */
  flush?: boolean;
}>();
function tone(f: { delta?: number; goodWhenUp?: boolean }) {
  if (!f.delta) return "text-fg-faint";
  return (f.goodWhenUp === false ? f.delta < 0 : f.delta > 0) ? "text-ok" : "text-bad";
}
</script>
<template>
  <section class="panel" :class="{ 'panel-focus': focus }" :aria-label="title">
    <header class="panel-head">
      <div class="min-w-0 flex-1">
        <h2 class="panel-title">{{ title }}</h2>
        <p v-if="figure" class="panel-figure">
          <span class="tabular-nums">{{ figure.value }}</span><small v-if="figure.unit">{{ figure.unit }}</small>
          <span v-if="figure.delta !== undefined" class="panel-delta tabular-nums" :class="tone(figure)">{{ figure.delta > 0 ? "↑" : figure.delta < 0 ? "↓" : "" }} {{ Math.abs(figure.delta).toFixed(1) }}%<span class="text-fg-faint font-normal">{{ figure.deltaLabel ?? "较上期" }}</span></span>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
        <RouterLink v-if="more" :to="more" class="panel-more">查看全部<ArrowUpRight class="size-3.5" /></RouterLink>
      </div>
    </header>
    <div class="panel-body" :class="{ 'is-flush': flush }"><slot /></div>
  </section>
</template>
