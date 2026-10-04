<script setup lang="ts">
import { ref } from "vue";
import {
  PageFrame,
  UiButton,
  UiInput,
  UiSelect,
  UiOption,
  UiCheckbox,
  UiDialog,
  StatusMessage,
} from "@/shared/ui/public";
const name = ref("");
const type = ref("general");
const agreed = ref(false);
const dialog = ref(false);
</script>
<template>
  <PageFrame
    title="组件样板"
    description="所有业务页使用同一套主题、字号、控件与布局。更换颜色从主题变量开始。"
    ><div class="form-section specimen">
      <h2>基础输入</h2>
      <div class="field">
        <label for="sample-name">项目名称</label
        ><UiInput
          id="sample-name"
          v-model="name"
          placeholder="请输入项目名称"
        />
      </div>
      <div class="field">
        <label for="sample-type">项目类型</label
        ><UiSelect id="sample-type" v-model="type"
          ><UiOption label="普通项目" value="general" /><UiOption
            label="迁移项目"
            value="migration"
        /></UiSelect>
      </div>
      <UiCheckbox v-model="agreed">我已阅读项目说明</UiCheckbox>
      <div class="action-row">
        <UiButton type="primary" @click="dialog = true">主要操作</UiButton
        ><UiButton @click="name = ''">清空输入</UiButton
        ><UiButton disabled>当前不可用</UiButton
        ><UiButton type="danger" plain>危险操作</UiButton>
      </div>
    </div>
    <StatusMessage
      status="error"
      error="示例：保存失败，原来的输入继续保留。"
    />
    <section class="content-section">
      <h2>页面规则</h2>
      <ul class="plain-list">
        <li>正文与主要控件使用 16px 字号，帮助文字也不缩小。</li>
        <li>操作靠明确文字与状态说明，不靠颜色猜测。</li>
        <li>列表使用表格，详情使用字段分区，编辑使用清楚的表单。</li>
        <li>没有装饰性的左侧高亮条，也没有为了占位排列的卡片。</li>
      </ul>
    </section>
    <UiDialog v-model="dialog" title="操作确认示例" width="min(520px, 92vw)"
      ><p>这里写清将改变的对象与结果，键盘可以进入和退出弹窗。</p>
      <template #footer
        ><UiButton @click="dialog = false">取消</UiButton
        ><UiButton type="primary" @click="dialog = false"
          >确认操作</UiButton
        ></template
      ></UiDialog
    ></PageFrame
  >
</template>
