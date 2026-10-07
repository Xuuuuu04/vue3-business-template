<script setup lang="ts">
/** 采购审批的交互示例。金额以整数分计算，审批结果仅保留在本页内存中。 */
import { computed, ref } from "vue";
import {
  CellText,
  DataTable,
  DescriptionList,
  Field,
  FormSection,
  PageFrame,
  Stack,
  StatusLine,
  Timeline,
  UiButton,
  UiDialog,
  UiTabs,
  UiTextarea,
  WorkArea,
  type DataColumn,
} from "@/shared/ui/public";

type ApprovalStatus = "pending" | "approved" | "returned";
interface PurchaseItem {
  id: string;
  name: string;
  specification: string;
  quantity: number;
  /** 含税单价，单位为分。 */
  unitPriceCents: number;
  subtotalCents: number;
}
interface ApprovalEvent {
  title: string;
  time: string;
  note?: string;
}

const requestNumber = "PR-202610-018";
const budgetCents = 4_500_000;
const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
});
function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

const items: PurchaseItem[] = [
  {
    id: "workstation",
    name: "设计工作站",
    specification: "32 GB 内存 · 1 TB 存储",
    quantity: 2,
    unitPriceCents: 1_799_900,
  },
  {
    id: "display",
    name: "27 英寸 4K 显示器",
    specification: "IPS 面板 · USB-C 连接",
    quantity: 2,
    unitPriceCents: 239_900,
  },
  {
    id: "arm",
    name: "显示器支架",
    specification: "单臂 · 可调高度",
    quantity: 2,
    unitPriceCents: 39_900,
  },
  {
    id: "keyboard",
    name: "无线键盘",
    specification: "全尺寸 · 多设备连接",
    quantity: 2,
    unitPriceCents: 59_900,
  },
].map((item) => ({
  ...item,
  subtotalCents: item.quantity * item.unitPriceCents,
}));
const totalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
const columns: DataColumn[] = [
  { key: "name", title: "采购项目", minWidth: 240 },
  { key: "quantity", title: "数量", kind: "number", width: 72 },
  {
    key: "unitPriceCents",
    title: "含税单价",
    kind: "number",
    width: 116,
    format: (value) => formatMoney(Number(value)),
  },
  {
    key: "subtotalCents",
    title: "小计",
    kind: "number",
    width: 124,
    format: (value) => formatMoney(Number(value)),
  },
];
const requestFields = [
  { label: "发起人", value: "周宁" },
  { label: "所属部门", value: "产品设计部" },
  { label: "提交时间", value: "2026-10-06 10:24" },
  { label: "期望交付", value: "2026-10-16" },
  { label: "费用归属", value: "设备采购 · 设计部" },
  { label: "当前审批人", value: "林默（你）" },
];
function initialEvents(): ApprovalEvent[] {
  return [
    { title: "申请进入审批", time: "10/06 11:08", note: "林默负责本次审批。" },
    {
      title: "部门负责人确认需求",
      time: "10/06 11:06",
      note: "陈嘉确认新增两位设计师的设备需求，采购清单在部门预算内。",
    },
    {
      title: "周宁提交采购申请",
      time: "10/06 10:24",
      note: "共 4 类设备，供两位新入职设计师使用。",
    },
  ];
}

const activeTab = ref("details");
const status = ref<ApprovalStatus>("pending");
const history = ref<ApprovalEvent[]>(initialEvents());
const approveOpen = ref(false);
const returnOpen = ref(false);
const returnReason = ref("");
const returnAttempted = ref(false);
const decisionTime = ref("");
const decisionReason = ref("");
const pending = computed(() => status.value === "pending");
const statusLabel = computed(
  () =>
    ({ pending: "待你审批", approved: "已通过", returned: "已退回" })[
      status.value
    ],
);
const tabs = computed(() => [
  { value: "details", label: "申请详情" },
  { value: "history", label: "审批记录", count: history.value.length },
]);
const statusItems = computed(() => [
  { text: requestNumber },
  {
    text: statusLabel.value,
    tone: status.value === "approved" ? ("ok" as const) : ("warn" as const),
  },
  { text: "演示数据 · 刷新后还原" },
]);
const returnError = computed(() =>
  returnAttempted.value && !returnReason.value.trim()
    ? "请输入退回原因，方便发起人修改申请。"
    : undefined,
);
const decisionFields = computed(() => [
  { label: "处理结果", value: statusLabel.value },
  { label: "审批人", value: "林默" },
  { label: "处理时间", value: decisionTime.value },
  ...(status.value === "returned"
    ? [{ label: "退回原因", value: decisionReason.value }]
    : []),
]);

