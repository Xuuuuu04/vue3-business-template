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
  Grid,
  UiButton,
  UiFileDrop,
  UiFileIcon,
  UiTime,
  formatBytes,
} from "@/shared/ui/public";
import { useFileLibrary } from "../public";
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
/** 样板的上传上限（规则 R-03），真实上限以后台为准。 */
const LIMIT = 10 * 1024 * 1024;
const tooLarge = computed(() => (selected.value?.size ?? 0) > LIMIT);
async function submit() {
  if (!selected.value || tooLarge.value) return;
  const result = await upload.run({ org, file: selected.value });
  if (result) {
    selected.value = undefined;
    void router.push(`/files/${encodeURIComponent(result.id)}`);
  }
}
</script>
<template>
  <PageFrame title="上传文件" back="/files">
    <Grid ratio="2:1">
      <Card>
        <form @submit.prevent="submit">
          <Stack>
            <UiFileDrop
              v-model="selected"
              :hint="`单个文件不超过 ${formatBytes(LIMIT)}`"
              :disabled="state.status === 'loading' || state.status === 'unknown'"
            />
            <StatusMessage
              v-if="tooLarge"
              status="error"
              :error="`这个文件有 ${formatBytes(selected!.size)}，超过了 ${formatBytes(LIMIT)} 的上限。`"
            />
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
            <Row justify="end">
              <UiButton @click="router.push('/files')">取消</UiButton>
              <UiButton
                type="submit"
                variant="primary"
                icon="upload"
                :loading="state.status === 'loading'"
                :disabled="!selected || tooLarge || state.status === 'unknown'"
                >保存文件</UiButton
              >
            </Row>
          </Stack>
        </form>
      </Card>
      <Card title="上传须知">
        <Stack gap="sm">
          <p>一次上传一个文件，单个不超过 {{ formatBytes(LIMIT) }}。</p>
          <p>保存成功后会直接打开这个文件的详情。</p>
          <p>网络中断时结果可能未知，请先查询，不要重复上传。</p>
        </Stack>
      </Card>
    </Grid>
    <Card v-if="query.data" title="最近保存的文件">
      <Stack gap="sm">
        <Row v-for="file in query.data.items" :key="file.id" gap="md" nowrap>
          <UiFileIcon :name="file.name" :type="file.content_type" />
          <UiButton
            variant="text"
            @click="router.push(`/files/${encodeURIComponent(file.id)}`)"
            >{{ file.name }}</UiButton
          >
          <span>{{ formatBytes(file.size) }}</span>
          <UiTime :value="file.created_at" />
        </Row>
      </Stack>
    </Card>
    <StatusMessage :status="query.status" :error="query.error" />
  </PageFrame>
</template>
