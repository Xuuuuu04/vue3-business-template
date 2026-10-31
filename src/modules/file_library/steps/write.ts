import { defineStep, type StepTools } from "@/shared/public";
import type { UploadWork, FileView, DeleteWork, DownloadWork } from "../data";
function prepareUpload(data: UploadWork) {
  if (!data.file.size) throw new Error("不能上传空文件");
  if (data.file.size > 10_000_000)
    throw new Error("样板上传限制为 10 MB，请选择更小的文件");
  data.body = new FormData();
  data.body.append("upload", data.file);
}
async function uploadFile(data: UploadWork, tools: StepTools) {
  data.result = await tools.request<FileView>("file_library.upload", {
    params: { org: data.org },
    body: data.body,
  });
}
async function deleteFile(data: DeleteWork, tools: StepTools) {
  data.result = await tools.request<null>("file_library.delete", {
    params: { org: data.org, id: data.id },
  });
}
async function downloadFile(data: DownloadWork, tools: StepTools) {
  data.result = await tools.request<Blob>("file_library.download", {
    params: { org: data.org, id: data.id },
  });
}
export const prepareUploadStep = defineStep<UploadWork>({
  id: "file_library.prepare_upload",
  title: "检查文件并准备上传",
  rule: "R-03",
  reads: ["file"],
  writes: ["body"],
  uses: [],
  run: prepareUpload,
});
export const uploadFileStep = defineStep<UploadWork>({
  id: "file_library.upload_file",
  title: "保存文件",
  rule: "R-03",
  reads: ["org", "body"],
  writes: ["result"],
  uses: ["file_library.upload"],
  run: uploadFile,
});
export const deleteFileStep = defineStep<DeleteWork>({
  id: "file_library.delete_file",
  title: "删除已确认的文件",
  rule: "R-04",
  reads: ["org", "id"],
  writes: ["result"],
  uses: ["file_library.delete"],
  run: deleteFile,
});
export const downloadFileStep = defineStep<DownloadWork>({
  id: "file_library.download_file",
  title: "读取下载内容",
  rule: "R-05",
  reads: ["org", "id"],
  writes: ["result"],
  uses: ["file_library.download"],
  run: downloadFile,
});
