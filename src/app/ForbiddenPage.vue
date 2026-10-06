<script setup lang="ts">
import { useRouter } from "vue-router";
import { PageFrame, UiButton } from "@/shared/ui/public";
const router = useRouter();
</script>
<template>
  <PageFrame title="当前账号没有这项权限">
    <div class="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p class="text-[88px] leading-none font-semibold tracking-tighter text-primary-text/25 tabular-nums" aria-hidden="true">403</p>
      <p class="mt-2 text-lg font-semibold">无法打开这个页面</p>
      <p class="text-fg-muted">请返回可以访问的页面，或联系管理员调整账号权限。</p>
      <div class="mt-4 flex gap-2"><UiButton variant="primary" @click="router.push('/')">回到工作台</UiButton></div>
    </div>
  </PageFrame>
</template>
