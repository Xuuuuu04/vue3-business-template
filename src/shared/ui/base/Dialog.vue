<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from "reka-ui";
import { X } from "lucide-vue-next";
/** 需要暂停当前操作的短决定。说明对象、后果和退出方式；长内容改用独立页面。 */
const open = defineModel<boolean>("open", { default: false });
defineProps<{ title: string; description?: string; width?: "sm" | "md" | "lg" }>();
</script>
<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-(--overlay) data-[state=open]:animate-[fade_.15s_ease-out]" />
      <DialogContent
        class="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-line bg-surface shadow-pop outline-none data-[state=open]:animate-[dialog-in_.2s_var(--ease)]"
        :class="width === 'lg' ? 'max-w-2xl' : width === 'sm' ? 'max-w-sm' : 'max-w-md'"
      >
        <header class="flex items-start gap-3 px-5 pt-5">
          <div class="min-w-0 flex-1">
            <DialogTitle class="text-base font-semibold">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-fg-muted">{{ description }}</DialogDescription>
            <DialogDescription v-else class="sr-only">{{ title }}</DialogDescription>
          </div>
          <DialogClose class="-mt-1 -mr-1 grid size-8 place-items-center rounded-md text-fg-faint hover:bg-muted hover:text-fg" aria-label="关闭"><X class="size-4" /></DialogClose>
        </header>
        <div class="min-h-0 flex-1 overflow-auto px-5 py-4"><slot /></div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-5 py-3"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
