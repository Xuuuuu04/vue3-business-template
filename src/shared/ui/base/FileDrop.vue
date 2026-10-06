<script setup lang="ts">
import { ref } from "vue";
import { UploadCloud, FileText, X } from "lucide-vue-next";
/** 文件选择：点击或拖入一个文件。大小限制只用于提示，真正的限制由后台检查。 */
const file = defineModel<File | undefined>({ default: undefined });
const props = defineProps<{ disabled?: boolean; accept?: string; hint?: string; label?: string }>();
const over = ref(false);
function pick(files: FileList | null | undefined) { if (files?.[0]) file.value = files[0]; }
function size(n: number) { return n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1000).toFixed(1)} KB` : `${(n / 1e6).toFixed(1)} MB`; }
</script>
<template>
  <div>
    <label
      class="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-6 py-8 text-center transition-colors duration-150 focus-within:shadow-[0_0_0_3px_var(--ring)]"
      :class="[over ? 'border-primary bg-primary-soft' : 'border-line-strong bg-subtle hover:border-fg-faint', props.disabled && 'pointer-events-none opacity-50']"
      @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="over = false; pick($event.dataTransfer?.files)"
    >
      <span class="grid size-10 place-items-center rounded-full bg-surface text-fg-muted shadow-card"><UploadCloud class="size-5" /></span>
      <span class="font-medium">点击选择，或把文件拖到这里</span>
      <span v-if="hint" class="text-[13px] text-fg-faint">{{ hint }}</span>
      <input type="file" class="sr-only" :aria-label="label ?? '选择文件'" :accept="accept" :disabled="disabled" @change="pick(($event.target as HTMLInputElement).files)" />
    </label>
    <div v-if="file" class="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
      <FileText class="size-5 shrink-0 text-fg-faint" />
      <span class="min-w-0 flex-1 truncate font-medium">{{ file.name }}</span>
      <span class="text-fg-faint tabular-nums">{{ size(file.size) }}</span>
      <button type="button" class="grid size-7 place-items-center rounded-md text-fg-faint hover:bg-muted hover:text-fg" aria-label="移除已选文件" @click="file = undefined"><X class="size-4" /></button>
    </div>
  </div>
</template>
