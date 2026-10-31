<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  PageFrame,
  UiTabs,
  UiDialog,
  UiDrawer,
  UiButton,
  DescriptionList,
  useToast,
} from "@/shared/ui/public";
import GalleryStage from "./GalleryStage.vue";
import DesignThemePreview from "./DesignThemePreview.vue";
import DesignFormsPreview from "./DesignFormsPreview.vue";
import DesignFeedbackPreview from "./DesignFeedbackPreview.vue";
import DesignDataPreview from "./DesignDataPreview.vue";
import DesignAiPreview from "./DesignAiPreview.vue";
import DesignRecipesPreview from "./DesignRecipesPreview.vue";
import { examples } from "./design-preview-catalog";
import {
  useFormPreview,
  useDataPreview,
  useFeedbackPreview,
} from "./design-preview-state";
import { useAiPreview } from "./design-preview-ai";
const route = useRoute();
const router = useRouter();
const toast = useToast();
const tab = computed({
  get: () =>
    Object.hasOwn(examples, String(route.query.section))
      ? String(route.query.section)
      : "theme",
  set: (value: string) => {
    void router.replace({
      query: {
        ...route.query,
        section: value,
        example: examples[value]![0]!.value,
      },
    });
  },
});
const example = computed({
  get: () =>
    examples[tab.value]!.some((item) => item.value === route.query.example)
      ? String(route.query.example)
      : examples[tab.value]![0]!.value,
  set: (value: string) => {
    void router.replace({
      query: { ...route.query, section: tab.value, example: value },
    });
  },
});

const forms = useFormPreview();
const data = useDataPreview(forms.kind);
const feedback = useFeedbackPreview(data.dialog, data.drawer);
const ai = useAiPreview();
const { dialog, drawer, inspected, selectInspected } = data;
</script>
<template>
  <PageFrame title="设计预览" workspace>
    <template #tabs
      ><UiTabs
        v-model="tab"
        :items="[
          { value: 'theme', label: '配色与字体' },
          { value: 'forms', label: '表单' },
          { value: 'feedback', label: '按钮与反馈' },
          { value: 'data', label: '数据展示' },
          { value: 'ai', label: 'AI 应用' },
          { value: 'pages', label: '页面拼法' },
        ]"
    /></template>
    <GalleryStage v-model="example" :items="examples[tab]!">
      <template #[example]>
        <DesignThemePreview v-if="tab === 'theme'" :example="example" />
        <DesignFormsPreview
          v-else-if="tab === 'forms'"
          :example="example"
          :state="forms"
        />
        <DesignFeedbackPreview
          v-else-if="tab === 'feedback'"
          :example="example"
          :state="feedback"
        />
        <DesignDataPreview
          v-else-if="tab === 'data'"
          :example="example"
          :state="data"
        />
        <DesignAiPreview
          v-else-if="tab === 'ai'"
          :example="example"
          :state="ai"
        />
        <DesignRecipesPreview v-else :example="example" />
      </template>
    </GalleryStage>
    <UiDialog
      v-model:open="dialog"
      title="确认操作示例"
      description="此处演示确认与反馈的交互，确认后关闭弹窗，示例价格保持原值。"
    >
      <template #footer
        ><UiButton @click="dialog = false">取消</UiButton
        ><UiButton
          variant="primary"
          @click="
            dialog = false;
            toast.success('演示确认完成');
          "
          >确认</UiButton
        ></template
      >
    </UiDialog>
    <UiDrawer v-model:open="drawer" :title="inspected.name">
      <DescriptionList
        :items="[
          { label: 'SKU', value: inspected.sku },
          { label: '门店', value: inspected.store },
          { label: '原价', value: `${inspected.orig.toFixed(2)} 元` },
          { label: '活动价', value: `${inspected.act.toFixed(2)} 元` },
        ]"
      />
      <template #footer
        ><UiButton @click="drawer = false">关闭</UiButton
        ><UiButton variant="primary" @click="selectInspected"
          >选中商品</UiButton
        ></template
      >
    </UiDrawer>
  </PageFrame>
</template>
