<script setup lang="ts">
import { Check, Moon, Sun } from "lucide-vue-next";
import { useSession } from "@/shared/public";
import { PageFrame, Card, Stack, DescriptionList, UiButton, palettes, useTheme } from "@/shared/ui/public";
import { appConfig } from "./app.config";

/** 偏好设置：外观（配色、明暗、圆角、疏密、侧栏）与账号信息。设置保存在这台浏览器里。 */
const session = useSession();
const identity = session.state;
const { settings, choosePalette, update, reset } = useTheme();
const groups = [
  { key: "mode", title: "明暗", options: [["light", "浅色"], ["dark", "深色"]] },
  { key: "radius", title: "圆角", options: [["sharp", "方正"], ["soft", "适中"], ["round", "圆润"]] },
  { key: "density", title: "疏密", options: [["compact", "紧凑"], ["comfortable", "宽松"]] },
  { key: "sidebar", title: "侧栏", options: [["light", "浅色"], ["dark", "深色"], ["brand", "品牌色"]] },
] as const;
function swatch(p: (typeof palettes)[number]) { return `oklch(${p.brandLightness} ${Math.max(p.brandChroma, 0.04)} ${p.brandHue})`; }
</script>
<template>
  <PageFrame title="偏好设置" narrow>
    <Card title="外观">
      <template #actions><UiButton variant="ghost" size="sm" @click="reset">恢复默认</UiButton></template>
      <div class="flex flex-col divide-y divide-line">
        <section class="grid gap-3 pb-5 sm:grid-cols-[160px_1fr]">
          <div><h3 class="font-medium">配色</h3><p class="text-[13px] text-fg-faint">整个界面的主色和灰调</p></div>
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button v-for="p in palettes" :key="p.id" type="button" class="group relative flex flex-col gap-2 overflow-hidden rounded-lg border p-2 text-left transition-colors" :class="settings.palette === p.id ? 'border-primary ring-2 ring-(--ring)' : 'border-line hover:border-line-strong'" :aria-pressed="settings.palette === p.id" @click="choosePalette(p.id)">
              <span class="flex h-12 overflow-hidden rounded-md border border-line" aria-hidden="true">
                <span class="w-1/4" :style="{ background: p.sidebar === 'dark' || p.mode === 'dark' ? `oklch(0.22 ${p.neutralChroma} ${p.neutralHue})` : `oklch(0.98 ${p.neutralChroma * 0.5} ${p.neutralHue})` }" />
                <span class="flex flex-1 flex-col gap-1 p-1.5" :style="{ background: p.mode === 'dark' ? `oklch(0.2 ${p.neutralChroma} ${p.neutralHue})` : `oklch(0.97 ${p.neutralChroma * 0.6} ${p.neutralHue})` }"><span class="h-1.5 w-2/3 rounded-full" :style="{ background: swatch(p) }" /><span class="h-1.5 w-1/2 rounded-full bg-current opacity-15" /></span>
              </span>
              <span class="flex items-center gap-1.5 px-0.5 font-medium">{{ p.name }}<Check v-if="settings.palette === p.id" class="ml-auto size-4 text-primary" /></span>
            </button>
          </div>
        </section>
        <section v-for="g in groups" :key="g.key" class="grid items-center gap-3 py-4 last:pb-0 sm:grid-cols-[160px_1fr]">
          <h3 class="font-medium">{{ g.title }}</h3>
          <div class="inline-flex w-fit gap-1 rounded-md bg-muted p-0.5">
            <button v-for="[v, label] in g.options" :key="v" type="button" class="flex h-8 items-center gap-1.5 rounded-sm px-4 transition-colors" :class="settings[g.key] === v ? 'bg-surface font-medium shadow-card' : 'text-fg-muted hover:text-fg'" :aria-pressed="settings[g.key] === v" @click="update({ [g.key]: v })">
              <template v-if="g.key === 'mode'"><Sun v-if="v === 'light'" class="size-4" /><Moon v-else class="size-4" /></template>{{ label }}
            </button>
          </div>
        </section>
      </div>
    </Card>
    <Card title="账号">
      <DescriptionList :items="[
        { label: '账号', value: identity.signedIn ? identity.username : session.demo ? '演示用户' : '未登录' },
        { label: '组织', value: identity.org },
        { label: '数据来源', value: session.demo ? '演示数据（没有连接后台）' : '已连接后台' },
      ]" />
    </Card>
    <Card title="关于">
      <Stack gap="sm">
        <DescriptionList :items="[{ label: '产品', value: appConfig.name }, { label: '版本', value: appConfig.version }, { label: '公司', value: appConfig.company }]" />
        <p class="text-[13px] text-fg-faint">外观设置只保存在这台浏览器里，换电脑或清除浏览器数据后恢复默认。</p>
      </Stack>
    </Card>
  </PageFrame>
</template>
