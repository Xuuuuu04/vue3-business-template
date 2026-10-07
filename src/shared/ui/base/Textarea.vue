<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
/** 多行输入：autosize 时随内容长高（最多 maxRows 行）；有 maxlength 时右下角显示字数。 */
defineOptions({ inheritAttrs: false });
const model = defineModel<string>({ default: "" });
const props = defineProps<{ rows?: number; maxRows?: number; autosize?: boolean; maxlength?: number; invalid?: boolean; placeholder?: string; disabled?: boolean }>();
const el = ref<HTMLTextAreaElement>();
function fit() {
  if (!props.autosize || !el.value) return;
  el.value.style.height = "auto";
  const line = parseFloat(getComputedStyle(el.value).lineHeight) || 21;
  const max = (props.maxRows ?? 8) * line + 18;
  el.value.style.height = Math.min(el.value.scrollHeight, max) + "px";
}
watch(model, () => nextTick(fit));
onMounted(fit);
</script>
<template>
  <div class="relative w-full">
    <textarea
      ref="el"
      v-model="model"
      v-bind="$attrs"
      :rows="rows ?? 3"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      class="block w-full resize-none control-surface rounded-md border bg-surface px-2.5 py-2 leading-relaxed text-fg transition-[border-color,box-shadow] duration-(--motion-fast) outline-none placeholder:text-fg-faint hover:border-line-strong focus:border-primary focus:shadow-[0_0_0_2px_var(--ring)] disabled:opacity-50"
      :class="[invalid ? 'border-bad' : 'border-line', maxlength && 'pb-6']"
    />
    <span v-if="maxlength" class="pointer-events-none absolute right-2.5 bottom-1.5 text-xs text-fg-faint tabular-nums">{{ model.length }} / {{ maxlength }}</span>
  </div>
</template>
