<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { useRoute, useRouter, RouterView, RouterLink } from "vue-router";
import { ArrowLeft, Wrench, Compass, History, Gauge, Palette, PlugZap, Search, Moon, Sun, LogOut, Info, Settings, PanelsTopLeft, LayoutDashboard, Users, CalendarDays, ClipboardCheck, MessagesSquare } from "lucide-vue-next";
import { useSession } from "@/shared/public";
import { usePerformance } from "@/shared/records/performance";
import {
  AppShell, AppFooter, ThemePanel, NotificationBell, UserMenu, CommandPalette, TopProgress, Toaster, BrandMark,
  UiButton, UiTag, UiTip, UiDialog, SpeedChip, syncFavicon, palettes, useTheme, moduleIcon, type NavGroup,
} from "@/shared/ui/public";
import { appConfig } from "./app.config";
import { moduleNavigation } from "./navigation";
import { enabledModules, consoleEnabled } from "./router";

const route = useRoute();
const router = useRouter();
const session = useSession();
const identity = session.state;
const { settings, update, choosePalette } = useTheme();

/** 登录页和协议页不显示侧栏与顶栏。 */
const bare = computed(() => route.path === "/login" || route.path.startsWith("/legal/"));
/** 开发者工具和产品界面分开：进入 /dev 后侧栏只显示开发者工具。 */
const inDev = computed(() => route.path === "/dev" || route.path.startsWith("/dev/"));
const inExamples = computed(() => route.path.startsWith("/dev/examples"));
const nav = computed<NavGroup[]>(() =>
  inExamples.value
    ? [
        { items: [{ to: "/dev", label: "返回开发者工具", icon: ArrowLeft, exact: true }] },
        { title: "功能示例", items: [
          { to: "/dev/examples/overview", label: "经营总览", icon: LayoutDashboard },
          { to: "/dev/examples/customers", label: "客户管理", icon: Users },
          { to: "/dev/examples/campaign", label: "活动编辑", icon: CalendarDays },
          { to: "/dev/examples/approval", label: "采购审批", icon: ClipboardCheck },
          { to: "/dev/examples/inbox", label: "客服会话", icon: MessagesSquare },
        ] },
        { items: [{ to: "/dev/design", label: "组件与配色", icon: Palette }] },
      ]
    : inDev.value
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
            { to: "/dev/examples", label: "功能示例", icon: PanelsTopLeft },
          ],
        },
      ]
    : [{ title: "工作空间", items: enabledModules.flatMap((m) => { const item = moduleNavigation(m, session.can); return item ? [{ ...item, icon: moduleIcon(m.icon) }] : []; }) }],
);

// 页面标题前的模块图标：业务页按所属模块自动显示，开发者工具不显示。
provide("page-icon", computed(() => {
  if (inDev.value) return undefined;
  const owner = enabledModules.find((m) => m.name === route.meta.module);
  return owner ? moduleIcon(owner.icon) : undefined;
}));

// 开发时顶栏显示最近一次页面切换耗时。
const { signals } = usePerformance();
const lastSwitch = computed(() => [...signals.value].reverse().find((s) => s.kind === "navigation-dom")?.duration);

// 顶部进度条：路由开始切换到完成
const loading = ref(false);
const stops = [router.beforeEach(() => { loading.value = true; }), router.afterEach(() => { loading.value = false; }), router.onError(() => { loading.value = false; })];
onBeforeUnmount(() => stops.forEach((stop) => stop()));

// 浏览器标签页图标跟随品牌色
const theme = computed(() => `${settings.palette}${settings.brandHue}${settings.mode}`);
onMounted(() => syncFavicon(appConfig.mark, appConfig.logo));
watch(theme, () => requestAnimationFrame(() => syncFavicon(appConfig.mark, appConfig.logo)));

// 全局搜索：⌘K / Ctrl+K
const search = ref(false);
const searchLoaded = ref(false);
watch(search, (open) => { if (open) searchLoaded.value = true; });
const about = ref(false);
function onKey(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.value = !search.value; } }
onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function leave() { session.logoutLocal(); void router.replace("/login"); }
function help() { appConfig.support.helpUrl ? window.open(appConfig.support.helpUrl, "_blank", "noopener") : (window.location.href = `mailto:${appConfig.support.email}`); }

