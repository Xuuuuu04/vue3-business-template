<script setup lang="ts">
import { Bell, BellOff } from "lucide-vue-next";
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from "reka-ui";
import { RouterLink } from "vue-router";
import Button from "../base/Button.vue";
import Tip from "../base/Tip.vue";
import EmptyState from "../base/EmptyState.vue";
import { useNotices } from "../lib/notifications";

const { items, unread, markAllRead, clear } = useNotices();
</script>
<template>
  <PopoverRoot @update:open="(o) => !o && markAllRead()">
    <Tip text="通知">
      <PopoverTrigger as-child>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="unread ? `通知，${unread} 条未读` : '通知'"
          class="relative"
        >
          <Bell class="size-[18px]" />
          <span
            v-if="unread"
            class="absolute top-1.5 right-1.5 size-2 rounded-full bg-bad ring-2 ring-canvas"
          />
        </Button>
      </PopoverTrigger>
    </Tip>
    <PopoverPortal>
      <PopoverContent
        :collision-padding="12"
        align="end"
        :side-offset="8"
        class="z-[100] w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-line bg-surface popup-surface data-[state=open]:animate-[pop_var(--motion-fast)_var(--ease-enter)]"
      >
        <div class="flex items-center border-b border-line px-4 py-3">
          <b class="font-semibold">通知</b
          ><button
            v-if="items.length"
            type="button"
            class="ml-auto text-help text-fg-muted hover:text-fg"
            @click="clear"
          >
            清空
          </button>
        </div>
        <EmptyState
          v-if="!items.length"
          title="暂时没有通知"
          hint="有新的提醒会显示在这里"
          ><template #icon><BellOff class="size-5" /></template
        ></EmptyState>
        <ul v-else class="max-h-80 overflow-auto">
          <li
            v-for="n in items"
            :key="n.id"
            class="border-b border-line last:border-b-0"
          >
            <component
              :is="n.to ? RouterLink : 'div'"
              :to="n.to"
              class="block px-4 py-3"
              :class="n.to && 'hover:bg-subtle focus-visible:bg-subtle'"
            >
              <div class="flex items-center gap-2">
                <b class="font-medium">{{ n.title }}</b
                ><span class="ml-auto text-xs text-fg-faint tabular-nums">{{
                  n.time
                }}</span>
              </div>
              <p v-if="n.text" class="mt-0.5 text-help text-fg-muted">
                {{ n.text }}
              </p>
            </component>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
