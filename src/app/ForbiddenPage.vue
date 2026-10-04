<script setup lang="ts">
import { PageFrame } from "@/shared/ui/public";
</script>
<template>
  <PageFrame
    title="当前账号没有这项权限"
    description="请返回可以访问的页面，或联系管理员调整账号权限。"
    ><RouterLink to="/">返回工作台</RouterLink></PageFrame
  >
</template>
