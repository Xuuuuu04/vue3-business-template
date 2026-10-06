<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, RouterView } from "vue-router";
import { LayoutGrid, Network, Palette, LogOut, LogIn } from "lucide-vue-next";
import { useSession } from "@/shared/public";
import { AppShell, ThemePanel, Toaster, UiButton, UiTag, UiTip, type NavGroup } from "@/shared/ui/public";
import { enabledModules, consoleEnabled } from "./router";

const route = useRoute();
const router = useRouter();
const session = useSession();
const identity = session.state;
/** 登录页不显示侧栏与顶栏。 */
const bare = computed(() => route.path === "/login");

const nav = computed<NavGroup[]>(() => [
  { title: "工作", items: enabledModules.map((m) => ({ to: m.pages[0]?.path || "/", label: m.title, icon: LayoutGrid })) },
  ...(consoleEnabled
    ? [{ title: "开发", items: [{ to: "/system/console", label: "结构与运行", icon: Network }, { to: "/system/components", label: "界面库", icon: Palette }] }]
    : []),
]);

function leaveSession() {
  session.logoutLocal();
  void router.replace("/login");
}
</script>
<template>
  <RouterView v-if="bare" />
  <AppShell v-else brand="工作台" mark="木" :nav="nav">
    <template #topbar>
      <UiTag v-if="session.demo" tone="primary">样板演示</UiTag>
      <ThemePanel />
      <template v-if="!session.demo">
        <span class="mx-2 text-fg-muted">{{ identity.signedIn ? identity.username : "尚未登录" }}</span>
        <UiTip v-if="identity.signedIn" text="退出当前页面"><UiButton variant="ghost" size="icon" aria-label="退出当前页面" @click="leaveSession"><LogOut class="size-[18px]" /></UiButton></UiTip>
        <UiButton v-else variant="secondary" @click="router.push('/login')"><LogIn class="size-4" />登录账号</UiButton>
      </template>
    </template>
    <RouterView />
  </AppShell>
  <Toaster />
</template>
