<script setup lang="ts">
import BrandMark from "./BrandMark.vue";
/** 登录外壳：实色品牌区与单一表单；centered 用于只需表单的产品。 */
defineProps<{
  brand: string;
  mark?: string;
  logo?: string;
  tagline?: string;
  highlights?: { title: string; text: string }[];
  variant?: "split" | "centered";
}>();
</script>
<template>
  <div class="min-h-dvh bg-surface" :class="variant === 'centered' ? 'flex flex-col' : 'grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'">
    <aside v-if="variant !== 'centered'" class="hidden min-h-dvh flex-col bg-auth-bg p-10 text-auth-fg lg:flex xl:p-12">
      <BrandMark :name="brand" :mark="mark" :logo="logo" size="md" wordmark inverse />
      <div class="my-auto py-16">
        <p v-if="tagline" class="max-w-sm text-balance text-[40px] leading-[1.3] font-medium tracking-tight"><slot name="tagline">{{ tagline }}</slot></p>
      </div>
      <ul v-if="highlights?.length" class="flex flex-col divide-y divide-auth-line">
        <li v-for="h in highlights" :key="h.title" class="grid grid-cols-[96px_1fr] gap-4 py-5">
          <span class="text-[14px] font-medium">{{ h.title }}</span>
          <span class="text-[14px] leading-6 text-auth-muted">{{ h.text }}</span>
        </li>
      </ul>
    </aside>
    <div class="flex min-h-dvh flex-col" :class="variant === 'centered' && 'flex-1'">
      <header class="flex h-20 shrink-0 items-center justify-between px-6 sm:px-10">
        <BrandMark :name="brand" :mark="mark" :logo="logo" size="sm" wordmark :class="variant !== 'centered' && 'lg:invisible'" />
        <div class="flex items-center gap-1"><slot name="topright" /></div>
      </header>
      <main class="grid flex-1 place-items-center px-6 py-10 sm:px-10">
        <div class="w-full max-w-[380px]"><slot /></div>
      </main>
      <div class="px-6 pb-6 sm:px-10"><slot name="footer" /></div>
    </div>
  </div>
</template>
