<script setup lang="ts">
/**
 * 单一任务的内容区。表单限制行宽，预览和列表使用全部可用空间；不形成独立卡片。
 * 表单在宽屏右侧放一列：传入 aside 插槽就显示页面自己的摘要或预览，否则自动显示表单目录与必填进度，避免右侧大片空白。
 */
import { ref, useSlots } from "vue";
import FormOutline from "./FormOutline.vue";
const props = defineProps<{ form?: boolean; fill?: boolean; /** 关闭表单右侧栏。 */ plain?: boolean; /** 详情等页面右侧栏的标题。 */ asideTitle?: string }>();
const slots = useSlots();
const body = ref<HTMLElement>();
</script>
<template>
  <div
    class="work-area"
    :class="{ 'work-area-form': form && plain, 'work-area-fill': fill, 'work-area-form-grid': form && !plain }"
  >
    <template v-if="form && !plain">
      <div ref="body" class="work-area-form-body"><slot /></div>
      <aside class="work-area-aside">
        <slot name="aside"><FormOutline v-if="body" :root="body" /></slot>
      </aside>
    </template>
    <div v-else-if="slots.aside" class="work-area-split">
      <div class="flex min-w-0 flex-col gap-(--space-section)"><slot /></div>
      <aside class="work-area-side" :aria-label="asideTitle"><h2 v-if="asideTitle" class="work-area-side-title">{{ asideTitle }}</h2><slot name="aside" /></aside>
    </div>
    <slot v-else />
  </div>
</template>
