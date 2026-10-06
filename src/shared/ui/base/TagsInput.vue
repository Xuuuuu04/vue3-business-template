<script setup lang="ts">
import { TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput } from "reka-ui";
import { X } from "lucide-vue-next";
/** 标签输入：输入后回车或逗号添加，退格删除最后一个；用于关键词、收件人、标签。 */
const model = defineModel<string[]>({ default: () => [] });
defineProps<{ placeholder?: string; max?: number; ariaLabel?: string }>();
</script>
<template>
  <TagsInputRoot v-model="model" :max="max" add-on-paste :delimiter="/[,，]/" class="flex min-h-(--control-h) w-full flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)] hover:border-fg-faint">
    <TagsInputItem v-for="t in model" :key="t" :value="t" class="inline-flex h-6 items-center gap-1 rounded-sm bg-primary-soft pr-1 pl-2 text-[13px] text-primary-text data-[state=active]:ring-2 data-[state=active]:ring-(--ring)">
      <TagsInputItemText /><TagsInputItemDelete class="grid size-4 place-items-center rounded-sm hover:bg-primary-soft-hover" :aria-label="`删除 ${t}`"><X class="size-3" /></TagsInputItemDelete>
    </TagsInputItem>
    <TagsInputInput :placeholder="model.length ? '' : placeholder" :aria-label="ariaLabel ?? placeholder" class="h-6 min-w-24 flex-1 bg-transparent outline-none placeholder:text-fg-faint" />
  </TagsInputRoot>
</template>
