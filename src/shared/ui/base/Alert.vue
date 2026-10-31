<script setup lang="ts">
import { ref } from "vue";
import { Info, CircleCheck, TriangleAlert, CircleX, X } from "lucide-vue-next";

defineProps<{
  tone?: "info" | "ok" | "warn" | "bad";
  title?: string;
  text?: string;
  closable?: boolean;
}>();
const shown = ref(true);
</script>
<template>
  <div
    v-if="shown"
    class="flex items-start gap-3 rounded-lg border px-4 py-3"
    :class="
      {
        info: 'border-info/20 bg-info-soft/35',
        ok: 'border-ok/20 bg-ok-soft/35',
        warn: 'border-warn/20 bg-warn-soft/35',
        bad: 'border-bad/20 bg-bad-soft/35',
      }[tone ?? 'info']
    "
    :role="tone === 'bad' || tone === 'warn' ? 'alert' : 'status'"
  >
    <component
      :is="
        { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: CircleX }[
          tone ?? 'info'
        ]
      "
      class="mt-0.5 size-4 shrink-0"
      :class="
        {
          info: 'text-info',
          ok: 'text-ok',
          warn: 'text-warn',
          bad: 'text-bad',
        }[tone ?? 'info']
      "
    />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-medium">{{ title }}</p>
      <p v-if="text" :class="title && 'mt-0.5 text-fg-muted'">{{ text }}</p>
      <div v-if="$slots.default" class="mt-2 flex flex-wrap gap-2">
        <slot />
      </div>
    </div>
    <button
      v-if="closable"
      type="button"
      class="-mt-0.5 -mr-1 grid size-6 place-items-center rounded-md text-fg-faint hover:bg-surface/60 hover:text-fg"
      aria-label="关闭提示"
      @click="shown = false"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>
