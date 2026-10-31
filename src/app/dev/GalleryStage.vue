<script setup lang="ts">
import { computed } from "vue";
import { SelectList, UiSelect, UiTag } from "@/shared/ui/public";

export interface GalleryExample {
  value: string;
  label: string;
  components: string;
  form?: boolean;
}
const props = defineProps<{ items: GalleryExample[] }>();
const selected = defineModel<string>({ required: true });
const current = computed(() =>
  props.items.find((item) => item.value === selected.value)!,
);
</script>
<template>
  <div
    class="grid min-h-0 flex-1 gap-6 lg:grid-cols-[176px_minmax(0,1fr)]"
    data-component-gallery
  >
    <aside
      class="hidden min-h-0 overflow-auto border-r border-line pr-4 lg:block"
    >
      <SelectList
        v-model="selected"
        :items="items"
        label="组件示例"
        class="[&_button]:text-[14px]"
      />
    </aside>
    <section
      class="flex min-h-0 min-w-0 flex-col"
      :aria-label="`${current.label}示例`"
      data-gallery-preview
    >
      <header
        class="flex shrink-0 items-center gap-3 border-b border-line pb-4"
      >
        <h2 class="hidden min-w-0 flex-1 text-[20px] font-semibold lg:block">
          {{ current.label }}
        </h2>
        <div class="min-w-0 flex-1 lg:hidden">
          <UiSelect
            v-model="selected"
            :options="items"
            aria-label="查看组件示例"
          />
        </div>
        <span class="hidden lg:inline-flex"
          ><UiTag tone="code">{{ current.components }}</UiTag></span
        >
      </header>
      <div
        class="flex min-h-0 flex-1 flex-col gap-6 overflow-auto pt-6"
        :class="current.form && 'max-w-[760px]'"
        :key="selected"
      >
        <slot :name="selected" />
      </div>
    </section>
  </div>
</template>
