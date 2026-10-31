<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { saveDownload, useSession, useBatch } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  DataTable,
  FilterItem,
  Row,
  UiButton,
  UiSearchInput,
  UiEmpty,
  UiFileIcon,
  UiTag,
  UiTime,
  UiTip,
  UiDialog,
  BatchProgress,
  fileKind,
  formatBytes,
  type DataColumn,
  type SortState,
} from "@/shared/ui/public";
import { useFileLibrary, type FileView } from "../public";

const SIZES = [10, 20, 50];
const route = useRoute();
const router = useRouter();
const { list, download, remove } = useFileLibrary();
const session = useSession();
const org = session.state.value.org;
const size = computed(() =>
  SIZES.includes(Number(route.query.size)) ? Number(route.query.size) : 20,
);
const offset = computed(() => Math.max(0, Number(route.query.offset) || 0));
const page = computed({
  get: () => Math.floor(offset.value / size.value) + 1,
  set: (p: number) => {
    void router.push({
      query: { ...route.query, offset: (p - 1) * size.value },
    });
  },
});
const pageSize = computed({
  get: () => size.value,
  set: (s: number) => {
    void router.push({ query: { ...route.query, size: s, offset: 0 } });
  },
});
const filter = computed({
  get: () => String(route.query.q || ""),
  set: (q: string) => {
    void router.replace({ query: { ...route.query, q: q || undefined } });
  },
});
const sort = computed<SortState | null>({
  get: () => {
    const [key, dir] = String(route.query.sort || "").split(".");
    return key && (dir === "asc" || dir === "desc")
      ? { key, dir: dir as SortState["dir"] }
      : null;
  },
  set: (s: SortState | null) => {
    void router.replace({
      query: { ...route.query, sort: s ? `${s.key}.${s.dir}` : undefined },
    });
  },
});
const state = list.state;
const rows = computed(() =>
  (state.value.data?.items ?? [])
    .filter((file) =>
      file.name.toLowerCase().includes(filter.value.toLowerCase()),
    )
    .map((file) => ({
      ...file,
      kind: fileKind(file.name, file.content_type).label,
    })),
);
const columns: DataColumn[] = [
  { key: "name", title: "名称", minWidth: 340 },
  { key: "kind", title: "类型", width: 140 },
  { key: "size", title: "大小", kind: "number", width: 120, sortable: true },
  { key: "created_at", title: "保存时间", width: 160, sortable: true },
  { key: "actions", title: "", align: "right", width: 64 },
];
function load() {
  void list.run({ org, offset: offset.value, limit: size.value });
}
watch([offset, size], load, { immediate: true });
function openFile(file: FileView) {
  void router.push({
    path: `/files/${encodeURIComponent(file.id)}`,
    query: { returnTo: route.fullPath },
  });
}

const selected = ref<string[]>([]);
watch([offset, size], () => (selected.value = []));
const picked = computed(() =>
  (state.value.data?.items ?? []).filter((f) => selected.value.includes(f.id)),
);
const batch = useBatch();

