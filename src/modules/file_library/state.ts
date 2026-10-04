/** 每个页面持有自己的动作实例，离开时取消读取；输出对页面只读。 */
import { onBeforeUnmount } from "vue";
import { createTask } from "@/shared/public";
import { endpoints } from "./api";
import {
  listFiles,
  getFile,
  uploadFile,
  deleteFile,
  downloadFile,
} from "./flow";
export function useFileLibrary() {
  const list = createTask(listFiles, endpoints, "latest");
  const detail = createTask(getFile, endpoints, "latest");
  const upload = createTask(uploadFile, endpoints, "submit");
  const remove = createTask(deleteFile, endpoints, "submit");
  const download = createTask(downloadFile, endpoints, "submit");
  onBeforeUnmount(() => {
    for (const task of [list, detail, upload, remove, download]) task.dispose();
  });
  return { list, detail, upload, remove, download };
}
/** 大小单位只做展示，业务中始终保留字节。 */
export function fileSize(size: number): string {
  return size < 1000
    ? `${size} B`
    : size < 1_000_000
      ? `${(size / 1000).toFixed(1)} KB`
      : `${(size / 1_000_000).toFixed(1)} MB`;
}
export function fileDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
