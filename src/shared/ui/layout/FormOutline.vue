<script setup lang="ts">
import { ref, watch } from "vue";
import { Check } from "lucide-vue-next";
const props = defineProps<{ root?: HTMLElement }>();
interface Entry {
  id: string;
  title: string;
  filled: number;
  required: number;
  invalid: boolean;
}
const entries = ref<Entry[]>([]);
const active = ref("");
function filled(field: Element) {
  if (
    field.querySelector(
      "[data-chip], :checked, [aria-checked='true'], [data-state='checked']",
    )
  )
    return true;
  const inputs = [
    ...field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea",
    ),
  ];
  if (inputs.some((el) => el.value.trim())) return true;
  const trigger = field.querySelector("button[role='combobox']");
  return Boolean(
    trigger &&
    !trigger.querySelector("[data-placeholder]") &&
    !trigger.hasAttribute("data-placeholder") &&
    trigger.textContent?.trim(),
  );
}
function scan(root: HTMLElement) {
  const sections = [
    ...root.querySelectorAll<HTMLElement>("[data-form-section]"),
  ];
  entries.value = sections.map((section) => {
    const required = [...section.querySelectorAll("[data-field-required]")];
    return {
      id: section.id,
      title: section.dataset.formSection ?? "",
      required: required.length,
      filled: required.filter(filled).length,
      invalid: Boolean(
        section.querySelector("[aria-invalid='true'], [data-invalid]"),
      ),
    };
  });
  if (!entries.value.some((entry) => entry.id === active.value))
    active.value = sections[0]?.id ?? "";
  return sections;
}
function go(id: string) {
  const section = [
    ...(props.root?.querySelectorAll<HTMLElement>("[data-form-section]") ?? []),
  ].find((item) => item.id === id);
  section?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
  active.value = id;
}
watch(
  () => props.root,
  (root, _previous, onCleanup) => {
    entries.value = [];
    active.value = "";
    if (!root) return;
    const currentRoot = root;
    let connected = true;
    let frame: number | undefined;
    const observed = new Set<HTMLElement>();
    const intersecting = new Set<HTMLElement>();
    function selectVisibleSection() {
      const top = [...intersecting].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )[0];
      if (top) active.value = top.id;
    }
    const observer = new IntersectionObserver(
      (items) => {
        if (!connected) return;
        for (const item of items) {
          const section = item.target as HTMLElement;
          if (item.isIntersecting && observed.has(section))
            intersecting.add(section);
          else intersecting.delete(section);
        }
        selectVisibleSection();
      },
      { rootMargin: "-10% 0px -60% 0px" },
    );
    function refresh() {
      frame = undefined;
      const sections = new Set(scan(currentRoot));
      for (const section of observed)
        if (!sections.has(section)) {
          observer.unobserve(section);
          observed.delete(section);
          intersecting.delete(section);
        }
      for (const section of sections)
        if (!observed.has(section)) {
          observer.observe(section);
          observed.add(section);
        }
      selectVisibleSection();
    }
    function schedule() {
      if (frame === undefined) frame = requestAnimationFrame(refresh);
    }
    refresh();
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: [
        "aria-invalid",
        "data-invalid",
        "value",
        "aria-checked",
        "data-form-section",
        "data-field-required",
      ],
      childList: true,
    });
    root.addEventListener("input", schedule);
    root.addEventListener("change", schedule);
    onCleanup(() => {
      connected = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      root.removeEventListener("input", schedule);
      root.removeEventListener("change", schedule);
    });
  },
  { immediate: true, flush: "post" },
);
const total = () => entries.value.reduce((n, e) => n + e.required, 0);
const done = () => entries.value.reduce((n, e) => n + e.filled, 0);
</script>
<template>
  <nav v-if="entries.length > 1" class="form-outline" aria-label="表单目录">
    <div
      class="form-outline-progress"
      role="progressbar"
      :aria-valuenow="done()"
      :aria-valuemax="total()"
      aria-label="必填完成情况"
    >
      <span class="text-label font-medium"
        >必填 <b class="tabular-nums">{{ done() }}</b
        ><span class="text-fg-faint tabular-nums"> / {{ total() }}</span></span
      >
      <span class="form-outline-track"
        ><span
          :style="{ transform: `scaleX(${total() ? done() / total() : 1})` }"
      /></span>
    </div>
    <ol>
      <li v-for="(e, i) in entries" :key="e.id">
        <button
          type="button"
          :class="{ 'is-active': active === e.id, 'is-invalid': e.invalid }"
          :aria-current="active === e.id ? 'step' : undefined"
          @click="go(e.id)"
        >
          <span
            class="form-outline-dot"
            :class="{
              'is-done': e.required && e.filled === e.required && !e.invalid,
            }"
          >
            <Check
              v-if="e.required && e.filled === e.required && !e.invalid"
              class="size-3"
            /><template v-else>{{ i + 1 }}</template>
          </span>
          <span class="min-w-0 flex-1 truncate">{{ e.title }}</span>
          <span v-if="e.required" class="text-help text-fg-faint tabular-nums"
            >{{ e.filled }}/{{ e.required }}</span
          >
        </button>
      </li>
    </ol>
  </nav>
</template>
