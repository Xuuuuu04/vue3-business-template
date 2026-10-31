<script setup lang="ts">
import { SlidersHorizontal, Search, X } from "lucide-vue-next";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from "reka-ui";
import Button from "../base/Button.vue";

defineProps<{
  applied?: { key: string; label: string }[];
  loading?: boolean;
  moreActive?: number;
}>();
const emit = defineEmits<{ query: []; reset: []; remove: [key: string] }>();
</script>
<template>
  <form class="filter-bar" role="search" @submit.prevent="emit('query')">
    <div class="filter-row">
      <slot />
      <PopoverRoot v-if="$slots.more">
        <PopoverTrigger as-child>
          <Button
            variant="secondary"
            class="filter-more"
            :aria-label="
              moreActive ? `更多筛选，已生效 ${moreActive} 项` : '更多筛选'
            "
          >
            <SlidersHorizontal class="size-4" />更多筛选<span
              v-if="moreActive"
              class="filter-more-count"
              >{{ moreActive }}</span
            >
          </Button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            :collision-padding="12"
            align="start"
            :side-offset="6"
            class="z-[100] w-[360px] max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-4 popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]"
          >
            <div class="flex flex-col gap-4"><slot name="more" /></div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <span class="flex-1" />
      <Button variant="ghost" @click="emit('reset')">复原</Button>
      <Button type="submit" variant="secondary" :loading="loading"
        ><Search class="size-4" />查询</Button
      >
    </div>
    <div v-if="applied?.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="a in applied"
        :key="a.key"
        class="inline-flex h-6 items-center gap-1 rounded-md border border-line bg-subtle pr-1 pl-2.5 text-help text-fg"
      >
        {{ a.label }}
        <button
          type="button"
          class="grid size-4 place-items-center rounded-sm hover:bg-muted"
          :aria-label="`移除条件：${a.label}`"
          @click="emit('remove', a.key)"
        >
          <X class="size-3" />
        </button>
      </span>
    </div>
  </form>
</template>