const commands = computed(() => [
  ...enabledModules.map((m) => ({ id: `go-${m.name}`, group: "页面", label: m.title, icon: moduleIcon(m.icon), hint: m.pages[0]?.path, run: () => void router.push(m.pages[0]?.path || "/") })),
  ...(consoleEnabled ? [{ id: "dev", group: "开发者", label: "开发者工具", icon: Wrench, hint: "/dev", run: () => void router.push("/dev") }] : []),
  { id: "mode", group: "外观", label: settings.mode === "dark" ? "切换到浅色" : "切换到深色", icon: settings.mode === "dark" ? Sun : Moon, run: () => update({ mode: settings.mode === "dark" ? "light" : "dark" }) },
  ...palettes.map((p) => ({ id: `pal-${p.id}`, group: "外观", label: `配色：${p.name}`, icon: Palette, hint: p.character.split("，")[0], run: () => choosePalette(p.id) })),
  { id: "settings", group: "外观", label: "偏好设置", icon: Settings, hint: "/settings", run: () => void router.push("/settings") },
  { id: "about", group: "帮助", label: "关于", icon: Info, run: () => (about.value = true) },
  ...(identity.value.signedIn ? [{ id: "logout", group: "账号", label: "退出登录", icon: LogOut, run: leave }] : []),
]);
const footerLinks = [{ label: "用户协议", to: "/legal/terms" }, { label: "隐私政策", to: "/legal/privacy" }];
const build = (import.meta.env.VITE_CODE_VERSION as string | undefined)?.slice(0, 8);
</script>
<template>
  <TopProgress :active="loading" />
  <RouterView v-if="bare" />
  <AppShell v-else :brand="appConfig.name" :mark="appConfig.mark" :logo="appConfig.logo" :nav="nav" :context="inExamples ? '功能示例' : inDev ? '开发者工具' : identity.org">
    <template #sidebar-footer="{ collapsed }">
      <UiTip :text="collapsed ? '开发者工具（仅开发时可见）' : ''">
        <RouterLink v-if="consoleEnabled && !inDev" to="/dev" class="flex h-10 w-full items-center gap-3 px-[18px] text-side-faint transition-colors hover:bg-side-hover hover:text-side-fg" :class="collapsed && 'justify-center px-0'" aria-label="开发者工具">
          <Wrench class="size-[18px] shrink-0" /><span v-show="!collapsed" class="truncate">开发者工具</span>
        </RouterLink>
      </UiTip>
    </template>
    <template #search>
      <button type="button" class="mr-2 hidden h-9 w-60 items-center gap-2 rounded-md border border-line bg-surface px-3 text-fg-faint shadow-card transition-colors hover:border-line-strong hover:text-fg-muted md:flex" aria-label="搜索页面和操作" @click="search = true">
        <Search class="size-4" /><span class="flex-1 text-left">搜索页面和操作</span><kbd class="rounded border border-line-strong px-1.5 font-mono text-[11px]">{{ isMac ? "⌘" : "Ctrl" }} K</kbd>
      </button>
      <UiTip text="搜索"><UiButton variant="ghost" size="icon" class="md:hidden" aria-label="搜索页面和操作" @click="search = true"><Search class="size-[18px]" /></UiButton></UiTip>
    </template>
    <template #topbar>
      <SpeedChip v-if="consoleEnabled" :value="lastSwitch" to="/dev/speed" />
      <UiTip v-if="session.demo" text="当前是演示数据，没有连接后台"><UiTag tone="warn" class="mr-1">演示数据</UiTag></UiTip>
      <NotificationBell />
      <ThemePanel />
      <UserMenu :name="identity.signedIn ? identity.username : session.demo ? '演示用户' : '未登录'" :org="identity.org" :signed-in="identity.signedIn && !session.demo" :help-available="Boolean(appConfig.support.email || appConfig.support.helpUrl)" @settings="router.push('/settings')" @help="help" @about="about = true" @logout="leave" />
    </template>
    <RouterView />
    <template #footer><AppFooter :company="appConfig.company" :icp="appConfig.icp" :version="appConfig.version" :links="footerLinks" /></template>
  </AppShell>
  <CommandPalette v-if="searchLoaded" v-model:open="search" :commands="commands" />
  <UiDialog v-model:open="about" title="关于" width="sm">
    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <BrandMark :name="appConfig.name" :mark="appConfig.mark" :logo="appConfig.logo" size="xl" />
      <div><p class="text-lg font-semibold tracking-tight">{{ appConfig.name }}</p><p class="text-fg-faint tabular-nums">版本 {{ appConfig.version }}<template v-if="build">（{{ build }}）</template></p></div>
      <p class="text-[13px] text-fg-faint">© {{ new Date().getFullYear() }} {{ appConfig.company }}</p>
    </div>
    <template #footer><UiButton @click="about = false">关闭</UiButton></template>
  </UiDialog>
  <Toaster />
</template>
