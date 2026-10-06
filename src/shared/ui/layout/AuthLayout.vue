<script setup lang="ts">
/** 登录、找回密码等页面的外壳。split：左侧品牌面板，右侧表单；centered：只有居中的表单。 */
defineProps<{ brand: string; mark?: string; tagline?: string; variant?: "split" | "centered" }>();
</script>
<template>
  <div class="min-h-screen bg-canvas" :class="variant === 'centered' ? 'grid place-items-center p-6' : 'grid lg:grid-cols-2'">
    <aside v-if="variant !== 'centered'" class="relative hidden flex-col overflow-hidden bg-side p-10 text-side-active lg:flex" aria-hidden="false">
      <div class="relative z-10 flex items-center gap-2.5 font-semibold"><span class="grid size-7 place-items-center rounded-md bg-primary font-bold text-primary-ink">{{ mark ?? brand.slice(0, 1) }}</span>{{ brand }}</div>
      <div class="sheet pointer-events-none absolute top-20 -right-16 grid w-[520px] -rotate-6 gap-2" aria-hidden="true">
        <i v-for="n in 6" :key="n" class="row" :style="{ animationDelay: `${-n}s` }"><b /><b /><b /><b /></i>
      </div>
      <div class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-side from-40% to-transparent" />
      <p v-if="tagline" class="relative z-10 mt-auto max-w-md text-[32px] leading-tight font-semibold tracking-tight"><slot name="tagline">{{ tagline }}</slot></p>
    </aside>
    <main class="grid place-items-center p-6 sm:p-12">
      <div class="w-full max-w-sm animate-[rise_.5s_var(--ease)]" :class="variant === 'centered' && 'rounded-lg border border-line bg-surface p-8 shadow-card'">
        <div class="mb-8 flex items-center gap-2.5 font-semibold" :class="variant !== 'centered' && 'lg:hidden'"><span class="grid size-7 place-items-center rounded-md bg-primary font-bold text-primary-ink">{{ mark ?? brand.slice(0, 1) }}</span>{{ brand }}</div>
        <slot />
      </div>
    </main>
  </div>
</template>
<style scoped>
.row { display: grid; grid-template-columns: 1.6fr 0.6fr 0.6fr 0.5fr; gap: 10px; padding: 12px 14px; border-radius: 10px; background: var(--side-hover); border: 1px solid var(--side-line); animation: slide 8s ease-in-out infinite alternate; }
.row b { display: block; height: 8px; border-radius: 4px; align-self: center; background: var(--side-line); width: 70%; }
.row b:nth-child(2), .row b:nth-child(3) { background: var(--primary); width: 60%; margin-left: auto; }
.row b:nth-child(4) { background: var(--ok); width: 50%; opacity: 0.8; }
.row:nth-child(3) b:nth-child(4), .row:nth-child(5) b:nth-child(4) { background: var(--bad); }
@keyframes slide { to { transform: translateX(-28px); } }
@media (prefers-reduced-motion: reduce) { .row { animation: none; } }
</style>
