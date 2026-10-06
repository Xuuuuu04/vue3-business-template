<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSession } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  StatusLine,
  FilterBar,
  FilterItem,
  DataTable,
  UiButton,
  UiInput,
  type DataColumn,
} from "@/shared/ui/public";
import { useFileLibrary, fileSize, fileDate } from "../public";
const PAGE_SIZE = 10;
const route = useRoute();
const router = useRouter();
const { list } = useFileLibrary();
const session = useSession();
const org = session.state.value.org;
const offset = computed(() => Math.max(0, Number(route.query.offset) || 0));
const page = computed({
  get: () => offset.value / PAGE_SIZE + 1,
  set: (p: number) => {
    void router.push({ query: { ...route.query, offset: (p - 1) * PAGE_SIZE } });
  },
});
const filter = computed({
  get: () => String(route.query.q || ""),
  set: (q: string) => {
    void router.replace({ query: { ...route.query, q: q || undefined } });
  },
});
const state = list.state;
const rows = computed(() =>
  (state.value.data?.items ?? []).filter((file) =>
    file.name.toLowerCase().includes(filter.value.toLowerCase()),
  ),
);
const applied = computed(() =>
  filter.value ? [{ key: "q", label: `文件名：${filter.value}` }] : [],
);
const columns: DataColumn[] = [
  { key: "name", title: "文件名", minWidth: 320 },
  { key: "size", title: "大小", kind: "number", width: 120 },
  { key: "created_at", title: "保存时间", width: 200 },
  { key: "actions", title: "操作", align: "right", width: 96, sticky: "right" },
];
function load() {
  void list.run({ org, offset: offset.value, limit: PAGE_SIZE });
}
watch(offset, load, { immediate: true });
function openFile(id: string) {
  void router.push({
    path: `/files/${encodeURIComponent(id)}`,
    query: { returnTo: route.fullPath },
  });
}
</script>
<template>
  <PageFrame title="文件管理">
    <template #actions
      ><UiButton
        v-if="session.can('file_library.write')"
        variant="primary"
        @click="router.push('/files/upload')"
        >上传文件</UiButton
      ></template
    >
    <template #status
      ><StatusLine
        :items="[
          { text: `共 ${state.data?.total ?? 0} 个文件` },
          { text: '筛选只作用于当前页' },
        ]"
    /></template>
    <FilterBar
      :applied="applied"
      :loading="state.status === 'loading'"
      @query="load"
      @reset="filter = ''"
      @remove="filter = ''"
    >
      <FilterItem size="lg">
        <UiInput
          v-model="filter"
          aria-label="筛选本页文件"
          placeholder="输入文件名"
        />
      </FilterItem>
    </FilterBar>
    <StatusMessage :status="state.status" :error="state.error" />
    <DataTable
      v-model:page="page"
      :page-size="PAGE_SIZE"
      :sizes="[PAGE_SIZE]"
      title="团队文件"
      :columns="columns"
      :rows="rows"
      row-key="id"
      :loading="state.status === 'loading' && !state.data"
      :total="state.data?.total ?? 0"
      empty-title="这一页没有符合条件的文件"
      empty-hint="换个文件名，或清除筛选条件"
    >
      <template #cell-name="{ row }"
        ><UiButton variant="link" @click="openFile(row.id)">{{
          row.name
        }}</UiButton></template
      >
      <template #cell-size="{ row }">{{ fileSize(row.size) }}</template>
      <template #cell-created_at="{ row }">{{
        fileDate(row.created_at)
      }}</template>
      <template #cell-actions="{ row }"
        ><UiButton variant="link" @click="openFile(row.id)"
          >查看</UiButton
        ></template
      >
    </DataTable>
  </PageFrame>
</template>
