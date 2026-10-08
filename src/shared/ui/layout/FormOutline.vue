<script setup lang="ts">
/**
 * 表单目录：读取同一表单里的 FormSection，显示区块列表、必填完成情况与当前位置。
 * 宽屏时放在表单右侧，点击跳到对应区块；内容由表单本身决定，不需要页面另外登记。
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Check } from "lucide-vue-next";
const props = defineProps<{ root?: HTMLElement }>();
interface Entry { id: string; title: string; filled: number; required: number; invalid: boolean }
const entries = ref<Entry[]>([]);
const active = ref("");
let observer: IntersectionObserver | undefined;
let mutations: MutationObserver | undefined;

/** 必填字段是否已有值：文字输入有内容、选项已勾选、多选有已选标签，或下拉框不再显示占位。 */
function filled(field: Element) {
  if (field.querySelector("[data-chip], :checked, [aria-checked='true'], [data-state='checked']")) return true;
  const inputs = [...field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea")];
  if (inputs.some((el) => el.value.trim())) return true;
  const trigger = field.querySelector("button[role='combobox']");
  return Boolean(trigger && !trigger.querySelector("[data-placeholder]") && !trigger.hasAttribute("data-placeholder") && trigger.textContent?.trim());
}
function scan() {
  const sections = [...(props.root?.querySelectorAll<HTMLElement>("[data-form-section]") ?? [])];
  entries.value = sections.map((section) => {
    const required = [...section.querySelectorAll("[data-field-required]")];
    return {
      id: section.id,
      title: section.dataset.formSection ?? "",
      required: required.length,
      filled: required.filter(filled).length,
      invalid: Boolean(section.querySelector("[aria-invalid='true'], [data-invalid]")),
    };
  });
  return sections;
}
function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  active.value = id;
}
onMounted(() => {
  const sections = scan();
  active.value = sections[0]?.id ?? "";
  observer = new IntersectionObserver(
    (items) => {
      const top = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) active.value = top.target.id;
    },
    { rootMargin: "-10% 0px -60% 0px" },
  );
  sections.forEach((s) => observer!.observe(s));
  mutations = new MutationObserver(() => requestAnimationFrame(scan));
  if (props.root) mutations.observe(props.root, { subtree: true, attributes: true, attributeFilter: ["aria-invalid", "data-invalid", "value", "aria-checked"], childList: true });
  props.root?.addEventListener("input", scan);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  mutations?.disconnect();
  props.root?.removeEventListener("input", scan);
});
const total = () => entries.value.reduce((n, e) => n + e.required, 0);
const done = () => entries.value.reduce((n, e) => n + e.filled, 0);
</script>
<template>
  <nav v-if="entries.length > 1" class="form-outline" aria-label="表单目录">
    <div class="form-outline-progress" role="progressbar" :aria-valuenow="done()" :aria-valuemax="total()" aria-label="必填完成情况">
      <span class="text-label font-medium">必填 <b class="tabular-nums">{{ done() }}</b><span class="text-fg-faint tabular-nums"> / {{ total() }}</span></span>
      <span class="form-outline-track"><span :style="{ transform: `scaleX(${total() ? done() / total() : 1})` }" /></span>
    </div>
    <ol>
      <li v-for="(e, i) in entries" :key="e.id">
        <button type="button" :class="{ 'is-active': active === e.id, 'is-invalid': e.invalid }" :aria-current="active === e.id ? 'step' : undefined" @click="go(e.id)">
          <span class="form-outline-dot" :class="{ 'is-done': e.required && e.filled === e.required && !e.invalid }">
            <Check v-if="e.required && e.filled === e.required && !e.invalid" class="size-3" /><template v-else>{{ i + 1 }}</template>
          </span>
          <span class="min-w-0 flex-1 truncate">{{ e.title }}</span>
          <span v-if="e.required" class="text-help text-fg-faint tabular-nums">{{ e.filled }}/{{ e.required }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>
