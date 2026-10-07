<script setup lang="ts">
import { computed, ref } from "vue";
import { ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxTrigger, ComboboxPortal, ComboboxContent, ComboboxViewport, ComboboxItem, ComboboxItemIndicator, ComboboxEmpty } from "reka-ui";
import { Check, ChevronsUpDown, X } from "lucide-vue-next";
/** 可搜索的下拉：选项多（十几个以上）时用；multiple 时可多选，已选的显示为标签。 */
const model = defineModel<string | string[]>({ default: "" });
const props = defineProps<{ options: { value: string; label: string; hint?: string }[]; multiple?: boolean; placeholder?: string; ariaLabel?: string }>();
const query = ref("");
const labelOf = (v: string) => props.options.find((o) => o.value === v)?.label ?? v;
const filtered = computed(() => props.options.filter((o) => !query.value || o.label.includes(query.value) || o.value.toLowerCase().includes(query.value.toLowerCase())));
const chosen = computed(() => (Array.isArray(model.value) ? model.value : []));
function drop(v: string) { model.value = chosen.value.filter((x) => x !== v); }
</script>
<template>
  <ComboboxRoot v-model="model" :multiple="multiple" :ignore-filter="true" :reset-search-term-on-blur="true" @update:open="(o) => !o && (query = '')">
    <ComboboxAnchor class="flex min-h-(--control-h) w-full flex-wrap items-center gap-1.5 control-surface rounded-md border border-line bg-surface py-1 pr-1 pl-2.5 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_2px_var(--ring)] hover:border-line-strong">
      <span v-for="v in chosen" :key="v" class="inline-flex h-6 items-center gap-1 rounded-sm bg-primary-soft pr-1 pl-2 text-[13px] text-primary-text">{{ labelOf(v) }}<button type="button" class="grid size-4 place-items-center rounded-sm hover:bg-primary-soft-hover" :aria-label="`移除 ${labelOf(v)}`" @click.stop="drop(v)"><X class="size-3" /></button></span>
      <ComboboxInput v-model="query" :display-value="(v: unknown) => (multiple ? '' : labelOf(String(v ?? '')))" :placeholder="chosen.length ? '' : placeholder" :aria-label="ariaLabel ?? placeholder" class="h-6 min-w-20 flex-1 bg-transparent outline-none placeholder:text-fg-faint" />
      <ComboboxTrigger class="grid size-7 place-items-center text-fg-faint" aria-label="展开选项"><ChevronsUpDown class="size-4" /></ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="6" class="z-[100] max-w-[calc(100vw-24px)] max-h-72 w-(--reka-combobox-trigger-width) min-w-48 overflow-hidden rounded-lg border border-line bg-surface p-1 popup-surface data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <ComboboxViewport>
          <ComboboxEmpty class="px-3 py-6 text-center text-fg-muted">没有匹配的选项</ComboboxEmpty>
          <ComboboxItem v-for="o in filtered" :key="o.value" :value="o.value" class="relative flex min-h-8 cursor-pointer flex-col justify-center rounded-md py-1 pr-8 pl-2.5 outline-none select-none data-[highlighted]:bg-muted">
            <span>{{ o.label }}</span><span v-if="o.hint" class="text-xs text-fg-faint">{{ o.hint }}</span>
            <ComboboxItemIndicator class="absolute right-2.5 text-primary-text"><Check class="size-4" /></ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
