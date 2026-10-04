<script setup lang="ts">
import type { TaskStatus } from "@/shared/state/task";
defineProps<{ status: TaskStatus; error?: string }>();
</script>
<template>
  <p v-if="status === 'loading'" class="status-message" role="status">
    正在处理，请稍候…
  </p>
  <div
    v-else-if="status === 'error' || status === 'unknown'"
    class="status-message status-error"
    role="alert"
  >
    <p>{{ error }}</p>
    <slot />
  </div>
</template>
