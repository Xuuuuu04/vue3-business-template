<script setup lang="ts">
import { SelectRoot, SelectTrigger, SelectValue, SelectPortal, SelectContent, SelectViewport, SelectItem, SelectItemText, SelectItemIndicator } from "reka-ui";
import { ChevronDown, Check } from "lucide-vue-next";
import type { Option } from "../lib/types";
/** 下拉选择。空字符串表示“未选”，选项里用 value: "" 表示“全部”。 */
const model = defineModel<string>({ default: "" });
defineProps<{ options: Option[]; placeholder?: string; disabled?: boolean; ariaLabel?: string; size?: "md" | "lg" }>();
const EMPTY = "__empty__";
</script>
<template>
  <SelectRoot :model-value="model === '' ? EMPTY : model" :disabled="disabled" @update:model-value="(v) => (model = v === EMPTY ? '' : String(v))">
    <SelectTrigger
      :aria-label="ariaLabel ?? placeholder"
      class="flex w-full items-center justify-between gap-2 control-surface rounded-md border border-line bg-surface px-2.5 text-left text-fg transition-[border-color,box-shadow] duration-(--motion-fast) hover:border-line-strong focus-visible:border-primary data-[state=open]:border-primary data-[state=open]:shadow-[0_0_0_2px_var(--ring)] disabled:opacity-50"
      :class="size === 'lg' ? 'h-(--control-h-lg)' : 'h-(--control-h)'"
    >
      <SelectValue :placeholder="placeholder" class="truncate data-[placeholder]:text-fg-faint" />
      <ChevronDown class="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent :collision-padding="12" position="popper" :side-offset="6" class="z-[100] max-w-[calc(100vw-24px)] max-h-72 min-w-(--reka-select-trigger-width) overflow-hidden rounded-lg border border-line bg-surface p-1 popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]">
        <SelectViewport>
          <SelectItem
            v-for="o in options"
            :key="o.value"
            :value="o.value === '' ? EMPTY : o.value"
            class="relative flex min-h-9 py-1.5 cursor-pointer items-center rounded-md pr-8 pl-2.5 text-fg outline-none select-none data-[highlighted]:bg-muted data-[state=checked]:font-medium"
          >
            <SelectItemText>{{ o.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2.5 text-primary-text"><Check class="size-4" /></SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