const batchMode = ref<"" | "confirm" | "delete" | "download">("");
const batchOpen = computed({
  get: () => batchMode.value !== "",
  set: (open: boolean) => {
    if (!open && !batch.running.value) closeBatch();
  },
});
function closeBatch() {
  const removed = batchMode.value === "delete";
  const done = batch.items.value
    .filter((i) => i.status === "ok")
    .map((i) => i.key);
  batchMode.value = "";
  batch.reset();
  if (removed) {
    selected.value = selected.value.filter((k) => !done.includes(k));
    load();
  }
}
async function batchDelete() {
  batchMode.value = "delete";
  await batch.run(
    remove,
    picked.value.map((f) => ({
      key: f.id,
      label: f.name,
      input: { org, id: f.id },
    })),
  );
}
async function batchDownload() {
  batchMode.value = "download";
  const names = new Map(picked.value.map((f) => [f.id, f.name]));
  await batch.run(
    download,
    picked.value.map((f) => ({
      key: f.id,
      label: f.name,
      input: { org, id: f.id },
    })),
    (blob, key) => blob && saveDownload(blob, names.get(key)!),
  );
}
async function downloadFile(file: FileView) {
  const blob = await download.run({ org, id: file.id });
  if (blob) saveDownload(blob, file.name);
}
</script>
<template>
  <PageFrame title="文件管理" workspace>
    <template #actions
      ><UiButton
        v-if="session.can('file_library.write')"
        variant="primary"
        icon="upload"
        @click="router.push('/files/upload')"
        >上传文件</UiButton
      ></template
    >
    <template #status>
      <StatusMessage
        :status="download.state.value.status"
        :error="download.state.value.error"
      />
    </template>
    <DataTable
      fill
      flat
      :scroll-key="route.fullPath"
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:sort="sort"
      :sizes="SIZES"
      :settings="false"
      :fullscreenable="false"
      row-clickable
      selectable
      v-model:selected="selected"
      :columns="columns"
      :rows="rows"
      row-key="id"
      :loading="state.status === 'loading'"
      :error="state.status === 'error' ? state.error : undefined"
      retryable
      @retry="load"
      :total="state.data?.total ?? 0"
      @row-click="openFile"
    >
      <template #search>
        <FilterItem size="lg"
          ><UiSearchInput
            v-model="filter"
            placeholder="在本页中查找文件名"
            aria-label="在本页中查找文件名"
        /></FilterItem>
      </template>
      <template #toolbar>
        <UiTip text="刷新列表"
          ><UiButton
            size="icon"
            variant="ghost"
            icon="refresh"
            aria-label="刷新列表"
            :loading="state.status === 'loading'"
            @click="load"
        /></UiTip>
      </template>
      <template #cell-name="{ row }"
        ><Row gap="sm" nowrap
          ><UiFileIcon :name="row.name" :type="row.content_type" /><UiButton
            variant="text"
            @click="openFile(row)"
            >{{ row.name }}</UiButton
          ></Row
        ></template
      >
      <template #cell-kind="{ row }"
        ><UiTag>{{ row.kind }}</UiTag></template
      >
      <template #cell-size="{ row }">{{ formatBytes(row.size) }}</template>
      <template #cell-created_at="{ row }"
        ><UiTime :value="row.created_at"
      /></template>
      <template #cell-actions="{ row }"
        ><Row justify="end" gap="xs" nowrap
          ><UiTip text="下载"
            ><UiButton
              size="icon"
              variant="ghost"
              icon="download"
              :aria-label="`下载 ${row.name}`"
              :disabled="download.state.value.status === 'loading'"
              @click="downloadFile(row)" /></UiTip></Row
      ></template>
      <template #bulk
        ><UiButton size="sm" icon="download" @click="batchDownload"
          >下载</UiButton
        ><UiButton
          v-if="session.can('file_library.write')"
          size="sm"
          variant="danger"
          icon="delete"
          @click="batchMode = 'confirm'"
          >删除</UiButton
        ></template
      >
      <template #empty
        ><UiEmpty
          :title="filter ? '这一页没有符合条件的文件' : '还没有文件'"
          :hint="
            filter ? '换个文件名，或清除搜索' : '上传第一个文件后会显示在这里'
          "
          ><UiButton v-if="filter" @click="filter = ''">清除搜索</UiButton
          ><UiButton
            v-else-if="session.can('file_library.write')"
            icon="upload"
            @click="router.push('/files/upload')"
            >上传文件</UiButton
          ></UiEmpty
        ></template
      >
    </DataTable>
    <UiDialog
      v-model:open="batchOpen"
      :title="
        batchMode === 'confirm'
          ? `删除 ${picked.length} 个文件？`
          : batch.running.value
            ? batchMode === 'delete'
              ? '正在删除'
              : '正在下载'
            : batchMode === 'delete'
              ? '删除完成'
              : '下载完成'
      "
      :description="
        batchMode === 'confirm'
          ? '删除后不能恢复。会按顺序逐个删除；某个结果未确认时会停下，不会自动重试。'
          : undefined
      "
    >
      <template v-if="batchMode === 'confirm'"
        ><BatchProgress
          :items="
            picked.map((f) => ({ key: f.id, label: f.name, status: 'waiting' }))
          "
      /></template>
      <BatchProgress
        v-else
        :items="batch.items.value"
        :verb="batchMode === 'delete' ? '已删除' : '已下载'"
      />
      <template #footer>
        <template v-if="batchMode === 'confirm'"
          ><UiButton @click="batchMode = ''">取消</UiButton
          ><UiButton variant="danger" @click="batchDelete"
            >确认删除 {{ picked.length }} 个</UiButton
          ></template
        >
        <UiButton
          v-else
          variant="primary"
          :loading="batch.running.value"
          @click="closeBatch"
          >{{ batch.running.value ? "执行中" : "完成" }}</UiButton
        >
      </template>
    </UiDialog>
  </PageFrame>
</template>
