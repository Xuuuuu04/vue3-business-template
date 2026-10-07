<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger } from "reka-ui";
import type { TabItem } from "../lib/types";
/** 标签页：只负责切换，内容由页面按当前值显示。同一对象的相关内容才用标签页。 */
const model = defineModel<string>({ required: true });
defineProps<{ items: TabItem[] }>();
</script>
<template>
  <TabsRoot v-model="model">
    <TabsList class="flex gap-6 overflow-x-auto border-b border-line">
      <TabsTrigger
        v-for="t in items"
        :key="t.value"
        :value="t.value"
        class="group relative flex h-11 shrink-0 items-center gap-2 text-fg-muted transition-colors outline-none hover:text-fg focus-visible:text-fg focus-visible:bg-subtle focus-visible:rounded-md focus-visible:outline-offset-[-2px] data-[state=active]:font-medium data-[state=active]:text-fg"
      >
        <span v-if="t.mark" class="grid size-[18px] place-items-center rounded-sm bg-primary-soft text-[12px] font-bold text-primary-text">{{ t.mark }}</span>
        {{ t.label }}
        <span v-if="t.count !== undefined" class="rounded-full bg-muted px-1.5 text-xs font-medium text-fg-muted tabular-nums">{{ t.count.toLocaleString("zh-CN") }}</span>
        <span class="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 ease-(--ease) group-data-[state=active]:scale-x-100" />
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>
