<script setup lang="ts">
/**
 * 待处理清单：每行一件需要用户去处理的事、数量和去处。数量为 0 的行自动收起，全部为 0 时显示“暂无待处理”。
 * 放在总览的第二个面板（Panel flush）里；不要用它展示普通统计数字，统计用 StatList。
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { CheckCircle2, ChevronRight } from "lucide-vue-next";
import Tag from "../base/Tag.vue";
const props = defineProps<{ items: { label: string; count: number; to: string; tone?: "bad" | "warn" }[]; /** 保留数量为 0 的行。 */ showZero?: boolean }>();
const shown = computed(() => props.items.filter((i) => props.showZero || i.count > 0));
</script>
<template>
  <ul v-if="shown.length" class="action-list">
    <li v-for="i in shown" :key="i.label">
      <RouterLink :to="i.to" class="action-row">
        <span class="action-dot" :class="i.tone && `is-${i.tone}`" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{{ i.label }}</span>
        <Tag :tone="i.tone" class="tabular-nums">{{ i.count }}</Tag>
        <ChevronRight class="size-4 shrink-0 text-fg-faint" />
      </RouterLink>
    </li>
  </ul>
  <div v-else class="action-clear"><CheckCircle2 class="size-5 text-ok" />暂无待处理</div>
</template>
