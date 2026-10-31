<script setup lang="ts">
import {
  Stack,
  Field,
  UiInput,
  UiPasswordInput,
  UiTextarea,
  UiSelect,
  UiCombobox,
  UiTagsInput,
  UiNumberInput,
  UiDatePicker,
  UiDateRangePicker,
  UiSwitch,
  UiCheckbox,
  UiRadioGroup,
  UiSegmented,
  FormSection,
  UiFileDrop,
} from "@/shared/ui/public";
import { kinds } from "./design-preview-data";
import { people } from "./design-preview-content";
import type { FormPreviewState } from "./design-preview-state";
const props = defineProps<{ example: string; state: FormPreviewState }>();
const {
  text,
  pwd,
  note,
  kind,
  owner,
  watchers,
  keywords,
  qty,
  day,
  period,
  notify,
  agreed,
  plan,
  range,
  file,
} = props.state;
</script>
<template>
  <template v-if="example === 'inputs'"
    ><Stack>
      <Field label="项目名称" for="n" required hint="用于列表显示"
        ><UiInput id="n" v-model="text" placeholder="请输入"
      /></Field>
      <Field label="单价" for="p" error="金额必须大于 0"
        ><UiInput id="p" model-value="-1" invalid align="right" unit
          ><template #suffix>元</template></UiInput
        ></Field
      >
      <Field label="密码" for="pw" hint="显示或隐藏密码，开启大写时提醒"
        ><UiPasswordInput id="pw" v-model="pwd" autocomplete="new-password"
      /></Field>
      <Field label="备注" for="note"
        ><UiTextarea
          id="note"
          v-model="note"
          autosize
          :maxlength="200"
          placeholder="随内容长高，最多 8 行"
      /></Field> </Stack
  ></template>
  <template v-if="example === 'choices'"
    ><Stack>
      <Field label="价型" hint="选项较少时使用下拉"
        ><UiSelect v-model="kind" :options="kinds" placeholder="请选择"
      /></Field>
      <Field label="负责人" hint="选项较多时可以搜索"
        ><UiCombobox
          v-model="owner"
          :options="people"
          placeholder="搜索姓名"
          aria-label="负责人"
      /></Field>
      <Field label="关注人" hint="可选择多人"
        ><UiCombobox
          v-model="watchers"
          :options="people"
          multiple
          placeholder="添加关注人"
          aria-label="关注人"
      /></Field>
      <Field label="关键词" hint="回车或逗号添加"
        ><UiTagsInput v-model="keywords" placeholder="输入关键词"
      /></Field> </Stack
  ></template>
  <template v-if="example === 'dates'"
    ><Stack>
      <Field label="采购数量"
        ><UiNumberInput
          v-model="qty"
          :min="0"
          :max="9999"
          unit="箱"
          aria-label="采购数量"
      /></Field>
      <Field label="到货日期"
        ><UiDatePicker v-model="day" placeholder="选择日期"
      /></Field>
      <Field label="统计区间" hint="可直接选择常用范围"
        ><UiDateRangePicker v-model="period" placeholder="选择日期范围"
      /></Field> </Stack
  ></template>
  <template v-if="example === 'toggles'"
    ><Stack>
      <UiSwitch
        v-model="notify"
        label="有新文件时通知我"
        hint="立即生效的设置用开关"
      />
      <UiCheckbox v-model="agreed" label="我已阅读项目说明" />
      <UiRadioGroup
        v-model="plan"
        direction="row"
        :options="[
          { value: 'personal', label: '个人' },
          { value: 'team', label: '团队' },
          { value: 'enterprise', label: '企业' },
        ]"
        aria-label="版本"
      />
      <UiSegmented
        v-model="range"
        :options="[
          { value: '7', label: '7 天' },
          { value: '30', label: '30 天' },
          { value: '90', label: '90 天' },
        ]"
        aria-label="时间范围"
      /> </Stack
  ></template>
  <template v-if="example === 'plans'"
    ><UiRadioGroup
      v-model="plan"
      variant="card"
      :options="[
        { value: 'personal', label: '个人版', hint: '1 人使用，5 GB 空间' },
        { value: 'team', label: '团队版', hint: '最多 50 人，500 GB 空间' },
        {
          value: 'enterprise',
          label: '企业版',
          hint: '不限人数，单点登录与审批',
        },
      ]"
      aria-label="方案"
  /></template>
  <template v-if="example === 'form-sections'"
    ><Stack gap="none">
      <FormSection title="通知" text="什么时候提醒你"
        ><UiSwitch v-model="notify" label="有新文件时通知我" /><UiSwitch
          :model-value="false"
          label="每周发送汇总邮件"
      /></FormSection>
      <FormSection title="默认查看范围" text="打开列表时默认显示的时间范围"
        ><UiSegmented
          v-model="range"
          :options="[
            { value: '7', label: '7 天' },
            { value: '30', label: '30 天' },
            { value: '90', label: '90 天' },
          ]"
          aria-label="默认范围"
      /></FormSection> </Stack
  ></template>
  <template v-if="example === 'upload'"
    ><UiFileDrop v-model="file" hint="一次一个文件，最大 10 MB"
  /></template>
</template>
