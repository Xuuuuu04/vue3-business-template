<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, RouterView, RouterLink } from "vue-router";
import { LayoutGrid, LogOut, LogIn, ArrowLeft, Wrench, Compass, History, Gauge, Palette, PlugZap } from "lucide-vue-next";
import { useSession } from "@/shared/public";
import { AppShell, ThemePanel, Toaster, UiButton, UiTag, UiTip, type NavGroup } from "@/shared/ui/public";
import { appConfig } from "./app.config";
import { enabledModules, consoleEnabled } from "./router";

const route = useRoute();
const router = useRouter();
const session = useSession();
const identity = session.state;
/** 登录页不显示侧栏与顶栏。 */
const bare = computed(() => route.path === "/login");
/** 开发者工具和产品界面分开：进入 /dev 后侧栏只显示开发者工具。 */
const inDev = computed(() => route.path === "/dev" || route.path.startsWith("/dev/"));

/** 业务页面的面包屑前一级：当前页面所属模块。 */
const moduleTitle = computed(() => enabledModules.find((m) => m.name === route.meta.module)?.title);

const nav = computed<NavGroup[]>(() =>
  inDev.value
    ? [
        { items: [{ to: "/", label: "返回产品", icon: ArrowLeft, exact: true }] },
        {
          title: "开发者工具",
          items: [
            { to: "/dev", label: "接入与说明", icon: PlugZap, exact: true },
            { to: "/dev/map", label: "功能地图", icon: Compass },
            { to: "/dev/records", label: "操作记录", icon: History },
            { to: "/dev/speed", label: "页面速度", icon: Gauge },
            { to: "/dev/design", label: "设计预览", icon: Palette },
          ],
        },
      ]
    : [{ items: enabledModules.map((m) => ({ to: m.pages[0]?.path || "/", label: m.title, icon: LayoutGrid })) }],
);

function leaveSession() {
  session.logoutLocal();
  void router.replace("/login");
}
</script>
<template>
  <RouterView v-if="bare" />
  <AppShell v-else :brand="appConfig.name" :mark="appConfig.mark" :logo="appConfig.logo" :nav="nav" :section="inDev ? '开发者工具' : moduleTitle">
    <template #sidebar-footer="{ collapsed }">
      <UiTip :text="collapsed ? '开发者工具（仅开发时可见）' : ''">
        <RouterLink v-if="consoleEnabled && !inDev" to="/dev" class="flex h-10 w-full items-center gap-3 px-[18px] text-side-faint transition-colors hover:bg-side-hover hover:text-side-fg" :class="collapsed && 'justify-center px-0'" aria-label="开发者工具">
          <Wrench class="size-[18px] shrink-0" /><span v-show="!collapsed" class="truncate">开发者工具</span>
        </RouterLink>
      </UiTip>
    </template>
    <template #topbar>
      <UiTag v-if="session.demo" tone="warn">演示数据</UiTag>
      <ThemePanel />
      <template v-if="!session.demo">
        <span class="mx-2 text-fg-muted">{{ identity.signedIn ? identity.username : "尚未登录" }}</span>
        <UiTip v-if="identity.signedIn" text="退出登录"><UiButton variant="ghost" size="icon" aria-label="退出登录" @click="leaveSession"><LogOut class="size-[18px]" /></UiButton></UiTip>
        <UiButton v-else variant="secondary" @click="router.push('/login')"><LogIn class="size-4" />登录账号</UiButton>
      </template>
    </template>
    <RouterView />
  </AppShell>
  <Toaster />
</template>
