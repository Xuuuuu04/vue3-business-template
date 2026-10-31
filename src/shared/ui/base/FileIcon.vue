<script setup lang="ts">
import { computed } from "vue";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileChartColumn,
  FileCode,
} from "lucide-vue-next";
import { fileKind } from "../lib/format";

const props = defineProps<{
  name: string;
  type?: string;
  size?: "sm" | "lg";
  tone?: "neutral" | "color";
}>();
const kind = computed(() => fileKind(props.name, props.type));
const icon = computed(() => {
  if (kind.value.preview === "image") return FileImage;
  if (["CSV", "XLS", "XLSX"].includes(kind.value.ext)) return FileSpreadsheet;
  if (["ZIP", "RAR", "7Z", "GZ"].includes(kind.value.ext)) return FileArchive;
  if (["PPT", "PPTX"].includes(kind.value.ext)) return FileChartColumn;
  if (["MD", "JSON"].includes(kind.value.ext)) return FileCode;
  return FileText;
});
</script>
<template>
  <component
    :is="icon"
    class="shrink-0"
    :class="[
      size === 'lg' ? 'size-10' : 'size-[18px]',
      tone === 'color' ? 'text-(--file-icon)' : 'text-fg-muted',
    ]"
    :stroke-width="1.75"
    :style="tone === 'color' ? { '--file-hue': kind.hue } : undefined"
    :title="kind.label"
    aria-hidden="true"
  />
</template>
