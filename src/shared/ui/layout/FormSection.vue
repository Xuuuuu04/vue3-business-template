<script setup lang="ts">
import { useId } from "vue";
defineProps<{ title: string; text?: string; layout?: "split" | "stacked" }>();
const id = `section-${useId()}`;
</script>
<template>
  <section
    :id="id"
    :data-form-section="title"
    class="scroll-mt-4 grid gap-4 border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0"
    :class="
      layout !== 'stacked' &&
      'md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)] md:gap-8'
    "
  >
    <div>
      <h3 class="font-medium leading-6">{{ title }}</h3>
      <p v-if="text" class="mt-1 text-help text-fg-muted">{{ text }}</p>
    </div>
    <div class="flex min-w-0 flex-col gap-4"><slot /></div>
  </section>
</template>
