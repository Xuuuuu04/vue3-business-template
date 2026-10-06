<script setup lang="ts">
import { ShieldAlert } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { PageFrame, UiEmpty, UiButton } from "@/shared/ui/public";
const router = useRouter();
</script>
<template>
  <PageFrame title="当前账号没有这项权限">
    <UiEmpty title="无法打开这个页面" hint="请返回可以访问的页面，或联系管理员调整账号权限。">
      <template #icon><ShieldAlert class="size-5" /></template>
      <UiButton variant="primary" @click="router.push('/')">返回工作台</UiButton>
    </UiEmpty>
  </PageFrame>
</template>
