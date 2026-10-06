<script setup lang="ts">
/** 表单字段：名称、控件、提示或错误。错误替换提示，位置固定在控件下方。 */
defineProps<{ label: string; for?: string; hint?: string; error?: string; required?: boolean }>();
</script>
<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label :for="$props.for" class="font-medium">{{ label }}<span v-if="required" class="ml-0.5 text-bad" aria-hidden="true">*</span></label>
    <slot />
    <p v-if="error" class="text-[13px] text-bad" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="text-[13px] text-fg-faint">{{ hint }}</p>
  </div>
</template>
