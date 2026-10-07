<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Compass, History, Gauge, Palette, ChevronRight } from "lucide-vue-next";
import generatedGraph from "@/generated/graph.json";
import { useSession } from "@/shared/public";
import { PageFrame, StatusLine, WorkArea, Stack, UiTag } from "@/shared/ui/public";
import { appConfig } from "../app.config";

const session = useSession();
const graph = generatedGraph as unknown as { pages: unknown[]; actions: unknown[] }[];
const pages = graph.reduce((n, m) => n + m.pages.length, 0);
const actions = graph.reduce((n, m) => n + m.actions.length, 0);
const tools = [
  { to: "/dev/map", icon: Compass, name: "功能地图", text: "每个业务有哪些页面、点一个按钮后依次做了什么、调用了哪个接口、代码在哪个文件。" },
  { to: "/dev/records", icon: History, name: "操作记录", text: "你在页面上做过的每次操作：成功还是失败、花了多久、请求了哪些接口。出问题时先看这里。" },
  { to: "/dev/speed", icon: Gauge, name: "页面速度", text: "页面切换、接口等待、最慢的操作。判断“慢”是慢在页面还是慢在后台。" },
  { to: "/dev/design", icon: Palette, name: "设计预览", text: "所有组件、七套配色和页面拼法的实际效果。选配色、挑组件时看这里。" },
];
</script>
<template>
  <PageFrame title="接入与说明" workspace>
    <template #status>
      <StatusLine :items="[
        session.demo ? { text: '当前使用演示数据，没有连接后台', tone: 'warn' } : { text: '已连接后台', tone: 'ok' },
        { text: `${graph.length} 个业务模块 · ${pages} 个页面 · ${actions} 个操作` },
      ]" />
    </template>
    <WorkArea form fill>
      <section class="border-b border-line pb-8 last:border-0"><h2 class="mb-4 text-[18px] font-medium">数据从哪来</h2>
        <Stack gap="sm">
          <p v-if="session.demo">页面现在请求的是开发服务器里的<b>模拟服务</b>。数据只存在内存里，重启就恢复成初始样子。它用来演示和测试界面，不代表任何真实业务。</p>
          <p v-else>页面通过同源的 <UiTag tone="code">/api</UiTag> 请求后台，开发时由开发服务器转发。登录使用后台账号，所有权限以后台为准。</p>
          <p class="text-fg-muted">每个业务的接口地址和返回字段写在 <UiTag tone="code">src/modules/包名/api.ts</UiTag>，要和后端接口文档保持一致。</p>
        </Stack>
      </section>
      <section class="border-b border-line pb-8 last:border-0"><h2 class="mb-4 text-[18px] font-medium">连接真实后台</h2>
        <ol class="flex list-decimal flex-col gap-2 pl-5 marker:text-fg-faint">
          <li>复制 <UiTag tone="code">.env.example</UiTag> 为 <UiTag tone="code">.env</UiTag>。</li>
          <li>设置 <UiTag tone="code">VITE_API_MODE=real</UiTag>、<UiTag tone="code">API_PROXY_TARGET</UiTag>（后台地址）、<UiTag tone="code">VITE_ORG_ID</UiTag>（组织代码）。</li>
          <li>运行 <UiTag tone="code">npm run dev:real</UiTag>，在登录页使用后台账号。</li>
        </ol>
      </section>
      <section class="border-b border-line pb-8 last:border-0"><h2 class="mb-4 text-[18px] font-medium">开发者工具</h2>
        <ul>
          <li v-for="t in tools" :key="t.to" class="border-t border-line first:border-t-0">
            <RouterLink :to="t.to" class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-subtle">
              <component :is="t.icon" class="mt-0.5 size-[18px] shrink-0 text-fg-faint" />
              <span class="min-w-0 flex-1"><b class="font-medium">{{ t.name }}</b><span class="mt-0.5 block text-fg-muted">{{ t.text }}</span></span>
              <ChevronRight class="mt-0.5 size-4 shrink-0 text-fg-faint" />
            </RouterLink>
          </li>
        </ul>
      </section>
      <section class="border-b border-line pb-8 last:border-0"><h2 class="mb-4 text-[18px] font-medium">换成你的产品</h2>
        <ol class="flex list-decimal flex-col gap-2 pl-5 marker:text-fg-faint">
          <li>改 <UiTag tone="code">src/app/app.config.ts</UiTag>：产品名称（现在是「{{ appConfig.name }}」）、logo、登录页文案、默认配色。</li>
          <li>新建业务：<UiTag tone="code">npm run new:module -- 包名 --title 中文名</UiTag>，页面和流程按生成的样板填写。</li>
          <li>在「设计预览」里选配色、看组件，再回到 <UiTag tone="code">app.config.ts</UiTag> 把选定的配色写成默认。</li>
        </ol>
      </section>
    </WorkArea>
  </PageFrame>
</template>
