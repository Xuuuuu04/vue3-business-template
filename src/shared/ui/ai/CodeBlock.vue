<script setup lang="ts">
import CopyButton from "../base/CopyButton.vue";

defineProps<{ code: string; lang?: string }>();
</script>
<template>
  <div class="overflow-hidden rounded-lg border border-line bg-subtle">
    <div
      class="flex h-8 items-center justify-between border-b border-line pr-1 pl-3 text-xs text-fg-faint"
    >
      <span>{{ lang || "代码" }}</span
      ><CopyButton :text="code" label="复制代码" />
    </div>
    <pre
      class="overflow-x-auto p-3 font-mono text-help leading-6"
    ><code>{{ code }}</code></pre>
  </div>
</template>
