<script setup lang="ts">
import { Boxes } from "lucide-vue-next";
import { PageFrame, UiEmpty } from "@/shared/ui/public";
</script>
<template>
  <PageFrame title="开始你的产品">
    <UiEmpty title="当前没有启用的业务模块" hint="先用模块生成命令创建开发包，再按业务规则填写步骤和页面。业务模块登记后会出现在导航中。">
      <template #icon><Boxes class="size-5" /></template>
    </UiEmpty>
  </PageFrame>
</template>
