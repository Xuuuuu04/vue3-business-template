<script setup lang="ts">
import { computed, watch } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import UiSelect from "./Select.vue";

const page = defineModel<number>("page", { required: true });
const pageSize = defineModel<number>("pageSize", { required: true });
const props = defineProps<{
  total: number;
  sizes?: number[];
  loading?: boolean;
}>();
const pages = computed(() =>
  Math.max(1, Math.ceil(props.total / pageSize.value)),
);

watch(
  [page, pages, () => props.loading],
  () => {
    if (props.loading) return;
    const valid = Math.min(
      pages.value,
      Math.max(1, Number.isSafeInteger(page.value) ? page.value : 1),
    );
    if (page.value !== valid) page.value = valid;
  },
  { immediate: true },
);

const shown = computed<(number | "…")[]>(() => {
  const n = pages.value,
    p = page.value;
  const set = new Set([1, n, p - 1, p, p + 1].filter((x) => x >= 1 && x <= n));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((x, i) => {
    if (i && x - sorted[i - 1]! > 1) out.push("…");
    out.push(x);
  });
  return out;
});
const sizeOptions = computed(() =>
  (props.sizes ?? [10, 20, 50]).map((s) => ({
    value: String(s),
    label: `${s} 条/页`,
  })),
);
function setSize(v: string) {
  pageSize.value = Number(v);
  page.value = 1;
}
</script>
<template>
  <div class="flex items-center gap-4">
    <div v-if="(sizes?.length ?? 3) > 1" class="w-28">
      <UiSelect
        :model-value="String(pageSize)"
        :options="sizeOptions"
        aria-label="每页条数"
        @update:model-value="setSize"
      />
    </div>
    <nav class="flex items-center gap-1" aria-label="分页">
      <button
        type="button"
        class="grid size-8 max-sm:size-10 place-items-center rounded-md border border-line text-fg-muted hover:bg-subtle disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="page--"
      >
        <ChevronLeft class="size-4" />
      </button>
      <span
        class="min-w-12 text-center text-help tabular-nums sm:hidden"
        :aria-label="`第 ${page} 页，共 ${pages} 页`"
        aria-current="page"
        >{{ page }} / {{ pages }}</span
      >
      <template v-for="(p, i) in shown" :key="i">
        <span v-if="p === '…'" class="hidden px-1 text-fg-faint sm:inline"
          >…</span
        >
        <button
          v-else
          type="button"
          class="hidden h-8 min-w-8 rounded-md border px-2 tabular-nums sm:block"
          :class="
            p === page
              ? 'border-primary bg-primary font-medium text-primary-ink'
              : 'border-line text-fg hover:bg-subtle'
          "
          :aria-current="p === page ? 'page' : undefined"
          @click="page = p"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="grid size-8 max-sm:size-10 place-items-center rounded-md border border-line text-fg-muted hover:bg-subtle disabled:opacity-40"
        :disabled="page >= pages"
        aria-label="下一页"
        @click="page++"
      >
        <ChevronRight class="size-4" />
      </button>
    </nav>
  </div>
</template>
