import { onBeforeUnmount, onMounted, type Ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
export function useUnsaved(
  dirty: Ref<boolean>,
  message = "有未保存的修改。确认离开吗？",
) {
  const before = (event: BeforeUnloadEvent) => {
    if (dirty.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  onMounted(() => window.addEventListener("beforeunload", before));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", before));
  onBeforeRouteLeave(() => !dirty.value || window.confirm(message));
}

export function saveDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
