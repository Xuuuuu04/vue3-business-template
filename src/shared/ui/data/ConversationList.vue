<script setup lang="ts">
/** 会话列表：姓名、最后一条消息和未读数围绕同一条会话排列。选择后由页面标记已读。 */
import Avatar from "../base/Avatar.vue";
const selected = defineModel<string>({ required: true });
defineProps<{ items: { id: string; name: string; preview: string; time: string; unread: number; resolved: boolean }[]; label: string }>();
const emit = defineEmits<{ select: [id: string] }>();
function choose(id: string) { selected.value = id; emit("select", id); }
</script>
<template>
  <nav :aria-label="label" class="flex flex-col gap-1">
    <button v-for="item in items" :key="item.id" type="button" :aria-current="selected === item.id ? 'true' : undefined" class="flex min-h-20 items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted" :class="selected === item.id && 'bg-subtle'" @click="choose(item.id)">
      <Avatar :name="item.name" size="lg" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center justify-between gap-2"><span class="truncate font-medium">{{ item.name }}</span><time class="shrink-0 text-xs text-fg-faint tabular-nums">{{ item.time }}</time></span>
        <span class="mt-1 flex items-center gap-2"><span class="min-w-0 flex-1 truncate text-help text-fg-muted">{{ item.preview }}</span><span v-if="item.unread" class="grid min-w-5 shrink-0 place-items-center rounded-full bg-fg px-1 text-xs leading-5 text-surface" :aria-label="`${item.unread} 条未读`">{{ item.unread }}</span><span v-else-if="item.resolved" class="shrink-0 text-xs text-fg-faint">已处理</span></span>
      </span>
    </button>
  </nav>
</template>
