<script setup lang="ts">
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "reka-ui";
import { Moon, Sun, LifeBuoy, Info, LogOut, ChevronDown } from "lucide-vue-next";
import { useTheme } from "../theme/theme";
/** 用户菜单：头像、名称、所在组织；切换明暗、帮助、关于、退出登录。 */
defineProps<{ name: string; org?: string; signedIn: boolean }>();
const emit = defineEmits<{ help: []; about: []; logout: [] }>();
const { settings, update } = useTheme();
</script>
<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button type="button" class="ml-1 flex h-9 items-center gap-2 rounded-md pr-2 pl-1 transition-colors hover:bg-muted data-[state=open]:bg-muted" :aria-label="`用户菜单：${name}`">
        <span class="grid size-7 place-items-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-text ring-1 ring-primary-line">{{ name.slice(0, 1) }}</span>
        <span class="hidden max-w-28 truncate font-medium sm:inline">{{ name }}</span>
        <ChevronDown class="hidden size-3.5 text-fg-faint sm:block" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="end" :side-offset="8" class="z-[100] w-60 rounded-lg border border-line bg-surface p-1 shadow-pop data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <div class="px-2.5 py-2"><p class="font-semibold">{{ name }}</p><p v-if="org" class="text-[13px] text-fg-faint">{{ org }}</p></div>
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <DropdownMenuItem class="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 outline-none select-none data-[highlighted]:bg-muted" @select.prevent="update({ mode: settings.mode === 'dark' ? 'light' : 'dark' })">
          <Sun v-if="settings.mode === 'dark'" class="size-4 text-fg-muted" /><Moon v-else class="size-4 text-fg-muted" />{{ settings.mode === "dark" ? "切换到浅色" : "切换到深色" }}
        </DropdownMenuItem>
        <DropdownMenuItem class="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 outline-none select-none data-[highlighted]:bg-muted" @select="emit('help')"><LifeBuoy class="size-4 text-fg-muted" />帮助与反馈</DropdownMenuItem>
        <DropdownMenuItem class="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 outline-none select-none data-[highlighted]:bg-muted" @select="emit('about')"><Info class="size-4 text-fg-muted" />关于</DropdownMenuItem>
        <template v-if="signedIn">
          <DropdownMenuSeparator class="my-1 h-px bg-line" />
          <DropdownMenuItem class="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-bad outline-none select-none data-[highlighted]:bg-bad-soft" @select="emit('logout')"><LogOut class="size-4" />退出登录</DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
