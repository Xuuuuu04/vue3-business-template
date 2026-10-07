<script setup lang="ts">
import { Check } from "lucide-vue-next";
/** 步骤条：多步填写或流程进度。current 从 0 开始；之前的步骤显示完成。 */
defineProps<{ items: { title: string; text?: string }[]; current: number; error?: boolean }>();
</script>
<template>
  <ol class="flex w-full items-start">
    <li v-for="(s, i) in items" :key="s.title" class="flex flex-1 items-start gap-2.5 last:flex-none" :aria-current="i === current ? 'step' : undefined">
      <span class="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] text-help font-semibold transition-colors" :class="i < current ? 'border-primary bg-primary text-primary-ink' : i === current ? (error ? 'border-bad bg-bad-soft text-bad' : 'border-primary bg-primary-soft text-primary-text') : 'border-line-strong text-fg-faint'">
        <Check v-if="i < current" class="size-3.5" :stroke-width="3" /><template v-else>{{ i + 1 }}</template>
      </span>
      <span class="flex min-w-0 flex-col pt-0.5"><span class="whitespace-nowrap" :class="i === current ? 'font-semibold' : i < current ? '' : 'text-fg-muted'">{{ s.title }}</span><span v-if="s.text" class="text-help text-fg-faint">{{ s.text }}</span></span>
      <span v-if="i < items.length - 1" class="mx-3 mt-3.5 h-px min-w-6 flex-1" :class="i < current ? 'bg-primary' : 'bg-line-strong'" aria-hidden="true" />
    </li>
  </ol>
</template>
