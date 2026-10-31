<script setup lang="ts">
import { CircleCheck, CircleX, Info, Clock } from "lucide-vue-next";

defineProps<{
  status: "success" | "error" | "info" | "pending";
  title: string;
  text?: string;
}>();
</script>
<template>
  <div class="flex flex-col items-center gap-3 px-6 py-14 text-center">
    <span
      class="grid size-16 place-items-center rounded-full"
      :class="
        {
          success: 'bg-ok-soft text-ok',
          error: 'bg-bad-soft text-bad',
          info: 'bg-info-soft text-info',
          pending: 'bg-warn-soft text-warn',
        }[status]
      "
    >
      <component
        :is="
          { success: CircleCheck, error: CircleX, info: Info, pending: Clock }[
            status
          ]
        "
        class="size-8"
      />
    </span>
    <h2 class="mt-2 text-xl font-semibold tracking-tight">{{ title }}</h2>
    <p v-if="text" class="max-w-md text-fg-muted">{{ text }}</p>
    <div v-if="$slots.default" class="mt-3 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
    <div
      v-if="$slots.extra"
      class="mt-6 w-full max-w-lg rounded-lg border border-line bg-subtle p-4 text-left"
    >
      <slot name="extra" />
    </div>
  </div>
</template>
