<script setup lang="ts">
import { ref, onBeforeUnmount } from "vue";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ text: string; side?: "bottom" | "right" }>();
const host = ref<HTMLElement>();
const open = ref(false);
const pos = ref({ left: 0, top: 0 });
let timer: ReturnType<typeof setTimeout> | undefined;
function show() {
  if (!props.text) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const r = host.value?.getBoundingClientRect();
    if (!r) return;
    pos.value =
      props.side === "right"
        ? { left: r.right + 8, top: r.top + r.height / 2 }
        : { left: r.left + r.width / 2, top: r.bottom + 6 };
    open.value = true;
  }, 250);
}
function hide() {
  clearTimeout(timer);
  open.value = false;
}
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <span
    ref="host"
    v-bind="$attrs"
    class="inline-flex min-w-0"
    @pointerenter="show"
    @pointerleave="hide"
    @focusin="show"
    @focusout="hide"
    @keydown.esc="hide"
    @pointerdown="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      enter-active-class="transition-opacity duration-(--motion-fast)"
    >
      <div
        v-if="open"
        role="tooltip"
        class="pointer-events-none fixed z-[300] max-w-xs rounded-md bg-fg px-2.5 py-1.5 text-xs text-surface popup-surface"
        :class="side === 'right' ? '-translate-y-1/2' : '-translate-x-1/2'"
        :style="{ left: pos.left + 'px', top: pos.top + 'px' }"
      >
        {{ text }}
      </div>
    </Transition>
  </Teleport>
</template>
