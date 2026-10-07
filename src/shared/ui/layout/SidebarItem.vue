<script setup lang="ts">
/** 可递归的菜单节点：链接与展开按钮分开，目录不产生无效地址。 */
import { ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { ChevronDown, Folder } from "lucide-vue-next";
import type { NavItem } from "../lib/types";
import { containsNavItem } from "../lib/navigation";
import Tip from "../base/Tip.vue";
const props = withDefaults(
  defineProps<{
    item: NavItem;
    current?: NavItem;
    compact?: boolean;
    depth?: number;
    routeKey: string;
  }>(),
  { depth: 0 },
);
const emit = defineEmits<{ expand: [] }>();
const open = ref(containsNavItem(props.item, props.current));
watch(
  () => props.routeKey,
  () => {
    if (containsNavItem(props.item, props.current)) open.value = true;
  },
);
function toggle() {
  if (props.compact) {
    open.value = true;
    emit("expand");
  } else open.value = !open.value;
}
</script>
<template>
  <li class="min-w-0">
    <Tip :text="compact ? item.label : ''" side="right">
      <div
        class="sidebar-row"
        :class="{
          'is-current': item === current,
          'is-ancestor': item !== current && containsNavItem(item, current),
          'is-compact': compact,
        }"
      >
        <component
          :is="item.to ? RouterLink : 'button'"
          :to="item.to"
          :type="item.to ? undefined : 'button'"
          class="sidebar-target"
          :aria-current="item === current ? 'page' : undefined"
          :aria-label="compact ? item.label : undefined"
          :aria-expanded="
            !item.to && item.children?.length ? open && !compact : undefined
          "
          @click="!item.to && toggle()"
        >
          <component
            :is="item.icon ?? Folder"
            v-if="!depth || item.icon"
            class="size-[18px] shrink-0"
          />
          <span v-if="!compact" class="min-w-0 flex-1 truncate">{{
            item.label
          }}</span>
          <span
            v-if="item.badge !== undefined && !compact"
            class="sidebar-badge"
            >{{ item.badge }}</span
          >
          <ChevronDown
            v-if="!item.to && item.children?.length && !compact"
            class="size-3.5 shrink-0 transition-transform"
            :class="open && 'rotate-180'"
          />
        </component>
        <button
          v-if="item.to && item.children?.length && !compact"
          type="button"
          class="sidebar-disclosure"
          :aria-label="`${open ? '收起' : '展开'}${item.label}子菜单`"
          :aria-expanded="open"
          @click="toggle"
        >
          <ChevronDown
            class="size-3.5 transition-transform"
            :class="open && 'rotate-180'"
          />
        </button>
      </div>
    </Tip>
    <ul
      v-if="item.children?.length"
      v-show="open && !compact"
      class="sidebar-children"
    >
      <SidebarItem
        v-for="(child, i) in item.children"
        :key="`${child.to ?? child.label}-${i}`"
        :item="child"
        :current="current"
        :depth="depth + 1"
        :route-key="routeKey"
        @expand="emit('expand')"
      />
    </ul>
  </li>
</template>
