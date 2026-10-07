<script setup lang="ts">
/** 一页只围绕一个任务。workspace 固定页头、让主区占满剩余空间；文档页自然滚动。 */
import { RouterLink } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
defineProps<{
  title: string;
  workspace?: boolean;
  narrow?: boolean;
  back?: string;
}>();
</script>
<template>
  <section
    class="page-frame"
    :class="{ 'page-workspace': workspace }"
    :aria-label="title"
  >
    <header class="page-heading">
      <RouterLink
        v-if="back"
        :to="back"
        class="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-fg"
        aria-label="返回"
        ><ArrowLeft class="size-[18px]"
      /></RouterLink>
      <slot name="icon" />
      <h1 class="min-w-0 flex-1 truncate text-[22px] leading-8 font-semibold">
        {{ title }}
      </h1>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div v-if="$slots.tabs" class="page-tabs"><slot name="tabs" /></div>
    <div v-if="$slots.status" class="page-status"><slot name="status" /></div>
    <div class="page-content" :class="{ 'page-content-narrow': narrow }">
      <slot />
    </div>
  </section>
</template>
