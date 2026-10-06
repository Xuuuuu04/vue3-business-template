<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { saveDownload, useSession } from "@/shared/public";
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
  UiTime,
  UiTip,
  fileKind,
  formatBytes,
  type DataColumn,
  type SortState,
} from "@/shared/ui/public";
import { useFileLibrary, type FileView } from "../public";
/** 每页条数的可选值；默认 20 条，写在地址里，返回列表时保持。 */
const SIZES = [10, 20, 50];
const route = useRoute();
const router = useRouter();
const { list, download } = useFileLibrary();
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
    .map((file) => ({ ...file, kind: fileKind(file.name, file.content_type).label })),
);
const columns: DataColumn[] = [
  { key: "name", title: "名称", minWidth: 340 },
  { key: "kind", title: "类型", width: 140 },
  { key: "size", title: "大小", kind: "number", width: 120, sortable: true },
  { key: "created_at", title: "保存时间", width: 160, sortable: true },
  { key: "actions", title: "", align: "right", width: 112 },
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
async function downloadFile(file: FileView) {
  const blob = await download.run({ org, id: file.id });
  if (blob) saveDownload(blob, file.name);
}
</script>
<template>
  <PageFrame title="文件管理">
    <template #actions
      ><UiButton
        v-if="session.can('file_library.write')"
        variant="primary"
        icon="upload"
        @click="router.push('/files/upload')"
        >上传文件</UiButton
      ></template
    >
    <StatusMessage :status="state.status" :error="state.error" />
    <StatusMessage :status="download.state.value.status" :error="download.state.value.error" />
    <DataTable
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:sort="sort"
      :sizes="SIZES"
      :settings="false"
      :fullscreenable="false"
      row-clickable
      :columns="columns"
      :rows="rows"
      row-key="id"
      :loading="state.status === 'loading' && !state.data"
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
        ><Row gap="md" nowrap
          ><UiFileIcon :name="row.name" :type="row.content_type" /><UiButton
            variant="text"
            @click="openFile(row)"
            >{{ row.name }}</UiButton
          ></Row
        ></template
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
            @click="downloadFile(row)" /></UiTip
          ><UiButton variant="link" @click="openFile(row)"
            >详情</UiButton
          ></Row
        ></template
      >
      <template #empty
        ><UiEmpty
          :title="filter ? '这一页没有符合条件的文件' : '还没有文件'"
          :hint="filter ? '换个文件名，或清除搜索' : '上传第一个文件后会显示在这里'"
          ><UiButton v-if="filter" @click="filter = ''">清除搜索</UiButton
          ><UiButton
            v-else-if="session.can('file_library.write')"
            variant="primary"
            icon="upload"
            @click="router.push('/files/upload')"
            >上传文件</UiButton
          ></UiEmpty
        ></template
      >
    </DataTable>
  </PageFrame>
</template>
