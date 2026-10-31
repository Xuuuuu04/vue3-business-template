<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { CheckCircle2, ChevronRight } from "lucide-vue-next";
import Tag from "../base/Tag.vue";
const props = defineProps<{
  items: { label: string; count: number; to: string; tone?: "bad" | "warn" }[];
  showZero?: boolean;
}>();
const shown = computed(() =>
  props.items.filter((i) => props.showZero || i.count > 0),
);
</script>
<template>
  <div v-if="shown.length" class="action-wrap">
    <ul class="action-list">
      <li v-for="i in shown" :key="i.label">
        <RouterLink :to="i.to" class="action-row">
          <span
            class="action-dot"
            :class="i.tone && `is-${i.tone}`"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate">{{ i.label }}</span>
          <Tag :tone="i.tone" class="tabular-nums">{{ i.count }}</Tag>
          <ChevronRight class="size-4 shrink-0 text-fg-faint" />
        </RouterLink>
      </li>
    </ul>
    <p v-if="shown.length < 4" class="action-tail">
      <CheckCircle2 class="size-4 text-ok" />其他事项都已处理
    </p>
  </div>
  <div v-else class="action-clear">
    <CheckCircle2 class="size-5 text-ok" />暂无待处理
  </div>
</template>
