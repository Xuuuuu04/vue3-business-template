<script setup lang="ts">
import { TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput } from "reka-ui";
import { X } from "lucide-vue-next";
import { useFieldControl } from "../lib/field";
/** 标签输入：输入后回车或逗号添加，退格删除最后一个；用于关键词、收件人、标签。 */
defineOptions({ inheritAttrs: false });
const model = defineModel<string[]>({ default: () => [] });
const props = defineProps<{ id?: string; placeholder?: string; max?: number; ariaLabel?: string }>();
const { attributes, invalid: fieldInvalid, rootAttributes } = useFieldControl(() => ({ id: props.id, label: props.ariaLabel }));
</script>
<template>
  <TagsInputRoot v-bind="rootAttributes()" :data-invalid="fieldInvalid() || undefined" v-model="model" :max="max" add-on-paste :delimiter="/[,，]/" class="flex min-h-(--control-h) w-full flex-wrap items-center gap-1.5 control-surface rounded-md border border-line bg-surface px-2 py-1 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_2px_var(--ring)] hover:border-line-strong">
    <TagsInputItem v-for="t in model" :key="t" :value="t" class="inline-flex h-6 items-center gap-1 rounded-sm bg-primary-soft pl-2 text-help text-primary-text data-[state=active]:ring-2 data-[state=active]:ring-(--ring)">
      <TagsInputItemText /><TagsInputItemDelete class="grid size-6 place-items-center rounded-sm hover:bg-primary-soft-hover" :aria-label="`删除 ${t}`"><X class="size-3" /></TagsInputItemDelete>
    </TagsInputItem>
    <TagsInputInput v-bind="attributes()" :placeholder="model.length ? '' : placeholder" :aria-label="attributes()['aria-labelledby'] ? undefined : ariaLabel ?? placeholder" class="h-6 min-w-24 flex-1 bg-transparent outline-none placeholder:text-fg-faint" />
  </TagsInputRoot>
</template>
