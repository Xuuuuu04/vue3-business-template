<script setup lang="ts">
import { AccordionRoot, AccordionItem, AccordionHeader, AccordionTrigger, AccordionContent } from "reka-ui";
import { ChevronDown } from "lucide-vue-next";
/** 折叠面板：常见问题、高级设置这类可以先收起的内容。每项内容用 #item-值 插槽。 */
defineProps<{ items: { value: string; title: string }[]; multiple?: boolean; defaultOpen?: string[] }>();
</script>
<template>
  <AccordionRoot :type="multiple ? 'multiple' : 'single'" :default-value="multiple ? defaultOpen : defaultOpen?.[0]" collapsible class="divide-y divide-line border-y border-line">
    <AccordionItem v-for="it in items" :key="it.value" :value="it.value">
      <AccordionHeader>
        <AccordionTrigger class="group flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-subtle">
          {{ it.title }}<ChevronDown class="size-4 text-fg-faint transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden text-fg-muted data-[state=closed]:animate-[collapse_.2s_ease-out] data-[state=open]:animate-[expand_.2s_ease-out]">
        <div class="px-4 pb-4"><slot :name="`item-${it.value}`" /></div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
