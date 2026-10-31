<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowUpRight } from "lucide-vue-next";
import Skeleton from "../base/Skeleton.vue";
import EmptyState from "../base/EmptyState.vue";
defineProps<{
  title: string;
  focus?: boolean;

  more?: string;

  figure?: {
    value: string;
    unit?: string;
    delta?: number;
    deltaLabel?: string;
    goodWhenUp?: boolean;
  };

  flush?: boolean;

  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
}>();
function tone(f: { delta?: number; goodWhenUp?: boolean }) {
  if (!f.delta) return "text-fg-faint";
  return (f.goodWhenUp === false ? f.delta < 0 : f.delta > 0)
    ? "text-ok"
    : "text-bad";
}
</script>
<template>
  <section class="panel" :class="{ 'panel-focus': focus }" :aria-label="title">
    <header class="panel-head">
      <div class="min-w-0 flex-1">
        <h2 class="panel-title">{{ title }}</h2>
        <p v-if="figure" class="panel-figure">
          <span class="tabular-nums">{{ figure.value }}</span
          ><small v-if="figure.unit">{{ figure.unit }}</small>
          <span
            v-if="figure.delta !== undefined"
            class="panel-delta tabular-nums"
            :class="tone(figure)"
            >{{ figure.delta > 0 ? "↑" : figure.delta < 0 ? "↓" : "" }}
            {{ Math.abs(figure.delta).toFixed(1) }}%<span
              class="text-fg-faint font-normal"
              >{{ figure.deltaLabel ?? "较上期" }}</span
            ></span
          >
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
        <RouterLink v-if="more" :to="more" class="panel-more"
          >查看全部<ArrowUpRight class="size-3.5"
        /></RouterLink>
      </div>
    </header>
    <div
      class="panel-body"
      :class="{ 'is-flush': flush && !loading && !empty }"
    >
      <div v-if="loading" class="flex flex-col gap-3 py-2" aria-busy="true">
        <Skeleton width="60%" /><Skeleton width="90%" /><Skeleton
          width="75%"
        /><Skeleton width="85%" />
      </div>
      <EmptyState v-else-if="empty" :title="emptyTitle ?? '暂无数据'" />
      <slot v-else />
    </div>
  </section>
</template>
