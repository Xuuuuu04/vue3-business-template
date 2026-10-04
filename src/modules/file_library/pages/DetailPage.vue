<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { saveDownload, useSession } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  UiButton,
  UiDialog,
} from "@/shared/ui/public";
import { useFileLibrary, fileSize, fileDate } from "../public";
const route = useRoute();
const router = useRouter();
const { detail, remove, download } = useFileLibrary();
const session = useSession();
const org = session.state.value.org;
const id = computed(() => String(route.params.id));
const state = detail.state;
const removal = remove.state;
const downloading = download.state;
const confirm = ref(false);
const returnTo = computed(() =>
  String(route.query.returnTo || "").startsWith("/files?")
    ? String(route.query.returnTo)
    : "/files",
);
watch(
  id,
  () => {
    void detail.run({ org, id: id.value });
  },
  { immediate: true },
);
async function deleteConfirmed() {
  const result = await remove.run({ org, id: id.value });
  if (result === null) {
    confirm.value = false;
    void router.push(returnTo.value);
  }
}
async function downloadCurrent() {
  const blob = await download.run({ org, id: id.value });
  if (blob && state.value.data) saveDownload(blob, state.value.data.name);
}
</script>
<template>
  <PageFrame
    :title="state.data?.name || '文件详情'"
    description="这里显示后台保存的文件信息。"
  >
    <template #actions
      ><UiButton @click="router.push(returnTo)">返回列表</UiButton></template
    >
    <StatusMessage :status="state.status" :error="state.error" />
    <template v-if="state.data"
      ><dl class="detail-grid">
        <dt>文件名</dt>
        <dd>{{ state.data.name }}</dd>
        <dt>文件大小</dt>
        <dd>{{ fileSize(state.data.size) }}（{{ state.data.size }} 字节）</dd>
        <dt>保存时间</dt>
        <dd>{{ fileDate(state.data.created_at) }}</dd>
        <dt>文件类型</dt>
        <dd>{{ state.data.content_type }}</dd>
        <dt>文件编号</dt>
        <dd class="break-word">{{ state.data.id }}</dd>
        <dt>内容校验值</dt>
        <dd class="break-word">{{ state.data.sha256 }}</dd>
      </dl>
      <div class="action-row">
        <UiButton
          type="primary"
          :loading="downloading.status === 'loading'"
          @click="downloadCurrent"
          >下载原文件</UiButton
        ><UiButton
          v-if="session.can('file_library.write')"
          type="danger"
          plain
          :disabled="removal.status === 'unknown'"
          @click="confirm = true"
          >删除文件</UiButton
        >
      </div>
    </template>
    <StatusMessage :status="downloading.status" :error="downloading.error" />
    <StatusMessage :status="removal.status" :error="removal.error"
      ><UiButton @click="detail.run({ org, id })"
        >查询文件是否仍然存在</UiButton
      >
      <p>结果未确认时请不要再次删除。可返回列表查看最新结果。</p></StatusMessage
    >
    <UiDialog
      v-model="confirm"
      title="确认删除文件"
      width="min(520px, 92vw)"
      :close-on-click-modal="false"
      ><p>删除 {{ state.data?.name }} 后将无法从这里下载。确认删除吗？</p>
      <template #footer
        ><UiButton
          :disabled="removal.status === 'loading'"
          @click="confirm = false"
          >保留文件</UiButton
        ><UiButton
          type="danger"
          :loading="removal.status === 'loading'"
          :disabled="removal.status === 'unknown'"
          @click="deleteConfirmed"
          >确认删除</UiButton
        ></template
      ></UiDialog
    >
  </PageFrame>
</template>
