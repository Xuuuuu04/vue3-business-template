<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useUnsaved, useSession } from "@/shared/public";
import { PageFrame, StatusMessage, UiButton } from "@/shared/ui/public";
import { useFileLibrary, fileSize } from "../public";
const router = useRouter();
const { upload, list } = useFileLibrary();
const selected = ref<File>();
const dirty = computed(
  () => Boolean(selected.value) && upload.state.value.status !== "success",
);
useUnsaved(dirty);
const state = upload.state;
const query = list.state;
const session = useSession();
const org = session.state.value.org;
function select(event: Event) {
  selected.value = (event.target as HTMLInputElement).files?.[0];
}
async function submit() {
  if (!selected.value) return;
  const result = await upload.run({ org, file: selected.value });
  if (result) {
    selected.value = undefined;
    void router.push(`/files/${encodeURIComponent(result.id)}`);
  }
}
</script>
<template>
  <PageFrame
    title="上传文件"
    description="选择一个文件。保存完成后会进入文件详情。"
  >
    <template #actions
      ><UiButton @click="router.push('/files')">返回列表</UiButton></template
    >
    <form class="form-section" @submit.prevent="submit">
      <div class="field">
        <label for="upload-file">选择文件</label
        ><input
          id="upload-file"
          type="file"
          :disabled="state.status === 'loading' || state.status === 'unknown'"
          @change="select"
        />
        <p class="muted">
          一次上传一个文件，最大 10 MB。文件内容不会写入前端运行记录。
        </p>
        <p v-if="selected">
          已选择：{{ selected.name }} · {{ fileSize(selected.size) }}
        </p>
      </div>
      <UiButton
        native-type="submit"
        type="primary"
        :loading="state.status === 'loading'"
        :disabled="!selected || state.status === 'unknown'"
        >保存文件</UiButton
      >
    </form>
    <StatusMessage :status="state.status" :error="state.error"
      ><template v-if="state.status === 'unknown'"
        ><UiButton @click="list.run({ org, offset: 0, limit: 10 })"
          >查询最近保存的文件</UiButton
        >
        <p>
          请根据文件名、大小与保存时间确认。无法确定时请联系管理员，不要重复上传。
        </p></template
      ></StatusMessage
    >
    <section v-if="query.data" class="content-section">
      <h2>最近保存的文件</h2>
      <ul class="plain-list">
        <li v-for="file in query.data.items" :key="file.id">
          <button
            class="text-link"
            @click="router.push(`/files/${encodeURIComponent(file.id)}`)"
          >
            {{ file.name }} · {{ fileSize(file.size) }}
          </button>
        </li>
      </ul>
    </section>
    <StatusMessage :status="query.status" :error="query.error" />
  </PageFrame>
</template>
