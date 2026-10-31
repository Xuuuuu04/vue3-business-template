<script setup lang="ts">
import {
  ChatThread,
  PromptInput,
  UiTag,
  Markdown,
  CodeBlock,
  Stack,
  UsageMeter,
} from "@/shared/ui/public";
import { mdSample, codeSample } from "./design-preview-content";
import type { AiPreviewState } from "./design-preview-ai";
const props = defineProps<{ example: string; state: AiPreviewState }>();
const { chat, prompt, busy, send, stop } = props.state;
</script>
<template>
  <template v-if="example === 'conversation'">
    <div class="flex min-h-0 flex-1 flex-col">
      <ChatThread
        :messages="chat"
        user-name="林知远"
        assistant-name="经营助手"
      /><PromptInput v-model="prompt" :busy="busy" @send="send" @stop="stop"
        ><template #tools><UiTag>经营数据 · 九月</UiTag></template></PromptInput
      >
    </div>
  </template>
  <template v-if="example === 'markdown'"
    ><Markdown :text="'# 项目接入说明\n\n' + mdSample" variant="document"
  /></template>
  <template v-if="example === 'code'"
    ><CodeBlock lang="bash" :code="codeSample"
  /></template>
  <template v-if="example === 'usage'"
    ><Stack
      ><UsageMeter label="对话次数" :used="8240" :limit="10000" /><UsageMeter
        label="Token"
        :used="1.92"
        :limit="2"
        unit=" M"
        :format="(v) => v.toFixed(2)" /><UsageMeter
        label="知识库文档"
        :used="126"
        :limit="500"
        unit=" 篇" /></Stack
  ></template>
</template>
