<script setup lang="ts">
import { Palette as PaletteIcon, Moon, Sun } from "lucide-vue-next";
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from "reka-ui";
import Button from "../base/Button.vue";
import Tip from "../base/Tip.vue";
import { palettes } from "../theme/presets";
import { useTheme } from "../theme/theme";
/** 主题面板：选配色、明暗、圆角、疏密、侧栏风格，或自己拖一个品牌色。 */
const { settings, choosePalette, update, reset } = useTheme();
const radii = [["sharp", "方正"], ["soft", "适中"], ["round", "圆润"]] as const;
const densities = [["compact", "紧凑"], ["comfortable", "宽松"]] as const;
const sidebars = [["dark", "深色"], ["light", "浅色"], ["brand", "品牌色"]] as const;
function swatch(id: string) { const p = palettes.find((x) => x.id === id)!; return `oklch(${p.brandLightness} ${Math.max(p.brandChroma, 0.04)} ${p.brandHue})`; }
</script>
<template>
  <PopoverRoot>
    <Tip text="主题与外观">
      <PopoverTrigger as-child><Button variant="ghost" size="icon" aria-label="主题与外观"><PaletteIcon class="size-[18px]" /></Button></PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent align="end" :side-offset="8" class="z-[100] max-h-[80vh] w-[320px] overflow-auto rounded-lg border border-line bg-surface p-4 popup-surface data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <div class="flex flex-col gap-4">
          <section>
            <h3 class="mb-2 text-[13px] font-semibold text-fg-muted">配色</h3>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="p in palettes" :key="p.id" type="button" class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors" :class="settings.palette === p.id ? 'border-primary bg-primary-soft' : 'border-line hover:bg-subtle'" :aria-pressed="settings.palette === p.id" @click="choosePalette(p.id)">
                <span class="size-4 shrink-0 rounded-full border border-line-strong" :style="{ background: swatch(p.id) }" />{{ p.name }}
              </button>
            </div>
          </section>
          <section>
            <h3 class="mb-2 text-[13px] font-semibold text-fg-muted">明暗</h3>
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
              <button type="button" class="flex h-8 items-center justify-center gap-1.5 rounded-sm" :class="settings.mode === 'light' && 'bg-surface font-medium shadow-card'" @click="update({ mode: 'light' })"><Sun class="size-4" />浅色</button>
              <button type="button" class="flex h-8 items-center justify-center gap-1.5 rounded-sm" :class="settings.mode === 'dark' && 'bg-surface font-medium shadow-card'" @click="update({ mode: 'dark' })"><Moon class="size-4" />深色</button>
            </div>
          </section>
          <section v-for="[title, options, key] in ([['圆角', radii, 'radius'], ['疏密', densities, 'density'], ['侧栏', sidebars, 'sidebar']] as const)" :key="key">
            <h3 class="mb-2 text-[13px] font-semibold text-fg-muted">{{ title }}</h3>
            <div class="flex gap-1 rounded-lg bg-subtle p-1">
              <button v-for="[v, label] in options" :key="v" type="button" class="h-8 flex-1 rounded-sm" :class="settings[key] === v && 'bg-surface font-medium shadow-card'" :aria-pressed="settings[key] === v" @click="update({ [key]: v })">{{ label }}</button>
            </div>
          </section>
          <section>
            <h3 class="mb-2 flex items-center text-[13px] font-semibold text-fg-muted">自定义品牌色<button v-if="settings.brandHue !== null" type="button" class="ml-auto font-normal text-primary-text" @click="update({ brandHue: null })">还原</button></h3>
            <input type="range" min="0" max="360" :value="settings.brandHue ?? 0" class="h-2 w-full cursor-pointer appearance-none rounded-full" style="background: linear-gradient(90deg, oklch(.65 .17 0), oklch(.65 .17 60), oklch(.65 .17 120), oklch(.65 .17 180), oklch(.65 .17 240), oklch(.65 .17 300), oklch(.65 .17 360))" aria-label="品牌色色相" @input="update({ brandHue: Number(($event.target as HTMLInputElement).value) })" />
          </section>
          <Button variant="secondary" size="sm" @click="reset">恢复产品默认</Button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
