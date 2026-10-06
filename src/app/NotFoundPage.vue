<script setup lang="ts">
import { SearchX } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { PageFrame, UiEmpty, UiButton } from "@/shared/ui/public";
const router = useRouter();
</script>
<template>
  <PageFrame title="没有这个页面">
    <UiEmpty title="页面可能已关闭，或地址输入有误">
      <template #icon><SearchX class="size-5" /></template>
      <UiButton variant="primary" @click="router.push('/')">返回工作台</UiButton>
    </UiEmpty>
  </PageFrame>
</template>
