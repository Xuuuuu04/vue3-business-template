/** 关键业务动作的计算图；字段含义、步骤与接口保持同一份定义。 */
import { z, defineAction, type Fields } from "@/shared/public";
import { FileView, FilePage, ListInput, ItemInput, UploadInput } from "./data";
import {
  readPageStep,
  presentPageStep,
  readFileStep,
  presentFileStep,
} from "./steps/read";
import {
  prepareUploadStep,
  uploadFileStep,
  deleteFileStep,
  downloadFileStep,
} from "./steps/write";
const identity: Fields = {
  org: { title: "文件所属团队代码", schema: z.string() },
  id: { title: "文件编号", schema: z.string() },
};
export const listFiles = defineAction<z.infer<typeof ListInput>, FilePage>({
  id: "file_library.list",
  title: "查看文件列表",
  permission: "file_library.read",
  input: ListInput,
  inputFields: ["org", "offset", "limit"],
  result: "result",
  fields: {
    org: identity.org!,
    offset: { title: "起始位置，从零计数", schema: z.number() },
    limit: { title: "本页最多显示数量", schema: z.number() },
    page: { title: "后台返回的一页", schema: FilePage },
    result: { title: "页面显示的一页", schema: FilePage },
  },
  steps: [readPageStep, presentPageStep],
});
export const getFile = defineAction<z.infer<typeof ItemInput>, FileView>({
  id: "file_library.info",
  title: "查看文件详情",
  permission: "file_library.read",
  input: ItemInput,
  inputFields: ["org", "id"],
  result: "result",
  fields: {
    ...identity,
    file: { title: "后台文件信息", schema: FileView },
    result: { title: "详情显示信息", schema: FileView },
  },
  steps: [readFileStep, presentFileStep],
});
export const uploadFile = defineAction<z.infer<typeof UploadInput>, FileView>({
  id: "file_library.upload",
  title: "上传文件",
  permission: "file_library.write",
  input: UploadInput,
  inputFields: ["org", "file"],
  result: "result",
  fields: {
    org: identity.org!,
    file: { title: "选择的文件内容", schema: z.instanceof(File), secret: true },
    body: { title: "上传正文", schema: z.instanceof(FormData), secret: true },
    result: { title: "已保存文件信息", schema: FileView },
  },
  steps: [prepareUploadStep, uploadFileStep],
});
export const deleteFile = defineAction<z.infer<typeof ItemInput>, null>({
  id: "file_library.delete",
  title: "删除文件",
  permission: "file_library.write",
  input: ItemInput,
  inputFields: ["org", "id"],
  result: "result",
  fields: { ...identity, result: { title: "删除完成", schema: z.null() } },
  steps: [deleteFileStep],
});
export const downloadFile = defineAction<z.infer<typeof ItemInput>, Blob>({
  id: "file_library.download",
  title: "下载文件",
  permission: "file_library.read",
  input: ItemInput,
  inputFields: ["org", "id"],
  result: "result",
  fields: {
    ...identity,
    result: { title: "下载文件内容", schema: z.instanceof(Blob), secret: true },
  },
  steps: [downloadFileStep],
});
export const actions = [
  listFiles,
  getFile,
  uploadFile,
  deleteFile,
  downloadFile,
];
