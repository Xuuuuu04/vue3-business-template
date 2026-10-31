<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Check, RotateCcw } from "lucide-vue-next";
import { useUnsaved } from "@/shared/public";
import {
  PageFrame,
  WorkArea,
  SplitWorkspace,
  StatusLine,
  ConversationList,
  ConversationThread,
  PromptInput,
  UiAvatar,
  UiButton,
  UiEmpty,
  UiSearchInput,
  UiTag,
  UiSegmented,
} from "@/shared/ui/public";

interface Message {
  id: string;
  direction: "incoming" | "outgoing";
  text: string;
  time: string;
}
interface Conversation {
  id: string;
  name: string;
  company: string;
  subject: string;
  unread: number;
  resolved: boolean;
  time: string;
  messages: Message[];
  draft: string;
}
const route = useRoute();
const router = useRouter();
const seeds = [
  {
    id: "lin",
    name: "林知夏",
    company: "栖云设计",
    subject: "团队空间续费",
    time: "10:26",
    unread: 0,
    resolved: false,
    texts: [
      "你好，我们的团队版月底到期，想了解一下续费安排。",
      "你好，知夏。可以沿用目前的 12 个席位，也可以在续费前调整人数。你们下个月需要增加成员吗？",
      "会新增 3 位设计师。另外，现有项目和文件会保留吗？",
      "会保留。调整席位只改变可加入的成员数量，不影响现有项目和文件。",
      "好的，那就按 15 个席位续费。可以先提供一份报价清单吗？",
      "可以，清单会列明席位数量、使用周期和费用，方便你们内部确认。",
      "谢谢，抬头请写栖云设计有限公司，我们确认后再付款。",
    ],
  },
  {
    id: "chen",
    name: "陈一鸣",
    company: "拾光科技",
    subject: "成员权限调整",
    time: "10:18",
    unread: 2,
    resolved: false,
    texts: [
      "新成员加入后看不到项目，请问在哪里调整？",
      "请由空间管理员在成员列表中授予对应项目的查看权限。",
      "找到了，谢谢。能只允许查看，不允许下载吗？",
    ],
  },
  {
    id: "zhou",
    name: "周晓",
    company: "远山文化",
    subject: "发票信息变更",
    time: "09:54",
    unread: 1,
    resolved: false,
    texts: [
      "我们需要修改下一张发票的抬头。",
      "好的，尚未开票的订单可以先修改开票信息。",
      "明白，税号也需要一起更新。",
    ],
  },
  {
    id: "wu",
    name: "吴越",
    company: "墨禾建筑",
    subject: "导出文件格式",
    time: "09:32",
    unread: 0,
    resolved: false,
    texts: [
      "报表支持导出哪些格式？",
      "数据报表可导出为 CSV，便于在表格软件中继续处理。",
      "好的，我们先试一下。",
    ],
  },
  {
    id: "he",
    name: "何静",
    company: "木棉商贸",
    subject: "账号邮箱修改",
    time: "昨天",
    unread: 0,
    resolved: true,
    texts: [
      "想把账号邮箱换成公司的邮箱。",
      "可以在账号设置中验证新的邮箱地址，再确认修改。",
      "已经修改好了，谢谢。",
    ],
  },
  {
    id: "xu",
    name: "许庭",
    company: "和序咨询",
    subject: "新团队使用咨询",
    time: "昨天",
    unread: 0,
    resolved: true,
    texts: [
      "我们是 6 人团队，适合哪个方案？",
      "可以先试用团队版，按照实际协作需要决定席位数量。",
      "收到，我们这周试用。",
    ],
  },
];
function seedTime(time: string, offset: number): string {
  if (time === "昨天") return time;
  const [hour, minute] = time.split(":").map(Number);
  const total = hour! * 60 + minute! - offset * 4;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
const conversations = ref<Conversation[]>(
  seeds.map((seed) => ({
    ...seed,
    draft: "",
    messages: seed.texts.map((text, index) => ({
      id: `${seed.id}-${index}`,
      direction: index % 2 ? "outgoing" : "incoming",
      text,
      time: seedTime(seed.time, seed.texts.length - 1 - index),
    })),
  })),
);
const selected = computed({
  get: () =>
    conversations.value.some((item) => item.id === route.query.conversation)
      ? String(route.query.conversation)
      : "lin",
  set: (value: string) => {
    void router.replace({ query: { ...route.query, conversation: value } });
  },
});
const active = computed(() =>
  conversations.value.find((item) => item.id === selected.value)!,
);
watch(
  selected,
  () => {
    active.value.unread = 0;
  },
  { immediate: true },
);
const draft = computed({
  get: () => active.value.draft,
  set: (text: string) => {
    active.value.draft = text;
  },
});
const view = ref<"list" | "detail">(
  conversations.value.some((item) => item.id === route.query.conversation)
    ? "detail"
    : "list",
);
const search = ref("");
const filter = ref("all");
const filtered = computed(() =>
  conversations.value
    .filter(
      (item) =>
        (filter.value !== "open" || !item.resolved) &&
        (!search.value.trim() ||
          `${item.name}${item.company}${item.subject}`.includes(
            search.value.trim(),
          )),
    )
    .map((item) => ({
      ...item,
      preview: item.messages.at(-1)?.text ?? item.subject,
    })),
);
const pending = computed(
  () => conversations.value.filter((item) => !item.resolved).length,
);
useUnsaved(
  computed(() => conversations.value.some((item) => item.draft.trim())),
  "会话有未发送的草稿。确认离开吗？",
);
function choose(id: string) {
  conversations.value.find((item) => item.id === id)!.unread = 0;
  view.value = "detail";
}
function send(text: string) {
  if (active.value.resolved || !text.trim()) return;
  const time = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  active.value.messages.push({
    id: crypto.randomUUID(),
    direction: "outgoing",
    text: text.trim(),
    time,
  });
  active.value.time = time;
  active.value.draft = "";
}
</script>
<template>
  <PageFrame title="客服会话" workspace>
    <template #status
      ><StatusLine
        :items="[
          { text: '演示数据 · 刷新后还原' },
          { text: `${pending} 个待处理会话` },
        ]"
    /></template>
    <WorkArea fill
      ><SplitWorkspace
        v-model:view="view"
        list-label="会话列表"
        :detail-label="`${active.name}的会话`"
      >
        <template #listHeader>
          <UiSearchInput v-model="search" placeholder="搜索姓名、公司或主题" />
          <UiSegmented
            v-model="filter"
            :options="[
              { value: 'all', label: '全部会话' },
              { value: 'open', label: '待处理' },
            ]"
            aria-label="会话范围"
            size="sm"
          />
        </template>
        <template #list>
          <ConversationList
            v-model="selected"
            :items="filtered"
            label="选择客户会话"
            @select="choose"
          />
          <UiEmpty v-if="!filtered.length" title="没有符合条件的会话"
            ><UiButton
              @click="
                search = '';
                filter = 'all';
              "
              >清除条件</UiButton
            ></UiEmpty
          >
        </template>
        <template #heading>
          <UiAvatar :name="active.name" />
          <div class="min-w-[120px] flex-1">
            <p class="font-medium">{{ active.name }}</p>
            <p class="truncate text-help text-fg-muted">
              {{ active.company }} · {{ active.subject }}
            </p>
          </div>
          <UiTag :tone="active.resolved ? 'ok' : 'neutral'">{{
            active.resolved ? "已处理" : "待处理"
          }}</UiTag>
          <UiButton
            variant="ghost"
            size="sm"
            class="ml-auto"
            @click="active.resolved = !active.resolved"
            ><RotateCcw v-if="active.resolved" /><Check v-else />{{
              active.resolved ? "重新打开" : "标记已处理"
            }}</UiButton
          >
        </template>
        <ConversationThread
          :thread-id="active.id"
          :messages="active.messages"
          :label="active.name"
        />
        <template #composer>
          <PromptInput
            v-model="draft"
            aria-label="回复客户"
            :disabled="active.resolved"
            :placeholder="
              active.resolved
                ? '会话已处理，可重新打开后回复'
                : '输入回复，回车发送，Shift+回车换行'
            "
            @send="send"
          >
            <template #tools
              ><span class="px-2 text-xs text-fg-faint"
                >消息仅在本页展示</span
              ></template
            >
          </PromptInput>
        </template>
      </SplitWorkspace></WorkArea
    >
  </PageFrame>
</template>
