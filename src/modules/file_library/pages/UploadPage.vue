<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useUnsaved, useSession } from "@/shared/public";
import {
  PageFrame,
  StatusMessage,
  Card,
  Stack,
  Row,
  UiButton,
  UiFileDrop,
} from "@/shared/ui/public";
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
  <PageFrame title="上传文件" narrow>
    <template #actions
      ><UiButton @click="router.push('/files')">返回列表</UiButton></template
    >
    <Card>
      <form @submit.prevent="submit">
        <Stack>
          <UiFileDrop
            v-model="selected"
            hint="一次上传一个文件，最大 10 MB。文件内容不会写入前端运行记录。"
            :disabled="state.status === 'loading' || state.status === 'unknown'"
          />
          <Row justify="end">
            <UiButton
              type="submit"
              variant="primary"
              :loading="state.status === 'loading'"
              :disabled="!selected || state.status === 'unknown'"
              >保存文件</UiButton
            >
          </Row>
        </Stack>
      </form>
    </Card>
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
    <Card v-if="query.data" title="最近保存的文件">
      <Stack gap="xs">
        <UiButton
          v-for="file in query.data.items"
          :key="file.id"
          variant="text"
          @click="router.push(`/files/${encodeURIComponent(file.id)}`)"
          >{{ file.name }} · {{ fileSize(file.size) }}</UiButton
        >
      </Stack>
    </Card>
    <StatusMessage :status="query.status" :error="query.error" />
  </PageFrame>
</template>
