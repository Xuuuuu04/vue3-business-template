<script setup lang="ts">
/**
 * 应用外壳：可收起的侧栏 + 顶栏 + 内容区。窄屏侧栏变成从左滑出的面板。
 * 导航按“分组 → 多级菜单树”传入；当前页由路由决定。收起状态保存在浏览器里。
 */
import { computed, nextTick, ref, watch } from "vue";
import type { NavGroup } from "../lib/types";
import { currentNavItem } from "../lib/navigation";
import SidebarItem from "./SidebarItem.vue";
import { useRoute } from "vue-router";
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-vue-next";
import Tip from "../base/Tip.vue";
import BrandMark from "./BrandMark.vue";
import Button from "../base/Button.vue";

const props = defineProps<{
  brand: string;
  mark?: string;
  logo?: string;
  nav: NavGroup[];
  context?: string;
  section?: string;
  sectionTo?: string;
}>();

const KEY = "ui-sidebar-collapsed";
function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const collapsed = ref(read());
watch(collapsed, (v) => {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* 不能保存时本次仍生效 */
  }
});
const mobileOpen = ref(false);
const sidebar = ref<HTMLElement>();
watch(mobileOpen, async (open) => {
  await nextTick();
  if (open)
    sidebar.value
      ?.querySelector<HTMLButtonElement>('button[aria-label="关闭导航"]')
      ?.focus();
  else
    document
      .querySelector<HTMLButtonElement>('button[aria-label="打开导航"]')
      ?.focus();
});
const route = useRoute();
watch(
  () => route.fullPath,
  () => (mobileOpen.value = false),
);
const compact = computed(() => collapsed.value && !mobileOpen.value);
const current = computed(() =>
  currentNavItem(
    props.nav.flatMap((g) => g.items),
    route.path,
  ),
);
/** 手机面板保持键盘焦点在导航内，关闭后回到打开按钮。 */
function closeMobile(event: KeyboardEvent) {
  if (!mobileOpen.value) return;
  if (event.key === "Escape") {
    mobileOpen.value = false;
    return;
  }
  if (event.key !== "Tab") return;
  const targets = [
    ...(sidebar.value?.querySelectorAll<HTMLElement>(
      "a[href], button:not(:disabled)",
    ) ?? []),
  ].filter((el) => el.getClientRects().length);
  const next = event.shiftKey ? targets.at(-1) : targets[0];
  const edge = event.shiftKey ? targets[0] : targets.at(-1);
  if (document.activeElement === edge) {
    event.preventDefault();
    next?.focus();
  }
}
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:rounded-md focus:bg-surface focus:p-3"
    >跳到主要内容</a
  >
  <div
    class="grid h-dvh overflow-hidden transition-[grid-template-columns] duration-300 ease-(--ease)"
    :class="collapsed ? 'md:grid-cols-[64px_1fr]' : 'md:grid-cols-[240px_1fr]'"
  >
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-(--overlay) md:hidden"
      @click="mobileOpen = false"
    />
    <aside
      ref="sidebar"
      :role="mobileOpen ? 'dialog' : undefined"
      :aria-modal="mobileOpen ? true : undefined"
      :aria-label="mobileOpen ? '主要导航' : undefined"
      @keydown="closeMobile"
      class="fixed inset-y-0 left-0 z-50 flex w-[240px] -translate-x-full flex-col gap-1 border-r border-side-line bg-side p-2.5 sidebar-surface transition-transform duration-300 ease-(--ease) md:static md:w-auto md:translate-x-0"
      :class="mobileOpen && 'translate-x-0'"
    >
      <div
        class="-mx-0.5 flex h-16 items-center px-3 whitespace-nowrap"
        :class="compact && 'justify-center'"
      >
        <BrandMark
          :name="brand"
          :mark="mark"
          :logo="logo"
          size="md"
          :wordmark="!compact"
          class="min-w-0 text-side-active"
        />
      </div>
      <button
        v-if="mobileOpen"
        type="button"
        class="absolute right-3 top-3 rounded-md p-2 text-side-fg md:hidden"
        aria-label="关闭导航"
        @click="mobileOpen = false"
      >
        ×
      </button>
      <nav
        class="-mx-2.5 mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-label="主要导航"
      >
        <template v-for="(g, gi) in nav" :key="gi">
          <p
            v-if="g.title && !compact"
            class="px-5 pt-4 pb-2 text-[12px] font-medium tracking-wide text-side-faint"
          >
            {{ g.title }}
          </p>
          <div v-else-if="gi && compact" class="my-2 h-px bg-side-line" />
          <ul class="flex flex-col gap-1 px-3">
            <SidebarItem
              v-for="(item, i) in g.items"
              :key="`${item.to ?? item.label}-${i}`"
              :item="item"
              :current="current"
              :compact="compact"
              :route-key="route.fullPath"
              @expand="collapsed = false"
            />
          </ul>
        </template>
      </nav>
      <div class="-mx-2.5">
        <slot name="sidebar-footer" :collapsed="compact" />
      </div>
    </aside>

    <div :inert="mobileOpen" class="flex min-h-0 min-w-0 flex-col">
      <header
        class="z-30 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-3 md:px-5"
      >
        <Button
          variant="ghost"
          size="icon"
          class="md:hidden"
          aria-label="打开导航"
          @click="mobileOpen = true"
          ><Menu class="size-[18px]"
        /></Button>
        <Tip :text="collapsed ? '展开侧栏' : '收起侧栏'" class="max-md:hidden">
          <Button
            variant="ghost"
            size="icon"
            :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
            @click="collapsed = !collapsed"
          >
            <PanelLeftOpen
              v-if="collapsed"
              class="size-[18px]"
            /><PanelLeftClose v-else class="size-[18px]" />
          </Button>
        </Tip>
        <span class="ml-2 min-w-0 truncate text-[14px] text-fg-muted">{{
          context ?? brand
        }}</span>
        <span class="flex-1" />
        <slot name="topbar" />
      </header>
      <main
        id="main"
        class="workspace-canvas flex min-h-0 flex-1 flex-col overflow-hidden"
        tabindex="-1"
      >
        <div class="flex min-h-0 flex-1 flex-col overflow-auto"><slot /></div>
        <div
          v-if="$slots.footer"
          class="shrink-0 border-t border-line px-5 py-2.5"
        >
          <slot name="footer" />
        </div>
      </main>
    </div>
  </div>
</template>
