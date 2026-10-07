<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from "reka-ui";
import { X } from "lucide-vue-next";
/** 右侧抽屉：从列表快速查看或处理，关闭后列表位置不变。 */
const open = defineModel<boolean>("open", { default: false });
defineProps<{ title: string; width?: "md" | "lg" }>();
</script>
<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-(--overlay) data-[state=open]:animate-[fade_.2s_ease-out]" />
      <DialogContent
        class="fixed top-0 right-0 bottom-0 z-50 flex w-full flex-col border-l border-line bg-surface popup-surface outline-none data-[state=open]:animate-[drawer-in_.28s_var(--ease)] data-[state=closed]:animate-[drawer-out_.2s_ease-in]"
        :class="width === 'lg' ? 'max-w-[640px]' : 'max-w-[460px]'"
      >
        <header class="flex items-center gap-3 border-b border-line px-6 py-5">
          <DialogTitle class="min-w-0 flex-1 truncate text-[18px] leading-6 font-semibold">{{ title }}</DialogTitle>
          <DialogDescription class="sr-only">{{ title }}</DialogDescription>
          <DialogClose class="grid size-8 place-items-center rounded-md text-fg-faint hover:bg-muted hover:text-fg" aria-label="关闭"><X class="size-4" /></DialogClose>
        </header>
        <div class="min-h-0 flex-1 overflow-auto p-6"><slot /></div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-6 py-4"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
