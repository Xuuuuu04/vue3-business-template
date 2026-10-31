<script setup lang="ts">
import { computed, provide, ref, useId } from "vue";
import { fieldContext } from "../lib/field";
const props = defineProps<{
  label: string;
  for?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}>();
const generatedId = useId();
const registeredId = ref<string>();
const owners = new Map<symbol, string>();
const controlId = computed(
  () => registeredId.value ?? props.for ?? `${generatedId}-control`,
);
const labelId = `${generatedId}-label`;
const messageId = `${generatedId}-message`;
provide(
  fieldContext,
  computed(() => ({
    id: controlId.value,
    labelId,
    messageId: props.error || props.hint ? messageId : undefined,
    invalid: Boolean(props.error),
    required: Boolean(props.required),
    register(owner: symbol, id?: string) {
      if (id) owners.set(owner, id);
      else owners.delete(owner);
      registeredId.value = owners.values().next().value;
    },
  })),
);
</script>
<template>
  <div
    class="flex min-w-0 flex-col gap-2"
    :data-field-required="required || undefined"
  >
    <label
      :id="labelId"
      :for="controlId"
      class="text-label leading-5 font-medium"
      >{{ label
      }}<span v-if="required" class="ml-0.5 text-bad" aria-hidden="true"
        >*</span
      ></label
    >
    <slot />
    <p v-if="error" :id="messageId" class="text-help text-bad" role="alert">
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="messageId"
      class="text-help leading-5 text-fg-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
