<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
import {
  Stack,
  Row,
  UiButton,
  UiTip,
  UiKbd,
  UiTag,
  UiAvatar,
  UiAvatarGroup,
  UiFileIcon,
  UiAlert,
  UiMenu,
  UiPopconfirm,
  UiProgress,
  UsageMeter,
  UiSteps,
  BatchProgress,
  UiSegmented,
  UiSkeleton,
  UiEmpty,
  StatusMessage,
  UiAccordion,
  UiResult,
  useToast,
} from "@/shared/ui/public";
import { sample } from "./design-preview-content";
import type { FeedbackPreviewState } from "./design-preview-state";
const props = defineProps<{ example: string; state: FeedbackPreviewState }>();
const { dialog, drawer, step, readState, resultState } = props.state;
const toast = useToast();
</script>
<template>
  <template v-if="example === 'buttons'"
    ><Stack>
      <Row
        ><UiButton variant="primary">主要操作</UiButton
        ><UiButton>次要操作</UiButton
        ><UiButton variant="ghost">轻量操作</UiButton
        ><UiButton variant="link">链接</UiButton></Row
      >
      <Row
        ><UiButton variant="danger-quiet" icon="delete">删除</UiButton
        ><UiButton variant="danger">确认删除</UiButton
        ><UiButton disabled>不可用</UiButton
        ><UiButton loading>处理中</UiButton></Row
      >
      <Row
        ><UiButton variant="primary" size="sm" icon="plus">小号</UiButton
        ><UiButton size="lg" icon="download">大号</UiButton
        ><UiTip text="下载"
          ><UiButton size="icon" icon="download" aria-label="下载" /></UiTip
        ><span class="text-help text-fg-muted"
          >快捷键 <UiKbd>⌘</UiKbd> <UiKbd>K</UiKbd></span
        ></Row
      >
    </Stack></template
  >
  <template v-if="example === 'tags'"
    ><Stack>
      <Row
        ><UiTag>默认</UiTag><UiTag tone="primary">强调</UiTag
        ><UiTag tone="ok" dot>成功</UiTag><UiTag tone="warn" dot>待处理</UiTag
        ><UiTag tone="bad" dot>失败</UiTag><UiTag tone="info">提示</UiTag
        ><UiTag tone="code">AX100245</UiTag></Row
      >
      <Row
        ><UiAvatar name="林知远" size="lg" /><UiAvatar name="周晓" /><UiAvatar
          name="陈一鸣"
          size="sm" /><UiAvatarGroup
          :people="[
            { name: '林知远' },
            { name: '周晓' },
            { name: '陈一鸣' },
            { name: '吴越' },
            { name: '何静' },
            { name: '赵岚' },
          ]"
      /></Row>
      <Row
        ><UiFileIcon name="a.pdf" /><UiFileIcon name="a.xlsx" /><UiFileIcon
          name="a.docx" /><UiFileIcon name="a.pptx" /><UiFileIcon
          name="a.png" /><UiFileIcon name="a.zip" /><UiFileIcon name="a.md"
      /></Row> </Stack
  ></template>
  <template v-if="example === 'alerts'"
    ><Stack gap="sm">
      <UiAlert
        tone="info"
        title="系统将在今晚 23:00 维护"
        text="维护期间约 10 分钟不能保存，请提前保存正在编辑的内容。"
        closable
      />
      <UiAlert tone="ok" text="价格表已更新到 10 月 6 日。" />
      <UiAlert
        tone="warn"
        title="有 2 个文件结果未确认"
        text="网络中断导致无法确认是否已删除。请先刷新列表查看，不要重复操作。"
        ><UiButton size="sm">刷新列表</UiButton></UiAlert
      >
      <UiAlert
        tone="bad"
        title="保存失败"
        text="金额必须大于 0，原来的输入已保留。"
      /> </Stack
  ></template>
  <template v-if="example === 'overlays'"
    ><Row>
      <UiButton @click="dialog = true">确认弹窗</UiButton
      ><UiButton @click="drawer = true">侧边抽屉</UiButton>
      <UiMenu
        :items="[
          { key: 'a', label: '编辑' },
          { key: 'b', label: '复制' },
          { key: 'c', label: '删除', danger: true },
        ]"
        @select="(k) => toast.info(`选择了 ${k}`)"
        ><UiButton>更多操作</UiButton></UiMenu
      >
      <UiPopconfirm
        title="移除这一行？"
        text="可以在回收站恢复。"
        danger
        confirm-text="移除"
        @confirm="toast.success('已移除')"
        ><UiButton variant="danger-quiet">气泡确认</UiButton></UiPopconfirm
      >
      <UiButton @click="toast.success('已保存')">轻提示</UiButton>
    </Row></template
  >
  <template v-if="example === 'progress'"
    ><Stack>
      <UiProgress :value="68" label="上传进度" /><UiProgress
        :value="92"
        tone="warn"
        label="空间"
      /><UiProgress label="处理中" />
      <UsageMeter
        label="存储空间"
        :used="412"
        :limit="500"
        unit=" GB"
      /> </Stack
  ></template>
  <template v-if="example === 'steps'"
    ><Stack>
      <UiSteps
        :items="[
          { title: '填写信息' },
          { title: '选择方案', text: '可随时更换' },
          { title: '确认支付' },
          { title: '完成' },
        ]"
        :current="step"
      />
      <Row justify="end"
        ><UiButton :disabled="step === 0" @click="step--">上一步</UiButton
        ><UiButton variant="primary" :disabled="step === 3" @click="step++"
          >下一步</UiButton
        ></Row
      >
    </Stack></template
  >
  <template v-if="example === 'batch'"
    ><BatchProgress :items="sample" verb="已删除"
  /></template>
  <template v-if="example === 'states'">
    <UiSegmented
      v-model="readState"
      :options="[
        { value: 'loading', label: '读取中' },
        { value: 'empty', label: '无结果' },
        { value: 'error', label: '失败' },
      ]"
      aria-label="读取状态"
    />
    <Stack v-if="readState === 'loading'"
      ><UiSkeleton width="60%" /><UiSkeleton width="90%" /><UiSkeleton
        width="75%"
    /></Stack>
    <UiEmpty
      v-else-if="readState === 'empty'"
      title="没有符合条件的数据"
      hint="换个关键词，或清除筛选条件"
      ><template #icon><Inbox class="size-5" /></template
      ><UiButton>清除筛选</UiButton></UiEmpty
    >
    <StatusMessage
      v-else
      status="error"
      error="保存失败：原来的输入已保留，可以修改后再提交。"
    />
  </template>
  <template v-if="example === 'accordion'"
    ><UiAccordion
      :items="[
        { value: 'a', title: '文件最大可以多大？' },
        { value: 'b', title: '删除后还能恢复吗？' },
        { value: 'c', title: '谁能看到我上传的文件？' },
      ]"
      :default-open="['a']"
      ><template #item-a>单个文件不超过 10 MB，产品可以在后台调整。</template
      ><template #item-b>删除后不能恢复，请先下载备份。</template
      ><template #item-c>同一团队里有查看权限的成员。</template></UiAccordion
    ></template
  >
  <template v-if="example === 'result'">
    <UiSegmented
      v-model="resultState"
      :options="[
        { value: 'success', label: '成功' },
        { value: 'error', label: '失败' },
      ]"
      aria-label="结果状态"
    />
    <UiResult
      v-if="resultState === 'success'"
      status="success"
      title="提交成功"
      text="审批人会在 1 个工作日内处理，结果会通知你。"
      ><UiButton variant="primary">查看申请</UiButton
      ><UiButton>返回列表</UiButton></UiResult
    >
    <UiResult
      v-else
      status="error"
      title="支付没有完成"
      text="银行返回余额不足。订单已保留 30 分钟。"
      ><UiButton variant="primary">重新支付</UiButton></UiResult
    >
  </template>
</template>
