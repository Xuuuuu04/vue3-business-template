<script setup lang="ts">
import { computed } from "vue";
import Avatar from "./Avatar.vue";

const props = defineProps<{
  people: { name: string; src?: string }[];
  max?: number;
  size?: "xs" | "sm" | "md";
}>();
const shown = computed(() => props.people.slice(0, props.max ?? 4));
const rest = computed(() => props.people.length - shown.value.length);
</script>
<template>
  <span
    class="inline-flex items-center"
    :aria-label="people.map((p) => p.name).join('、')"
  >
    <span v-for="(p, i) in shown" :key="p.name" :class="i > 0 && '-ml-2'"
      ><Avatar :name="p.name" :src="p.src" :size="size ?? 'sm'"
    /></span>
    <span
      v-if="rest > 0"
      class="-ml-2 grid size-6 place-items-center rounded-full bg-muted text-[12px] font-semibold text-fg-muted ring-2 ring-surface"
      >+{{ rest }}</span
    >
  </span>
</template>
