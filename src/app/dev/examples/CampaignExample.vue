<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useUnsaved } from "@/shared/public";
import {
  DescriptionList,
  Field,
  FormSection,
  Grid,
  PageFrame,
  Stack,
  StatusLine,
  UiButton,
  UiCheckbox,
  UiCombobox,
  UiDateRangePicker,
  UiDialog,
  UiInput,
  UiNumberInput,
  UiSelect,
  UiTextarea,
  WorkArea,
  useToast,
} from "@/shared/ui/public";

interface Campaign {
  name: string;
  description: string;
  dates: string[];
  venue: string;
  capacity: number | undefined;
  owner: string;
  audiences: string[];
  reminder: boolean;
}

const owners = [
  { value: "lin", label: "林知远" },
  { value: "zhou", label: "周晓" },
  { value: "he", label: "何静" },
];
const audiences = [
  { value: "east", label: "华东重点客户" },
  { value: "intent", label: "新品意向客户" },
  { value: "members", label: "线下体验会员" },
  { value: "partners", label: "合作伙伴" },
  { value: "south", label: "华南重点客户" },
  { value: "buyers", label: "企业采购联系人" },
  { value: "creators", label: "内容创作者" },
  { value: "design", label: "设计行业客户" },
  { value: "retail", label: "零售渠道客户" },
  { value: "returning", label: "复购会员" },
  { value: "inquiries", label: "近期咨询客户" },
  { value: "testers", label: "产品内测用户" },
];
const initial: Campaign = {
  name: "秋季新品体验活动",
  description:
    "邀请客户体验秋季新品，围绕产品试用、场景演示与反馈交流安排两场线下活动。",
  dates: ["2026-10-18", "2026-10-19"],
  venue: "上海 · 新天地体验中心",
  capacity: 120,
  owner: "lin",
  audiences: ["east", "intent"],
  reminder: true,
};

function copy(campaign: Campaign): Campaign {
  return {
    ...campaign,
    dates: [...campaign.dates],
    audiences: [...campaign.audiences],
  };
}
const draft = ref(copy(initial));
const saved = ref(copy(initial));
const savedAt = ref("");
const attempted = ref(false);
const preview = ref(false);
const resetDialog = ref(false);
const form = ref<HTMLFormElement>();
const toast = useToast();
const dirty = computed(
  () => JSON.stringify(draft.value) !== JSON.stringify(saved.value),
);
useUnsaved(dirty, "活动有未保存的修改。确认离开吗？");

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthDays[month - 1]!
  );
}
type Errors = Partial<
  Record<
    "name" | "dates" | "venue" | "capacity" | "owner" | "audiences",
    string
  >
>;
function validate(campaign: Campaign): Errors {
  const errors: Errors = {};
  if (!campaign.name.trim()) errors.name = "请输入活动名称。";
  else if (campaign.name.trim().length > 60)
    errors.name = "活动名称不能超过 60 个字。";
  const [start, end] = campaign.dates;
  if (!start || !end) errors.dates = "请选择活动开始和结束日期。";
  else if (!validDate(start) || !validDate(end) || start > end)
    errors.dates = "结束日期不能早于开始日期，请重新选择。";
  if (!campaign.venue.trim()) errors.venue = "请输入活动地点。";
  if (
    !Number.isInteger(campaign.capacity) ||
    (campaign.capacity ?? 0) < 1 ||
    (campaign.capacity ?? 0) > 500
  ) {
    errors.capacity = "参与人数需为 1–500 之间的整数。";
  }
  if (!owners.some((owner) => owner.value === campaign.owner))
    errors.owner = "请选择一位活动负责人。";
  if (!campaign.audiences.length) errors.audiences = "请至少选择一组目标客户。";
  return errors;
}
const errors = computed(() =>
  attempted.value ? validate(draft.value) : ({} as Errors),
);
const status = computed(() => [
  { text: "演示数据 · 刷新后还原" },
  dirty.value
    ? { text: "有未保存的修改", tone: "warn" as const }
    : savedAt.value
      ? { text: `示例已保存 · ${savedAt.value}`, tone: "ok" as const }
      : { text: "草稿" },
]);

