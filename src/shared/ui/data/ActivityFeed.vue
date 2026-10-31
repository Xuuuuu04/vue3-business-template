<script setup lang="ts">
import { computed } from "vue";
import Avatar from "../base/Avatar.vue";
import { formatRelative } from "../lib/format";

const props = defineProps<{
  items: {
    id: string;
    actor: string;
    action: string;
    target?: string;
    time: string;
    note?: string;
  }[];
}>();
const groups = computed(() => {
  const out: { day: string; items: typeof props.items }[] = [];
  for (const it of [...props.items].sort((a, b) =>
    b.time.localeCompare(a.time),
  )) {
    const d = new Date(it.time);
    const now = new Date();
    const diff = Math.round(
      (new Date(now.toDateString()).getTime() -
        new Date(d.toDateString()).getTime()) /
        86_400_000,
    );
    const day =
      diff === 0
        ? "今天"
        : diff === 1
          ? "昨天"
          : `${d.getMonth() + 1}月${d.getDate()}日`;
    (out.at(-1)?.day === day
      ? out.at(-1)!
      : (out.push({ day, items: [] }), out.at(-1)!)
    ).items.push(it);
  }
  return out;
});
</script>
<template>
  <div class="flex flex-col gap-4">
    <section v-for="g in groups" :key="g.day">
      <h4 class="mb-2 text-xs font-semibold text-fg-faint">{{ g.day }}</h4>
      <ol class="flex flex-col gap-3">
        <li v-for="it in g.items" :key="it.id" class="flex gap-3">
          <Avatar :name="it.actor" size="sm" />
          <div class="min-w-0 flex-1">
            <p>
              <b class="font-medium">{{ it.actor }}</b>
              <span class="text-fg-muted">{{ it.action }}</span>
              <b v-if="it.target" class="font-medium">{{ it.target }}</b>
            </p>
            <p
              v-if="it.note"
              class="mt-0.5 rounded-md bg-subtle px-2.5 py-1.5 text-help text-fg-muted"
            >
              {{ it.note }}
            </p>
          </div>
          <time
            class="shrink-0 text-xs text-fg-faint tabular-nums"
            :datetime="it.time"
            >{{ formatRelative(it.time) }}</time
          >
        </li>
      </ol>
    </section>
  </div>
</template>
