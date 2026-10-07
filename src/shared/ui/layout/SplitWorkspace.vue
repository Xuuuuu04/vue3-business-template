<script setup lang="ts">
/** 同一任务的选择区与内容区。宽屏并排，窄屏逐页查看；返回后保留选择区的滚动位置。 */
import { ArrowLeft } from "lucide-vue-next";
import { nextTick, ref, watch } from "vue";
import Button from "../base/Button.vue";
const view = defineModel<"list" | "detail">("view", { default: "list" });
defineProps<{ listLabel: string; detailLabel: string }>();
const list = ref<HTMLElement>();
const heading = ref<HTMLElement>();
watch(view, async (value) => {
  await nextTick();
  if (!window.matchMedia("(max-width: 767px)").matches) return;
  if (value === "detail") heading.value?.focus();
  else list.value?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
});
</script>
<template>
  <div class="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-line bg-surface" data-split-workspace>
    <section ref="list" :aria-label="listLabel" class="flex min-h-0 w-full shrink-0 flex-col md:w-72 md:border-r md:border-line lg:w-80" :class="view === 'detail' && 'hidden md:flex'">
      <div v-if="$slots.listHeader" class="flex shrink-0 flex-col gap-3 border-b border-line p-4"><slot name="listHeader" /></div>
      <div class="min-h-0 flex-1 overflow-y-auto p-2"><slot name="list" /></div>
    </section>
    <section :aria-label="detailLabel" class="min-h-0 min-w-0 flex-1 flex-col" :class="view === 'list' ? 'hidden md:flex' : 'flex'">
      <header ref="heading" tabindex="-1" class="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-line px-4 py-3 lg:px-6">
        <Button variant="ghost" size="icon" class="md:hidden" :aria-label="`返回${listLabel}`" @click="view = 'list'"><ArrowLeft class="size-[18px]" /></Button>
        <slot name="heading" />
      </header>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col px-4 lg:px-6"><slot /></div>
      <div v-if="$slots.composer" class="shrink-0 border-t border-line p-4 lg:px-6"><slot name="composer" /></div>
    </section>
  </div>
</template>
