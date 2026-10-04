/** 读取列表与详情；转换步骤单独登记，使数据来源和后续处理可定位。 */
import { defineStep, type StepTools } from "@/shared/public";
import type { FilePage, FileView, ListWork, ItemWork } from "../data";
async function readPage(data: ListWork, tools: StepTools) {
  data.page = await tools.request<FilePage>("file_library.list", {
    params: { org: data.org },
    query: { offset: data.offset, limit: data.limit },
  });
}
function presentPage(data: ListWork) {
  data.result = { ...data.page, items: [...data.page.items] };
}
async function readFile(data: ItemWork, tools: StepTools) {
  data.file = await tools.request<FileView>("file_library.info", {
    params: { org: data.org, id: data.id },
  });
}
function presentFile(data: ItemWork) {
  data.result = { ...data.file };
}
export const readPageStep = defineStep<ListWork>({
  id: "file_library.read_page",
  title: "读取这一页的文件",
  rule: "R-01",
  reads: ["org", "offset", "limit"],
  writes: ["page"],
  uses: ["file_library.list"],
  run: readPage,
});
export const presentPageStep = defineStep<ListWork>({
  id: "file_library.present_page",
  title: "形成列表结果",
  rule: "R-01",
  reads: ["page"],
  writes: ["result"],
  uses: [],
  run: presentPage,
});
export const readFileStep = defineStep<ItemWork>({
  id: "file_library.read_file",
  title: "读取文件信息",
  rule: "R-02",
  reads: ["org", "id"],
  writes: ["file"],
  uses: ["file_library.info"],
  run: readFile,
});
export const presentFileStep = defineStep<ItemWork>({
  id: "file_library.present_file",
  title: "形成详情结果",
  rule: "R-02",
  reads: ["file"],
  writes: ["result"],
  uses: [],
  run: presentFile,
});
