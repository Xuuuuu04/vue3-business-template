<script setup lang="ts">
import { Grid, UiTag, useTheme, palettes } from "@/shared/ui/public";
import { tokens, types } from "./design-preview-content";
defineProps<{ example: string }>();
const { settings, choosePalette } = useTheme();
</script>
<template>
  <template v-if="example === 'palettes'">
    <Grid :cols="3">
      <button
        v-for="p in palettes"
        :key="p.id"
        type="button"
        class="flex flex-col gap-3 rounded-md border bg-surface p-4 text-left transition-colors"
        :class="
          settings.palette === p.id
            ? 'border-primary bg-primary-soft'
            : 'border-line hover:border-line-strong'
        "
        :aria-pressed="settings.palette === p.id"
        @click="choosePalette(p.id)"
      >
        <span class="flex items-center gap-2"
          ><span
            class="size-4 rounded-full border border-line-strong"
            :style="{
              background: `oklch(${p.brandLightness} ${Math.max(p.brandChroma, 0.04)} ${p.brandHue})`,
            }"
          /><b class="font-medium">{{ p.name }}</b
          ><UiTag v-if="settings.palette === p.id" class="ml-auto"
            >当前</UiTag
          ></span
        >
        <span class="text-label leading-6 text-fg-muted">{{
          p.character
        }}</span>
      </button>
    </Grid>
    <p class="text-help text-fg-muted">
      选择后立即应用。产品默认配色在
      <UiTag tone="code">src/app/app.config.ts</UiTag> 设置。
    </p>
  </template>
  <template v-if="example === 'tokens'">
    <Grid :cols="3" gap="lg">
      <div
        v-for="[name, use] in tokens"
        :key="name"
        class="flex items-center gap-3"
      >
        <span
          class="size-10 shrink-0 rounded-md border border-line"
          :style="{ background: `var(--${name})` }"
        /><span class="min-w-0"
          ><b class="block truncate font-mono text-label font-medium">{{
            name
          }}</b
          ><span class="text-help text-fg-muted">{{ use }}</span></span
        >
      </div>
    </Grid>
  </template>
  <template v-if="example === 'typography'">
    <ul class="divide-y divide-line">
      <li
        v-for="[name, spec, cls, sample] in types"
        :key="name"
        class="grid items-baseline gap-2 py-5 first:pt-0 lg:grid-cols-[104px_150px_1fr] lg:gap-4"
      >
        <b class="text-label font-medium">{{ name }}</b
        ><span class="font-mono text-[12px] text-fg-muted">{{ spec }}</span
        ><span :class="cls">{{ sample }}</span>
      </li>
    </ul>
  </template>
</template>
