<script setup lang="ts">
import { computed } from "vue";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-vue-next";
import { cn } from "../lib/cn";
import { actionIcons } from "../lib/icons";

const props = withDefaults(
  defineProps<{
    variant?:
      | "primary"
      | "secondary"
      | "ghost"
      | "danger"
      | "danger-quiet"
      | "link"
      | "text";
    size?: "sm" | "md" | "lg" | "icon" | "none";
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";

    icon?: string;
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);

const styles = cva(
  "btn-press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-(--motion-fast) select-none disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "btn-primary border-primary bg-primary text-primary-ink hover:border-primary-hover hover:bg-primary-hover",
        secondary:
          "border-line bg-surface text-fg shadow-card hover:bg-subtle hover:border-line-strong",
        ghost:
          "border-transparent bg-transparent text-fg-muted hover:bg-muted hover:text-fg",
        danger: "border-bad bg-bad text-surface hover:opacity-90",
        "danger-quiet":
          "border-line bg-surface text-bad hover:border-bad hover:bg-bad-soft",
        link: "-mx-1 h-auto border-transparent px-1 text-primary-text hover:bg-primary-soft",
        text: "-mx-1 h-auto border-transparent px-1 text-left font-medium text-fg hover:text-primary-text hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-label",
        md: "h-(--control-h) px-3.5",
        lg: "h-(--control-h-lg) px-5 text-[16px]",
        icon: "h-(--control-h) w-(--control-h) px-0",
        none: "",
      },
    },
  },
);
const classes = computed(() =>
  cn(
    styles({
      variant: props.variant,
      size:
        props.variant === "link" || props.variant === "text"
          ? "none"
          : props.size,
    }),
  ),
);
</script>
<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <Loader2 v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <component
      :is="actionIcons[icon]"
      v-else-if="icon && actionIcons[icon]"
      class="size-4 shrink-0"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
