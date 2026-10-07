<script setup lang="ts">
import { ref } from "vue";
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, PopoverArrow } from "reka-ui";
import { TriangleAlert } from "lucide-vue-next";
import Button from "./Button.vue";
/** 气泡确认：影响小、可恢复的操作（移除一行、取消关注）就近确认；影响大的用 UiDialog。 */
defineProps<{ title: string; text?: string; confirmText?: string; danger?: boolean }>();
const emit = defineEmits<{ confirm: [] }>();
const open = ref(false);
function ok() { open.value = false; emit("confirm"); }
</script>
<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child><slot /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent :side-offset="8" class="z-[100] w-64 rounded-lg border border-line bg-surface p-3.5 popup-surface data-[state=open]:animate-[pop_.14s_var(--ease)]" role="alertdialog" :aria-label="title">
        <div class="flex gap-2.5"><TriangleAlert class="mt-0.5 size-4 shrink-0" :class="danger ? 'text-bad' : 'text-warn'" /><div><p class="font-medium">{{ title }}</p><p v-if="text" class="mt-0.5 text-[13px] text-fg-muted">{{ text }}</p></div></div>
        <div class="mt-3 flex justify-end gap-2"><Button size="sm" @click="open = false">取消</Button><Button size="sm" :variant="danger ? 'danger' : 'primary'" @click="ok">{{ confirmText ?? "确定" }}</Button></div>
        <PopoverArrow class="fill-surface" :width="12" :height="6" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
