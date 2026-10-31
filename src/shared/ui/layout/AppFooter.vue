<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  company: string;
  icp?: string;
  version?: string;
  links?: { label: string; to?: string; href?: string }[];
}>();
const year = new Date().getFullYear();
</script>
<template>
  <footer
    class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-faint"
  >
    <span>© {{ year }} {{ company }}</span>
    <a
      v-if="icp"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-fg-muted hover:underline"
      >{{ icp }}</a
    >
    <template v-for="l in links" :key="l.label">
      <RouterLink
        v-if="l.to"
        :to="l.to"
        class="hover:text-fg-muted hover:underline"
        >{{ l.label }}</RouterLink
      >
      <a
        v-else
        :href="l.href"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-fg-muted hover:underline"
        >{{ l.label }}</a
      >
    </template>
    <span v-if="version" class="tabular-nums">v{{ version }}</span>
  </footer>
</template>
