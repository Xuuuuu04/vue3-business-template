/** 与 FastAPI 文件模块相同的路径和数据；演示服务使用这套 HTTP 约定。 */
import { z, type Endpoint } from "@/shared/public";
import { FileView, FilePage } from "./data";
export const endpoints: Endpoint[] = [
  {
    id: "file_library.list",
    title: "读取文件列表",
    method: "GET",
    path: "/api/v1/files/:org",
    response: FilePage,
  },
  {
    id: "file_library.info",
    title: "读取文件详情",
    method: "GET",
    path: "/api/v1/files/:org/:id/info",
    response: FileView,
  },
  {
    id: "file_library.upload",
    title: "上传文件",
    method: "POST",
    path: "/api/v1/files/:org",
    response: FileView,
  },
  {
    id: "file_library.delete",
    title: "删除文件",
    method: "DELETE",
    path: "/api/v1/files/:org/:id",
    response: z.null(),
  },
  {
    id: "file_library.download",
    title: "下载文件",
    method: "GET",
    path: "/api/v1/files/:org/:id/download",
    responseKind: "blob",
    response: z.instanceof(Blob),
  },
];