async function save() {
  attempted.value = true;
  if (Object.keys(validate(draft.value)).length) {
    await nextTick();
    form.value
      ?.querySelector<HTMLElement>(
        'input[aria-invalid="true"], textarea[aria-invalid="true"], button[aria-invalid="true"]',
      )
      ?.focus();
    return;
  }
  draft.value = {
    ...copy(draft.value),
    name: draft.value.name.trim(),
    venue: draft.value.venue.trim(),
    description: draft.value.description.trim(),
  };
  saved.value = copy(draft.value);
  savedAt.value = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  attempted.value = false;
  toast.success("示例已保存到当前页面，刷新后还原。");
}
function reset() {
  draft.value = copy(saved.value);
  attempted.value = false;
  resetDialog.value = false;
}
const summary = computed(() => [
  { label: "活动名称", value: draft.value.name.trim() || "尚未填写" },
  {
    label: "活动日期",
    value:
      draft.value.dates.length === 2
        ? draft.value.dates.join(" 至 ")
        : "尚未选择",
  },
  { label: "活动地点", value: draft.value.venue.trim() || "尚未填写" },
  {
    label: "参与人数",
    value:
      draft.value.capacity === undefined
        ? "尚未填写"
        : `${draft.value.capacity} 人`,
  },
  {
    label: "负责人",
    value:
      owners.find((owner) => owner.value === draft.value.owner)?.label ??
      "尚未选择",
  },
  {
    label: "目标客户",
    value:
      draft.value.audiences
        .map(
          (value) =>
            audiences.find((audience) => audience.value === value)?.label ??
            value,
        )
        .join("、") || "尚未选择",
  },
  {
    label: "提醒设置",
    value: draft.value.reminder ? "开始前一天提醒（仅示例）" : "不提醒",
  },
]);
</script>

<template>
  <PageFrame title="编辑活动" workspace>
    <template #actions>
      <UiButton variant="ghost" :disabled="!dirty" @click="resetDialog = true"
        >还原</UiButton
      >
      <UiButton icon="view" @click="preview = true">预览</UiButton>
      <UiButton
        variant="primary"
        icon="check"
        type="submit"
        form="campaign-example"
        >保存示例</UiButton
      >
    </template>
    <template #status
      ><StatusLine :items="status" aria-live="polite"
    /></template>
    <WorkArea form fill>
      <form id="campaign-example" ref="form" novalidate @submit.prevent="save">
        <Stack gap="none">
          <FormSection title="活动内容">
            <Field label="活动名称" required :error="errors.name">
              <UiInput v-model="draft.name" maxlength="60" autocomplete="off" />
            </Field>
            <Field label="活动说明">
              <UiTextarea
                v-model="draft.description"
                :rows="2"
                :maxlength="500"
                autosize
              />
            </Field>
          </FormSection>
          <FormSection title="时间与地点">
            <Field label="活动日期" required :error="errors.dates">
              <UiDateRangePicker
                v-model="draft.dates"
                placeholder="选择开始和结束日期"
              />
            </Field>
            <Field label="活动地点" required :error="errors.venue">
              <UiInput
                v-model="draft.venue"
                maxlength="100"
                autocomplete="off"
              />
            </Field>
            <Grid :cols="2">
              <Field
                label="参与人数"
                required
                :error="errors.capacity"
                hint="1–500 人"
              >
                <UiNumberInput
                  v-model="draft.capacity"
                  :min="1"
                  :max="500"
                  unit="人"
                />
              </Field>
              <Field label="负责人" required :error="errors.owner">
                <UiSelect
                  v-model="draft.owner"
                  :options="owners"
                  placeholder="选择负责人"
                />
              </Field>
            </Grid>
          </FormSection>
          <FormSection title="参与客户">
            <Field label="目标客户" required :error="errors.audiences">
              <UiCombobox
                v-model="draft.audiences"
                :options="audiences"
                multiple
                placeholder="搜索并选择客户分组"
              />
            </Field>
            <Field
              label="活动提醒"
              hint="示例仅保存选项，不会发送短信、邮件或通知。"
            >
              <UiCheckbox
                :model-value="draft.reminder"
                label="活动开始前一天提醒参与者"
                @update:model-value="draft.reminder = $event === true"
              />
            </Field>
          </FormSection>
        </Stack>
      </form>
    </WorkArea>
  </PageFrame>
  <UiDialog
    v-model:open="preview"
    title="活动预览"
    description="查看当前输入的活动内容。示例不会创建真实活动或发送邀请。"
    width="lg"
  >
    <Stack gap="lg">
      <DescriptionList :items="summary" />
      <p v-if="draft.description.trim()">{{ draft.description }}</p>
    </Stack>
    <template #footer
      ><UiButton @click="preview = false">继续编辑</UiButton></template
    >
  </UiDialog>
  <UiDialog
    v-model:open="resetDialog"
    title="放弃未保存的修改？"
    description="将恢复到上次保存的示例内容。当前输入的修改会被丢弃。"
    width="sm"
  >
    <template #footer>
      <UiButton @click="resetDialog = false">继续编辑</UiButton>
      <UiButton variant="primary" @click="reset">放弃修改</UiButton>
    </template>
  </UiDialog>
</template>
