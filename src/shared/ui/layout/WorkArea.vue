<script setup lang="ts">
import { ref, useSlots } from "vue";
import FormOutline from "./FormOutline.vue";
const props = defineProps<{
  form?: boolean;
  fill?: boolean;
  plain?: boolean;
  asideTitle?: string;
}>();
const slots = useSlots();
const body = ref<HTMLElement>();
</script>
<template>
  <div
    class="work-area"
    :class="{
      'work-area-form': form && plain,
      'work-area-fill': fill,
      'work-area-form-grid': form && !plain,
    }"
  >
    <template v-if="form && !plain">
      <div ref="body" class="work-area-form-body"><slot /></div>
      <aside class="work-area-aside">
        <slot name="aside"><FormOutline v-if="body" :root="body" /></slot>
      </aside>
    </template>
    <div v-else-if="slots.aside" class="work-area-split">
      <div class="flex min-w-0 flex-col gap-(--space-section)"><slot /></div>
      <aside class="work-area-side" :aria-label="asideTitle">
        <h2 v-if="asideTitle" class="work-area-side-title">{{ asideTitle }}</h2>
        <slot name="aside" />
      </aside>
    </div>
    <slot v-else />
  </div>
</template>
