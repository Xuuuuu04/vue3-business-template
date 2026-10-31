<script setup lang="ts">
import { ref } from "vue";
import { Eye, EyeOff, TriangleAlert } from "lucide-vue-next";
import UiInput from "./Input.vue";

defineOptions({ inheritAttrs: false });
const model = defineModel<string>({ default: "" });
defineProps<{ size?: "md" | "lg"; invalid?: boolean; autocomplete?: string }>();
const visible = ref(false);
const caps = ref(false);
function check(e: KeyboardEvent) {
  caps.value = e.getModifierState?.("CapsLock") ?? false;
}
</script>
<template>
  <div class="flex flex-col gap-1.5" @keydown="check" @keyup="check">
    <UiInput
      v-model="model"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :size="size"
      :invalid="invalid"
      :autocomplete="autocomplete ?? 'current-password'"
      @blur="caps = false"
    >
      <template #suffix>
        <button
          type="button"
          class="-mx-2.5 grid h-full w-10 place-items-center text-fg-faint transition-colors hover:text-fg"
          :aria-label="visible ? '隐藏密码' : '显示密码'"
          :aria-pressed="visible"
          @click="visible = !visible"
        >
          <EyeOff v-if="visible" class="size-4" /><Eye v-else class="size-4" />
        </button>
      </template>
    </UiInput>
    <p
      v-if="caps"
      class="flex items-center gap-1.5 text-help text-warn"
      role="status"
    >
      <TriangleAlert class="size-3.5" />大写锁定已开启
    </p>
  </div>
</template>
