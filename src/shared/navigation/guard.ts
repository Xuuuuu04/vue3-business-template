/** 未保存输入的退出提醒同时覆盖页面导航和浏览器关闭。 */
import { onBeforeUnmount, onMounted, type Ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
export function useUnsaved(dirty: Ref<boolean>, message = "已选择的文件尚未上传。确认离开吗？") {
  const before = (event: BeforeUnloadEvent) => {
    if (dirty.value) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  onMounted(() => window.addEventListener("beforeunload", before));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", before));
  onBeforeRouteLeave(
    () => !dirty.value || window.confirm(message),
  );
}
/** 下载地址由框架回收，业务组件不自己管理浏览器资源。 */
export function saveDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
