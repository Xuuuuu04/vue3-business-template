<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, TriangleAlert } from "lucide-vue-next";
import { BrandMark, AppFooter, UiButton } from "@/shared/ui/public";
import { appConfig } from "./app.config";
import { legalDocuments } from "./legal";

const route = useRoute();
const router = useRouter();
const doc = computed(() => legalDocuments[route.params.kind === "privacy" ? "privacy" : "terms"]);
const other = computed(() => (route.params.kind === "privacy" ? { label: "用户协议", to: "/legal/terms" } : { label: "隐私政策", to: "/legal/privacy" }));
function back() { window.history.length > 1 ? router.back() : void router.push("/"); }
</script>
<template>
  <div class="min-h-screen bg-canvas">
    <header class="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <UiButton variant="ghost" size="icon" aria-label="返回" @click="back"><ArrowLeft class="size-[18px]" /></UiButton>
      <BrandMark :name="appConfig.name" :mark="appConfig.mark" :logo="appConfig.logo" size="sm" wordmark />
    </header>
    <main class="mx-auto max-w-3xl px-6 py-10">
      <div v-if="!appConfig.legal.reviewed" class="mb-8 flex items-start gap-2.5 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3" role="note"><TriangleAlert class="mt-0.5 size-4 shrink-0 text-warn" /><p>这是模板文本，不构成法律意见。上线前请由法务按实际业务改写，并在 <code class="font-mono text-[13px]">src/app/app.config.ts</code> 把 <code class="font-mono text-[13px]">legal.reviewed</code> 改为 true，这条提醒才会消失。</p></div>
      <h1 class="text-[32px] leading-tight font-semibold tracking-tight">{{ doc.title }}</h1>
      <p class="mt-2 text-fg-faint">更新日期：{{ doc.updated }}　·　{{ appConfig.company }}</p>
      <section v-for="s in doc.sections" :key="s.heading" class="mt-9">
        <h2 class="mb-2 text-base font-semibold">{{ s.heading }}</h2>
        <p v-for="(p, i) in s.paragraphs" :key="i" class="mt-2 leading-7 text-fg-muted">{{ p }}</p>
      </section>
      <div class="mt-12 border-t border-line pt-6"><RouterLink :to="other.to" class="text-primary-text hover:underline">查看{{ other.label }}</RouterLink></div>
    </main>
    <div class="pb-8"><AppFooter :company="appConfig.company" :icp="appConfig.icp" :version="appConfig.version" /></div>
  </div>
</template>