/** 最终结果不能重复处理；确认窗和按钮共用同一状态判断。 */
function recordDecision(
  nextStatus: "approved" | "returned",
  reason = "",
): void {
  if (!pending.value) return;
  const now = new Date();
  decisionTime.value = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  decisionReason.value = reason;
  history.value = [
    {
      title: nextStatus === "approved" ? "林默通过审批" : "林默退回申请",
      time: new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
      note:
        nextStatus === "approved"
          ? `审批金额 ${formatMoney(totalCents)}。该操作仅修改示例状态。`
          : reason,
    },
    ...history.value,
  ];
  status.value = nextStatus;
  approveOpen.value = false;
  returnOpen.value = false;
}
function confirmReturn(): void {
  if (!pending.value) return;
  returnAttempted.value = true;
  const reason = returnReason.value.trim();
  if (!reason) return;
  recordDecision("returned", reason);
}
/** 主动重置才清除演示输入；关闭确认窗保留退回原因。 */
function resetExample(): void {
  status.value = "pending";
  history.value = initialEvents();
  returnReason.value = "";
  returnAttempted.value = false;
  decisionTime.value = "";
  decisionReason.value = "";
  approveOpen.value = false;
  returnOpen.value = false;
  activeTab.value = "details";
}
</script>

<template>
  <PageFrame title="设计工作站采购" workspace>
    <template #actions>
      <UiButton
        v-if="!pending"
        variant="ghost"
        icon="refresh"
        @click="resetExample"
        >重置演示</UiButton
      >
      <UiButton v-if="pending" @click="returnOpen = true">退回</UiButton>
      <UiButton
        variant="primary"
        :icon="status === 'returned' ? undefined : 'check'"
        :disabled="!pending"
        @click="approveOpen = true"
      >
        {{ pending ? "通过审批" : statusLabel }}
      </UiButton>
    </template>
    <template #tabs><UiTabs v-model="activeTab" :items="tabs" /></template>
    <template #status><StatusLine :items="statusItems" /></template>

    <WorkArea fill>
      <Stack v-if="activeTab === 'details'" gap="none">
        <FormSection title="申请信息">
          <DescriptionList :items="requestFields" :columns="2" />
        </FormSection>
        <FormSection title="采购明细">
          <DataTable
            :columns="columns"
            :rows="items"
            row-key="id"
            flat
            :settings="false"
            :fullscreenable="false"
          >
            <template #cell-name="{ row }"
              ><CellText :title="row.name">{{
                row.specification
              }}</CellText></template
            >
          </DataTable>
          <DescriptionList
            :items="[
              { label: '采购总额', key: 'total' },
              { label: '部门预算', value: formatMoney(budgetCents) },
            ]"
            :columns="2"
          >
            <template #value-total
              ><strong>{{ formatMoney(totalCents) }}</strong></template
            >
          </DescriptionList>
        </FormSection>
        <FormSection title="采购说明">
          <p>
            为新入职的两位产品设计师配置工作站，用于界面设计、原型制作和日常协作。现有设备已全部分配，没有可用的闲置设备。
          </p>
          <DescriptionList
            :items="[
              { label: '交付地点', value: '上海办公室 · 6 层设计区' },
              { label: '报价条件', value: '含税、含配送，设备保修 3 年。' },
            ]"
          />
        </FormSection>
        <FormSection v-if="!pending" title="审批结果">
          <DescriptionList :items="decisionFields" :columns="2" />
        </FormSection>
      </Stack>
      <FormSection v-else title="审批记录">
        <Timeline :items="history" />
      </FormSection>
    </WorkArea>

    <UiDialog
      v-model:open="approveOpen"
      title="通过这笔采购申请？"
      description="将把示例申请标记为已通过，并记录你的审批。不会发起实际采购或付款。"
    >
      <DescriptionList
        :items="[
          { label: '申请', value: '设计工作站采购' },
          { label: '采购总额', value: formatMoney(totalCents) },
          { label: '发起人', value: '周宁 · 产品设计部' },
        ]"
      />
      <template #footer>
        <UiButton @click="approveOpen = false">暂不处理</UiButton>
        <UiButton
          variant="primary"
          icon="check"
          :disabled="!pending"
          @click="recordDecision('approved')"
          >确认通过</UiButton
        >
      </template>
    </UiDialog>
    <UiDialog
      v-model:open="returnOpen"
      title="退回采购申请"
      description="说明需要修改的内容。只会改变本页示例状态，不会向发起人发送通知。"
    >
      <form id="return-purchase-form" @submit.prevent="confirmReturn">
        <Field
          label="退回原因"
          required
          :error="returnError"
          hint="关闭窗口后，已输入的内容仍会保留。"
        >
          <UiTextarea
            v-model="returnReason"
            :rows="4"
            :maxlength="300"
            placeholder="例如：请补充设备报价和供应商信息。"
          />
        </Field>
      </form>
      <template #footer>
        <UiButton @click="returnOpen = false">继续查看</UiButton>
        <UiButton
          type="submit"
          form="return-purchase-form"
          :disabled="!pending"
          @click="returnAttempted = true"
          >确认退回</UiButton
        >
      </template>
    </UiDialog>
  </PageFrame>
</template>
