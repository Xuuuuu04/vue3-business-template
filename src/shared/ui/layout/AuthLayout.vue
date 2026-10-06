<script setup lang="ts">
import { BarChart3, History, Users } from "lucide-vue-next";
import BrandMark from "./BrandMark.vue";
/**
 * 登录、找回密码等页面的外壳。
 * split：左侧品牌面板（标识、标语、三条亮点），右侧表单；centered：只有居中的表单。
 * 右上角放主题切换等（topright 插槽），底部放页脚（footer 插槽）。
 */
defineProps<{
  brand: string;
  mark?: string;
  logo?: string;
  tagline?: string;
  highlights?: { title: string; text: string }[];
  variant?: "split" | "centered";
}>();
const icons = [BarChart3, History, Users];
</script>
<template>
  <div class="min-h-screen bg-canvas" :class="variant === 'centered' ? 'flex flex-col' : 'grid lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]'">
    <aside v-if="variant !== 'centered'" class="art relative hidden flex-col overflow-hidden p-12 text-white lg:flex">
      <BrandMark :name="brand" :mark="mark" :logo="logo" size="lg" wordmark class="relative z-10 text-white" />
      <div class="sheet pointer-events-none absolute top-28 -right-20 grid w-[520px] -rotate-6 gap-2" aria-hidden="true">
        <i v-for="n in 6" :key="n" class="row" :style="{ animationDelay: `${-n}s` }"><b /><b /><b /><b /></i>
      </div>
      <div class="absolute inset-x-0 bottom-0 h-2/3" style="background: linear-gradient(to top, var(--art-from) 45%, transparent)" />
      <div class="relative z-10 mt-auto">
        <p v-if="tagline" class="max-w-lg text-[40px] leading-[1.2] font-semibold tracking-tight"><slot name="tagline">{{ tagline }}</slot></p>
        <ul v-if="highlights?.length" class="mt-10 flex max-w-lg flex-col gap-5">
          <li v-for="(h, i) in highlights" :key="h.title" class="flex items-start gap-3.5">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15"><component :is="icons[i % icons.length]" class="size-[18px]" /></span>
            <span><b class="block font-semibold">{{ h.title }}</b><span class="text-[13px] text-white/65">{{ h.text }}</span></span>
          </li>
        </ul>
      </div>
    </aside>
    <div class="flex min-h-screen flex-col" :class="variant === 'centered' && 'flex-1'">
      <header class="flex h-16 items-center justify-between px-6 sm:px-10">
        <BrandMark :name="brand" :mark="mark" :logo="logo" size="sm" wordmark :class="variant !== 'centered' && 'lg:invisible'" />
        <div class="flex items-center gap-1"><slot name="topright" /></div>
      </header>
      <main class="grid flex-1 place-items-center px-6 py-8 sm:px-10">
        <div class="stagger w-full max-w-[380px]" :class="variant === 'centered' && 'rounded-xl border border-line bg-surface p-8 shadow-card'"><slot /></div>
      </main>
      <div class="px-6 pb-6 sm:px-10"><slot name="footer" /></div>
    </div>
  </div>
</template>
<style scoped>
/* 品牌面板：用品牌色调出的深色，不随侧栏风格变化，任何配色下都有分量。 */
.art { --art-from: oklch(0.2 calc(var(--b-c) * 0.55) var(--b-h)); background: radial-gradient(120% 80% at 0% 0%, oklch(0.4 calc(var(--b-c) * 0.85) var(--b-h)) 0%, transparent 60%), linear-gradient(155deg, oklch(0.32 calc(var(--b-c) * 0.8) var(--b-h)), var(--art-from)); }
.row { display: grid; grid-template-columns: 1.6fr 0.6fr 0.6fr 0.5fr; gap: 10px; padding: 12px 14px; border-radius: 10px; background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.1); animation: slide 8s ease-in-out infinite alternate; }
.row b { display: block; height: 8px; border-radius: 4px; align-self: center; background: oklch(1 0 0 / 0.22); width: 70%; }
.row b:nth-child(2), .row b:nth-child(3) { background: oklch(1 0 0 / 0.75); width: 60%; margin-left: auto; }
.row b:nth-child(4) { background: oklch(0.78 0.14 152); width: 50%; }
.row:nth-child(3) b:nth-child(4), .row:nth-child(5) b:nth-child(4) { background: oklch(0.74 0.15 25); }
@keyframes slide { to { transform: translateX(-28px); } }
/* 表单区域逐项淡入上移，进入页面时有节奏 */
.stagger > :deep(*) { animation: rise 0.55s var(--ease) both; }
.stagger > :deep(*:nth-child(2)) { animation-delay: 0.06s; }
.stagger > :deep(*:nth-child(3)) { animation-delay: 0.12s; }
.stagger > :deep(*:nth-child(4)) { animation-delay: 0.18s; }
@media (prefers-reduced-motion: reduce) { .row { animation: none; } }
</style>
