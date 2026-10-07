<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { UploadCloud, X } from "lucide-vue-next";
import FileIcon from "./FileIcon.vue";
/** 文件选择：点击或拖入一个文件。大小限制只用于提示，真正的限制由后台检查。 */
const file = defineModel<File | undefined>({ default: undefined });
const props = defineProps<{ disabled?: boolean; accept?: string; hint?: string; label?: string; fill?: boolean }>();
const over = ref(false);
const input = ref<HTMLInputElement>();
// dragenter / dragleave 会从子元素冒泡，记录仍在区域内的层数，避免文字与图标让高亮闪烁。
let dragDepth = 0;
function resetDrag() { dragDepth = 0; over.value = false; }
function isFileDrag(event: DragEvent) { return !props.disabled && event.dataTransfer?.types.includes("Files"); }
function enter(event: DragEvent) { if (isFileDrag(event)) { dragDepth++; over.value = true; } }
function leave() { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) over.value = false; }
function drag(event: DragEvent) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = isFileDrag(event) ? "copy" : "none";
}
function pick(files: FileList | null | undefined) { if (!props.disabled && files?.[0]) file.value = files[0]; }
function drop(event: DragEvent) { resetDrag(); pick(event.dataTransfer?.files); }
function choose(event: Event) {
  const target = event.target as HTMLInputElement;
  pick(target.files);
  // 清空原生选择值，移除后重新选择同一文件也会触发 change。
  target.value = "";
}
async function remove() { if (!props.disabled) { file.value = undefined; await nextTick(); input.value?.focus(); } }
watch(() => props.disabled, resetDrag);
function size(n: number) { return n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1e6).toFixed(1)} MB`; }
</script>
<template>
  <div :class="fill && 'flex min-h-64 flex-1 flex-col'">
    <label
      class="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors duration-(--motion-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)]"
      :data-dragging="over || undefined"
      :aria-disabled="disabled || undefined"
      :class="[over ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-subtle', props.disabled && 'cursor-not-allowed opacity-50', fill && 'flex-1 justify-center']"
      @dragenter.prevent="enter" @dragover.prevent="drag" @dragleave.prevent="leave" @drop.prevent="drop" @dragend="resetDrag"
    >
      <UploadCloud class="mb-3 size-10 text-fg-muted" :stroke-width="1.5" />
      <span class="text-[18px] leading-6 font-medium">{{ over ? '松开即可选择文件' : '点击选择，或把文件拖到这里' }}</span>
      <span v-if="hint" class="text-help leading-6 text-fg-muted">{{ hint }}</span>
      <input ref="input" type="file" class="sr-only" :aria-label="label ?? '选择文件'" :accept="accept" :disabled="disabled" @change="choose" />
    </label>
    <div v-if="file" class="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <FileIcon :name="file.name" :type="file.type" />
      <span class="min-w-0 flex-1 truncate font-medium">{{ file.name }}</span>
      <span class="text-label text-fg-muted tabular-nums">{{ size(file.size) }}</span>
      <button type="button" class="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted transition-colors duration-(--motion-fast) hover:bg-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40" :disabled="disabled" aria-label="移除已选文件" @click="remove"><X class="size-4" /></button>
    </div>
  </div>
</template>
