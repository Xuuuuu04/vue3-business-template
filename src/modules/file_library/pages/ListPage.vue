<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSession } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  UiButton,
  UiInput,
  UiTable,
  UiColumn,
  UiPagination,
} from "@/shared/ui/public";
import { useFileLibrary, fileSize, fileDate } from "../public";
const route = useRoute();
const router = useRouter();
const { list } = useFileLibrary();
const session = useSession();
const org = session.state.value.org;
const offset = computed(() => Math.max(0, Number(route.query.offset) || 0));
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
watch(
  offset,
  () => {
    void list.run({ org, offset: offset.value, limit: 10 });
  },
  { immediate: true },
);
function openFile(id: string) {
  void router.push({
    path: `/files/${encodeURIComponent(id)}`,
    query: { returnTo: route.fullPath },
  });
}
function changePage(page: number) {
  void router.push({ query: { ...route.query, offset: (page - 1) * 10 } });
}
</script>
<template>
  <PageFrame
    title="文件管理"
    description="团队文件集中保存在这里。可以查看详情、上传新文件或下载原文件。"
  >
    <template #actions
      ><UiButton
        v-if="session.can('file_library.write')"
        type="primary"
        @click="router.push('/files/upload')"
        >上传文件</UiButton
      ></template
    >
    <div class="toolbar">
      <div class="field filter-field">
        <label for="file-filter">筛选本页文件</label
        ><UiInput
          id="file-filter"
          v-model="filter"
          placeholder="输入文件名"
          clearable
        />
      </div>
      <UiButton
        :loading="state.status === 'loading'"
        @click="list.run({ org, offset, limit: 10 })"
        >刷新列表</UiButton
      >
    </div>
    <StatusMessage :status="state.status" :error="state.error" />
    <div class="table-wrap" :aria-busy="state.status === 'loading'">
      <UiTable
        :data="rows"
        row-key="id"
        empty-text="这一页没有符合条件的文件"
        @row-dblclick="(row) => openFile(row.id)"
      >
        <UiColumn label="文件名" min-width="280"
          ><template #default="{ row }"
            ><button class="text-link" @click="openFile(row.id)">
              {{ row.name }}
            </button></template
          ></UiColumn
        >
        <UiColumn label="大小" min-width="130"
          ><template #default="{ row }">{{
            fileSize(row.size)
          }}</template></UiColumn
        >
        <UiColumn label="保存时间" min-width="210"
          ><template #default="{ row }">{{
            fileDate(row.created_at)
          }}</template></UiColumn
        >
        <UiColumn label="操作" width="110"
          ><template #default="{ row }"
            ><UiButton text @click="openFile(row.id)">查看</UiButton></template
          ></UiColumn
        >
      </UiTable>
    </div>
    <div class="list-footer">
      <p class="muted">
        共 {{ state.data?.total ?? 0 }} 个文件 · 筛选只作用于当前页
      </p>
      <UiPagination
        :current-page="offset / 10 + 1"
        :page-size="10"
        :total="state.data?.total ?? 0"
        layout="prev,pager,next"
        @current-change="changePage"
      />
    </div>
  </PageFrame>
</template>
