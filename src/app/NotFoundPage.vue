<script setup lang="ts">
import { useRouter } from "vue-router";
import { PageFrame, UiButton } from "@/shared/ui/public";
const router = useRouter();
</script>
<template>
  <PageFrame title="没有这个页面">
    <div class="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p
        class="text-[88px] leading-none font-semibold tracking-tighter text-primary-text/25 tabular-nums"
        aria-hidden="true"
      >
        404
      </p>
      <p class="mt-2 text-lg font-semibold">页面可能已关闭，或地址输入有误</p>
      <p class="text-fg-muted">检查一下地址，或回到工作台。</p>
      <div class="mt-4 flex gap-2">
        <UiButton @click="router.back()">返回上一页</UiButton
        ><UiButton variant="primary" @click="router.push('/')"
          >回到工作台</UiButton
        >
      </div>
    </div>
  </PageFrame>
</template>
