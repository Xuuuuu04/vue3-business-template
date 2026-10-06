<script setup lang="ts">
/**
 * 应用外壳：可收起的侧栏 + 顶栏 + 内容区。窄屏侧栏变成从左滑出的面板。
 * 导航按“分组 → 项”传入；当前页由路由决定。收起状态保存在浏览器里。
 */
import { computed, ref, watch, type Component } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-vue-next";
import Tip from "../base/Tip.vue";
import Button from "../base/Button.vue";

const props = defineProps<{ brand: string; mark?: string; logo?: string; nav: { title?: string; items: { to: string; label: string; icon?: Component; badge?: number; exact?: boolean }[] }[]; section?: string }>();

const KEY = "ui-sidebar-collapsed";
function read(): boolean { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } }
const collapsed = ref(read());
watch(collapsed, (v) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* 不能保存时本次仍生效 */ } });
const mobileOpen = ref(false);
const route = useRoute();
watch(() => route.fullPath, () => (mobileOpen.value = false));
const title = computed(() => String(route.meta.title ?? ""));
const initial = computed(() => props.mark ?? props.brand.slice(0, 1));
function active(item: { to: string; exact?: boolean }) { return route.path === item.to || (!item.exact && route.path.startsWith(item.to + "/")); }
</script>

<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:rounded-md focus:bg-surface focus:p-3">跳到主要内容</a>
  <div class="grid h-screen overflow-hidden transition-[grid-template-columns] duration-300 ease-(--ease)" :class="collapsed ? 'md:grid-cols-[64px_1fr]' : 'md:grid-cols-[232px_1fr]'">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-(--overlay) md:hidden" @click="mobileOpen = false" />
    <aside class="fixed inset-y-0 left-0 z-50 flex w-[232px] -translate-x-full flex-col gap-1 border-r border-side-line bg-side p-2.5 transition-transform duration-300 ease-(--ease) md:static md:w-auto md:translate-x-0" :class="mobileOpen && 'translate-x-0'">
      <div class="flex h-12 items-center gap-2.5 px-2 whitespace-nowrap">
        <img v-if="logo" :src="logo" :alt="brand" class="size-7 shrink-0 rounded-md object-contain" />
        <span v-else class="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[15px] font-bold text-primary-ink">{{ initial }}</span>
        <span v-show="!collapsed" class="truncate text-base font-semibold text-side-active">{{ brand }}</span>
      </div>
      <nav class="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="主要导航">
        <template v-for="(g, gi) in nav" :key="gi">
          <p v-if="g.title && !collapsed" class="px-3 pt-4 pb-1.5 text-xs text-side-faint">{{ g.title }}</p>
          <div v-else-if="gi && collapsed" class="mx-3 my-2 h-px bg-side-line" />
          <Tip v-for="item in g.items" :key="item.to" :text="collapsed ? item.label : ''" side="right">
            <RouterLink :to="item.to" class="relative flex h-9.5 items-center gap-3 rounded-md px-3 whitespace-nowrap text-side-fg transition-colors duration-150 hover:bg-side-hover" :class="active(item) && 'bg-side-hover font-semibold !text-side-active'" :aria-current="active(item) ? 'page' : undefined" :aria-label="collapsed ? item.label : undefined">
              <component :is="item.icon" v-if="item.icon" class="size-[18px] shrink-0" :class="active(item) && 'text-primary'" />
              <span v-show="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
              <span v-if="item.badge && !collapsed" class="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-ink tabular-nums">{{ item.badge }}</span>
            </RouterLink>
          </Tip>
        </template>
      </nav>
      <slot name="sidebar-footer" :collapsed="collapsed" />
    </aside>

    <div class="flex min-h-0 min-w-0 flex-col">
      <header class="z-30 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-canvas/85 px-3 backdrop-blur md:px-5">
        <Button variant="ghost" size="icon" class="md:hidden" aria-label="打开导航" @click="mobileOpen = true"><Menu class="size-[18px]" /></Button>
        <Tip :text="collapsed ? '展开侧栏' : '收起侧栏'">
          <Button variant="ghost" size="icon" class="hidden md:inline-flex" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="collapsed = !collapsed">
            <PanelLeftOpen v-if="collapsed" class="size-[18px]" /><PanelLeftClose v-else class="size-[18px]" />
          </Button>
        </Tip>
        <nav class="ml-1 flex min-w-0 items-center gap-2 text-fg-muted" aria-label="当前位置">
          <span v-if="section" class="hidden sm:inline">{{ section }}</span><span v-if="section" class="hidden text-fg-faint sm:inline">/</span>
          <b class="truncate font-semibold text-fg">{{ title }}</b>
        </nav>
        <span class="flex-1" />
        <slot name="topbar" />
      </header>
      <main id="main" class="min-h-0 flex-1 overflow-auto" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>
