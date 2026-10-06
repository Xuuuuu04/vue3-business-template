<script setup lang="ts">
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from "reka-ui";
import type { MenuItem } from "../lib/types";
/** 下拉菜单：触发元素放默认插槽，选项用 items，选中时发出 select 事件。 */
defineProps<{ items: MenuItem[]; align?: "start" | "end" }>();
const emit = defineEmits<{ select: [key: string] }>();
</script>
<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child><slot /></DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent :align="align ?? 'end'" :side-offset="6" class="z-[100] min-w-40 rounded-lg border border-line bg-surface p-1 shadow-pop data-[state=open]:animate-[pop_.14s_var(--ease)]">
        <DropdownMenuItem
          v-for="item in items"
          :key="item.key"
          :disabled="item.disabled"
          class="flex h-8 cursor-pointer items-center rounded-md px-2.5 outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted"
          :class="item.danger ? 'text-bad' : 'text-fg'"
          @select="emit('select', item.key)"
        >{{ item.label }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
