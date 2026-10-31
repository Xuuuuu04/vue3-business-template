<script setup lang="ts">
import { UiTag } from "@/shared/ui/public";
import { recipes } from "./design-preview-content";
defineProps<{ example: string }>();
</script>
<template>
  <template v-if="example === 'recipes'">
    <dl class="divide-y divide-line">
      <div
        v-for="[name, how] in recipes"
        :key="name"
        class="grid gap-2 py-5 first:pt-0 sm:grid-cols-[104px_1fr] sm:gap-6"
      >
        <dt class="font-medium">{{ name }}</dt>
        <dd class="text-fg-muted">{{ how }}</dd>
      </div>
    </dl>
    <p class="text-help text-fg-muted">
      完整规则与用法见 <UiTag tone="code">src/shared/ui/README.md</UiTag>。
    </p>
  </template>
</template>
