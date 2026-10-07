<script setup lang="ts">
/** 按钮：primary 每个区域最多一个；其余用 secondary、ghost。danger 只用于确认弹窗里的最后一步，页面上的删除入口用 danger-quiet。link 用于行内操作，text 用于表格里可点开的名称。 */
import { computed } from "vue";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-vue-next";
import { cn } from "../lib/cn";
import { actionIcons } from "../lib/icons";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-quiet" | "link" | "text";
    size?: "sm" | "md" | "lg" | "icon" | "none";
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    /** 文字前的图标名，见 lib/icons.ts 的 actionIcons。 */
    icon?: string;
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);

const styles = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium transition-[background-color,border-color,color,box-shadow] duration-150 select-none disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-ink hover:border-primary-hover hover:bg-primary-hover",
        secondary: "border-line bg-surface text-fg shadow-card hover:bg-subtle hover:border-line-strong",
        ghost: "border-transparent bg-transparent text-fg-muted hover:bg-muted hover:text-fg",
        danger: "border-bad bg-bad text-surface hover:opacity-90",
        "danger-quiet": "border-line bg-surface text-bad hover:border-bad hover:bg-bad-soft",
        link: "-mx-1 h-auto border-transparent px-1 text-primary-text hover:bg-primary-soft",
        text: "-mx-1 h-auto border-transparent px-1 text-left font-normal text-fg hover:text-primary-text hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[14px]",
        md: "h-(--control-h) px-3.5",
        lg: "h-(--control-h-lg) px-5 text-[16px]",
        icon: "h-(--control-h) w-(--control-h) px-0",
        none: "",
      },
    },
  },
);
const classes = computed(() => cn(styles({ variant: props.variant, size: props.variant === "link" || props.variant === "text" ? "none" : props.size })));
</script>
<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <Loader2 v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="actionIcons[icon]" v-else-if="icon && actionIcons[icon]" class="size-4 shrink-0" aria-hidden="true" />
    <slot />
  </button>
</template>
