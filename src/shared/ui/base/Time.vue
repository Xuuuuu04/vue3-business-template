<script setup lang="ts">
import { computed } from "vue";
import Tip from "./Tip.vue";
import { formatDateTime, formatRelative } from "../lib/format";

const props = defineProps<{ value: string; absolute?: boolean }>();
const full = computed(() => formatDateTime(props.value));
</script>
<template>
  <Tip :text="absolute ? '' : full"
    ><time :datetime="value" class="text-label text-fg-muted tabular-nums">{{
      absolute ? full : formatRelative(value)
    }}</time></Tip
  >
</template>
