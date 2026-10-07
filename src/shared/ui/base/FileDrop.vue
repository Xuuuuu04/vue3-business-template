<script setup lang="ts">
import { ref } from "vue";
import { UploadCloud, X } from "lucide-vue-next";
import FileIcon from "./FileIcon.vue";
/** 文件选择：点击或拖入一个文件。大小限制只用于提示，真正的限制由后台检查。 */
const file = defineModel<File | undefined>({ default: undefined });
const props = defineProps<{ disabled?: boolean; accept?: string; hint?: string; label?: string; fill?: boolean }>();
const over = ref(false);
function pick(files: FileList | null | undefined) { if (files?.[0]) file.value = files[0]; }
function size(n: number) { return n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1e6).toFixed(1)} MB`; }
</script>
<template>
  <div :class="fill && 'flex min-h-64 flex-1 flex-col'">
    <label
      class="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-6 py-8 text-center transition-colors duration-150 focus-within:shadow-[0_0_0_3px_var(--ring)]"
      :class="[over ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong hover:bg-subtle', props.disabled && 'pointer-events-none opacity-50', fill && 'flex-1 justify-center']"
      @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="over = false; pick($event.dataTransfer?.files)"
    >
      <UploadCloud class="mb-3 size-10 text-fg-muted" :stroke-width="1.5" />
      <span class="text-[18px] font-medium">点击选择，或把文件拖到这里</span>
      <span v-if="hint" class="text-[13px] leading-6 text-fg-muted">{{ hint }}</span>
      <input type="file" class="sr-only" :aria-label="label ?? '选择文件'" :accept="accept" :disabled="disabled" @change="pick(($event.target as HTMLInputElement).files)" />
    </label>
    <div v-if="file" class="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <FileIcon :name="file.name" :type="file.type" />
      <span class="min-w-0 flex-1 truncate font-medium">{{ file.name }}</span>
      <span class="text-fg-faint tabular-nums">{{ size(file.size) }}</span>
      <button type="button" class="grid size-7 place-items-center rounded-md text-fg-faint hover:bg-muted hover:text-fg" aria-label="移除已选文件" @click="file = undefined"><X class="size-4" /></button>
    </div>
  </div>
</template>
