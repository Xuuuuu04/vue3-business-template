/** 按实际内容限制预览，并在换文件或组件退出后忽略旧读取。 */
import { computed, ref, watch } from "vue";
import { fileKind } from "./format";

export interface PreviewSource {
  name: string;
  type?: string;
  size: number;
  blob?: Blob;
}

/** 文本最多读取 1 MiB，只显示前 200 行。 */
export const TEXT_PREVIEW_LIMIT = 1024 * 1024;
const LINE_LIMIT = 200;

export function useFilePreview(source: PreviewSource) {
  const kind = computed(() => fileKind(source.name, source.type));
  const bytes = computed(() => source.blob?.size ?? source.size);
  const unavailable = computed(() => {
    if (kind.value.preview === "none") return `${kind.value.label}不能在浏览器里预览`;
    if (kind.value.preview === "text" && bytes.value > TEXT_PREVIEW_LIMIT)
      return "文本超过 1 MB，无法在浏览器里预览";
    return "";
  });
  const canPreview = computed(() => !unavailable.value);
  const lines = ref<string[]>([]);
  const url = ref("");
  const ready = ref(false);
  const reading = ref(false);
  const error = ref("");

  watch(
    () => [source.blob, source.name, source.type, source.size] as const,
    async ([blob], _previous, onCleanup) => {
      let current = true;
      let imageUrl = "";
      onCleanup(() => {
        current = false;
        if (imageUrl) URL.revokeObjectURL(imageUrl);
      });
      url.value = "";
      lines.value = [];
      ready.value = false;
      reading.value = false;
      error.value = "";
      if (!blob || !canPreview.value) return;
      if (kind.value.preview === "image") {
        imageUrl = URL.createObjectURL(blob);
        url.value = imageUrl;
        ready.value = true;
        return;
      }
      reading.value = true;
      try {
        const text = await blob.text();
        if (!current) return;
        lines.value = text.split("\n", LINE_LIMIT);
        ready.value = true;
      } catch {
        if (current) error.value = "文件内容无法读取，请重新获取预览或下载原文件。";
      } finally {
        if (current) reading.value = false;
      }
    },
    { immediate: true },
  );

  return { kind, canPreview, unavailable, lines, url, ready, reading, error };
}
