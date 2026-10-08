<script setup lang="ts">
/** 一页只围绕一个任务。workspace 固定页头、让主区占满剩余空间；文档页自然滚动。 */
import { RouterLink } from "vue-router";
import { computed, inject, type Component, type Ref } from "vue";
import { ArrowLeft } from "lucide-vue-next";
const props = defineProps<{
  title: string;
  /** 模块图标；显示在标题前，帮助用户一眼认出所在位置。 */
  icon?: Component;
  workspace?: boolean;
  narrow?: boolean;
  back?: string;
}>();
/** 应用外壳按当前模块提供默认图标；页面传入 icon 时以页面为准。 */
const moduleIcon = inject<Ref<Component | undefined> | undefined>("page-icon", undefined);
const shownIcon = computed(() => props.icon ?? moduleIcon?.value);
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
      <slot name="icon"><span v-if="shownIcon" class="page-icon" aria-hidden="true"><component :is="shownIcon" /></span></slot>
      <h1 :title="title" class="page-title min-w-0 flex-1 text-[24px] leading-8 font-semibold">
        {{ title }}
      </h1>
      <div v-if="$slots.actions" class="page-heading-actions flex flex-wrap items-center gap-2">
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
