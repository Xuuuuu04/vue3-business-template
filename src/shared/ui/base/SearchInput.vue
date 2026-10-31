<script setup lang="ts">
import { Search, X } from "lucide-vue-next";
import UiInput from "./Input.vue";

const model = defineModel<string>({ default: "" });
defineProps<{ placeholder?: string; ariaLabel?: string }>();
</script>
<template>
  <UiInput
    v-model="model"
    type="search"
    :placeholder="placeholder"
    :aria-label="ariaLabel ?? placeholder"
  >
    <template #prefix><Search class="size-4" /></template>
    <template v-if="model" #suffix>
      <button
        type="button"
        class="-mx-2.5 grid h-full w-8 place-items-center text-fg-faint hover:text-fg"
        aria-label="清除搜索"
        @click="model = ''"
      >
        <X class="size-3.5" />
      </button>
    </template>
  </UiInput>
</template>
