<script setup lang="ts">
/** 单行输入。前后缀用插槽放图标或单位；invalid 由表单字段统一设置。 */
defineOptions({ inheritAttrs: false });
const model = defineModel<string>({ default: "" });
defineProps<{
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "md" | "lg";
  align?: "left" | "right";
  inputmode?: "text" | "decimal" | "numeric" | "search" | "email" | "tel" | "url";
  autocomplete?: string;
  id?: string;
  name?: string;
}>();
</script>
<template>
  <div
    class="group flex w-full items-center overflow-hidden rounded-md border bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)] hover:border-fg-faint"
    :class="[
      size === 'lg' ? 'h-(--control-h-lg)' : 'h-(--control-h)',
      invalid ? 'border-bad focus-within:border-bad' : 'border-line-strong',
      disabled && 'pointer-events-none opacity-50',
    ]"
  >
    <span v-if="$slots.prefix" class="flex items-center pl-2.5 text-fg-faint"><slot name="prefix" /></span>
    <input
      :id="id"
      :name="name"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :aria-invalid="invalid || undefined"
      v-bind="$attrs"
      class="h-full min-w-0 flex-1 bg-transparent px-2.5 text-fg outline-none placeholder:text-fg-faint tabular-nums"
      :class="align === 'right' && 'text-right'"
    />
    <span v-if="$slots.suffix" class="flex h-full items-center border-l border-line bg-muted px-2.5 text-[13px] text-fg-muted"><slot name="suffix" /></span>
  </div>
</template>
