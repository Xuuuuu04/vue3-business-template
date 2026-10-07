<script setup lang="ts">
import { computed } from "vue";
import { Eye, FileQuestion } from "lucide-vue-next";
import Button from "../base/Button.vue";
import Skeleton from "../base/Skeleton.vue";
import FileIcon from "../base/FileIcon.vue";
import Markdown from "../ai/Markdown.vue";
import { formatBytes } from "../lib/format";
import { useFilePreview } from "../lib/file-preview";
/**
 * 文件预览：文本显示前 200 行，图片按比例显示；其他类型说明不能预览。
 * 不自动读取文件内容，用户点“显示预览”才发出 load 事件，由页面去取内容后传回 blob。
 */
const props = defineProps<{ name: string; type?: string; size: number; blob?: Blob; loading?: boolean; error?: string; fill?: boolean }>();
const emit = defineEmits<{ load: [] }>();
const { kind, canPreview, unavailable, lines, url, ready, reading, error: readError } = useFilePreview(props);
/** CSV 按表格显示：第一行是表头，最多 200 行；逗号分隔，不处理带引号的复杂格式。 */
const table = computed(() => kind.value.ext === "CSV" ? lines.value.filter((l) => l.trim()).map((l) => l.split(",")) : null);
</script>
<template>
  <div class="overflow-hidden border border-line bg-subtle" :class="fill ? 'flex min-h-64 flex-1 flex-col rounded-md' : 'rounded-lg'">
    <div v-if="loading || reading" class="flex flex-col gap-2.5 p-5"><Skeleton width="70%" /><Skeleton width="90%" /><Skeleton width="50%" /><Skeleton width="80%" /></div>
    <div v-else-if="ready && url" class="flex min-h-64 flex-1 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:20px_20px] p-6"><img :src="url" :alt="name" class="max-w-full rounded-md object-contain" :class="fill ? 'min-h-0 h-full max-h-full' : 'max-h-[480px]'" /></div>
    <div v-else-if="ready && table" :class="fill ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[480px] overflow-auto'">
      <table class="w-full border-separate border-spacing-0 text-label">
        <thead><tr><th v-for="(h, i) in table[0]" :key="i" class="sticky top-0 border-b border-line bg-muted px-3 py-2 text-left font-semibold whitespace-nowrap">{{ h }}</th></tr></thead>
        <tbody><tr v-for="(r, i) in table.slice(1)" :key="i" class="hover:bg-muted"><td v-for="(c, j) in r" :key="j" class="border-b border-line px-3 py-2 whitespace-nowrap tabular-nums" :class="/^-?[\d.,]+$/.test(c) && 'text-right'">{{ c }}</td></tr></tbody>
      </table>
    </div>
    <article v-else-if="ready && kind.ext === 'MD'" class="overflow-auto bg-surface px-6 py-8" :class="fill ? 'min-h-0 flex-1' : 'max-h-[480px]'">
      <div class="mx-auto w-full max-w-3xl"><Markdown :text="lines.join('\n')" variant="document" /></div>
    </article>
    <ol v-else-if="ready" class="overflow-auto py-4 font-mono text-label leading-6" :class="fill ? 'min-h-0 flex-1' : 'max-h-[480px]'">
      <li v-for="(l, i) in lines" :key="i" class="flex px-4 hover:bg-muted"><span class="w-10 shrink-0 pr-4 text-right text-fg-faint select-none tabular-nums">{{ i + 1 }}</span><span class="whitespace-pre-wrap break-all">{{ l || " " }}</span></li>
    </ol>
    <div v-else class="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <FileIcon :name="name" :type="type" size="lg" />
      <template v-if="canPreview">
        <p class="text-fg-muted">{{ kind.label }} · {{ formatBytes(size) }}</p>
        <Button @click="emit('load')"><Eye class="size-4" />显示预览</Button>
        <p v-if="error || readError" class="text-help text-bad" role="alert">{{ error || readError }}</p>
      </template>
      <template v-else>
        <p class="flex items-center gap-1.5 font-medium"><FileQuestion class="size-4 text-fg-faint" />{{ unavailable }}</p>
        <p class="text-help text-fg-muted">下载后用对应的软件打开。</p>
        <slot name="unsupported" />
      </template>
    </div>
  </div>
</template>
