<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { saveDownload, useSession } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  WorkArea,
  UiAccordion,
  DescriptionList,
  FilePreview,
  UiButton,
  UiDialog,
  UiFileIcon,
  UiCopy,
  UiTag,
  UiSkeleton,
  fileKind,
  formatBytes,
  formatDateTime,
} from "@/shared/ui/public";
import { useFileLibrary, type FileView } from "../public";
const route = useRoute();
const router = useRouter();
const { detail, remove, download, preview } = useFileLibrary();
const session = useSession();
const org = session.state.value.org;
const id = computed(() => String(route.params.id));
const state = detail.state;
const removal = remove.state;
const downloading = download.state;
// 列表与同一文件刷新可保留旧数据；详情只能显示属于当前编号的结果。
const file = computed(() =>
  state.value.data?.id === id.value ? state.value.data : undefined,
);
const confirmedFile = ref<FileView>();
const confirm = computed({
  get: () => !!confirmedFile.value,
  set: (open: boolean) => {
    confirmedFile.value = open ? file.value : undefined;
  },
});
const returnTo = computed(() =>
  String(route.query.returnTo || "").startsWith("/files?")
    ? String(route.query.returnTo)
    : "/files",
);
/** 预览内容只属于当前文件；换文件时清空，等用户再点“显示预览”。 */
const previewOf = ref("");
const previewBlob = computed(() =>
  previewOf.value === id.value && preview.state.value.status === "success"
    ? preview.state.value.data
    : undefined,
);
const fields = computed(() =>
  file.value
    ? [
        {
          label: "类型",
          value: `${fileKind(file.value.name, file.value.content_type).label} · .${fileKind(file.value.name, file.value.content_type).ext.toLowerCase()}`,
        },
        {
          label: "大小",
          value: `${formatBytes(file.value.size)}（${file.value.size.toLocaleString("zh-CN")} 字节）`,
        },
        { label: "保存时间", value: formatDateTime(file.value.created_at) },
        { label: "文件编号", key: "id" },
        { label: "SHA-256", key: "sha" },
      ]
    : [],
);
watch(
  id,
  () => {
    confirm.value = false;
    previewOf.value = "";
    void detail.run({ org, id: id.value });
  },
  { immediate: true },
);
function loadPreview() {
  if (!file.value) return;
  previewOf.value = file.value.id;
  void preview.run({ org, id: file.value.id });
}
async function deleteConfirmed() {
  const target = confirmedFile.value;
  if (!target || target.id !== file.value?.id) return;
  const destination = returnTo.value;
  const result = await remove.run({ org, id: target.id });
  if (result === null && target.id === id.value) {
    confirm.value = false;
    void router.push(destination);
  }
}
async function downloadCurrent() {
  const target = file.value;
  if (!target) return;
  const blob = await download.run({ org, id: target.id });
  if (blob) saveDownload(blob, target.name);
}
</script>
<template>
  <PageFrame :title="file?.name || '文件详情'" :back="returnTo" workspace>
    <template v-if="file" #icon
      ><UiFileIcon :name="file.name" :type="file.content_type"
    /></template>
    <template #actions
      ><UiButton
        v-if="file && session.can('file_library.write')"
        variant="danger-quiet"
        icon="delete"
        :disabled="removal.status === 'unknown'"
        @click="confirm = true"
        >删除</UiButton
      ><UiButton
        v-if="file"
        variant="primary"
        icon="download"
        :loading="downloading.status === 'loading'"
        @click="downloadCurrent"
        >下载原文件</UiButton
      ></template
    >
    <template #status>
      <StatusMessage :status="state.status" :error="state.error" />
      <StatusMessage :status="downloading.status" :error="downloading.error" />
      <StatusMessage :status="removal.status" :error="removal.error"
        ><UiButton @click="detail.run({ org, id })"
          >查询文件是否仍然存在</UiButton
        >
        <p>
          结果未确认时请不要再次删除。可返回列表查看最新结果。
        </p></StatusMessage
      >
    </template>
    <WorkArea fill>
      <template v-if="file">
        <UiAccordion :items="[{ value: 'info', title: '文件信息' }]">
          <template #item-info>
            <DescriptionList :items="fields" :columns="2">
              <template #value-id
                ><UiTag tone="code">{{ file.id }}</UiTag
                ><UiCopy :text="file.id" label="复制文件编号"
              /></template>
              <template #value-sha
                ><UiTag tone="code"
                  >{{ file.sha256.slice(0, 10) }}…{{
                    file.sha256.slice(-8)
                  }}</UiTag
                ><UiCopy :text="file.sha256" label="复制完整校验值"
              /></template>
            </DescriptionList>
          </template>
        </UiAccordion>
        <FilePreview
          fill
          :name="file.name"
          :type="file.content_type"
          :size="file.size"
          :blob="previewBlob"
          :loading="
            previewOf === id && preview.state.value.status === 'loading'
          "
          :error="previewOf === id ? preview.state.value.error : undefined"
          @load="loadPreview"
        />
      </template>
      <UiSkeleton v-else-if="state.status === 'loading'" height="240px" />
    </WorkArea>
    <UiDialog
      v-model:open="confirm"
      title="删除这个文件？"
      :description="`「${confirmedFile?.name}」删除后不能恢复，也无法再从这里下载。`"
      ><template #footer
        ><UiButton
          :disabled="removal.status === 'loading'"
          @click="confirm = false"
          >保留文件</UiButton
        ><UiButton
          variant="danger"
          :loading="removal.status === 'loading'"
          :disabled="removal.status === 'unknown'"
          @click="deleteConfirmed"
          >确认删除</UiButton
        ></template
      ></UiDialog
    >
  </PageFrame>
</template>
