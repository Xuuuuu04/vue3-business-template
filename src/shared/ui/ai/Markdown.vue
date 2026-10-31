<script setup lang="ts">
import { computed } from "vue";
import { parseMarkdown, type Inline } from "../lib/markdown";
import CodeBlock from "./CodeBlock.vue";

const props = defineProps<{
  text: string;
  streaming?: boolean;
  variant?: "message" | "document";
}>();
const blocks = computed(() => parseMarkdown(props.text));
const document = computed(() => props.variant === "document");
function key(i: Inline, n: number) {
  return `${n}-${i.t}`;
}
</script>
<template>
  <div
    class="flex flex-col"
    :class="document ? 'gap-4 leading-7' : 'gap-2.5 leading-relaxed'"
  >
    <template v-for="(b, n) in blocks" :key="n">
      <CodeBlock v-if="b.t === 'code'" :code="b.v" :lang="b.lang" />
      <component
        :is="`h${b.level + (document ? 1 : 2)}`"
        v-else-if="b.t === 'h'"
        class="font-semibold"
        :class="
          document
            ? [
                n > 0 && 'mt-4',
                b.level === 1
                  ? 'text-[24px] leading-8 tracking-tight'
                  : b.level === 2
                    ? 'text-[20px] leading-7'
                    : 'text-[18px] leading-7',
              ]
            : b.level === 1
              ? 'text-base'
              : 'text-[15px]'
        "
        ><template v-for="(i, k) in b.inline" :key="key(i, k)"
          ><b v-if="i.t === 'bold'" class="font-semibold">{{ i.v }}</b
          ><code
            v-else-if="i.t === 'code'"
            class="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
            >{{ i.v }}</code
          ><a
            v-else-if="i.t === 'link'"
            :href="i.href"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-text underline underline-offset-2"
            >{{ i.v }}</a
          ><template v-else>{{ i.v }}</template></template
        ></component
      >
      <ul
        v-else-if="b.t === 'ul' || b.t === 'ol'"
        class="flex flex-col gap-1 pl-5"
        :class="b.t === 'ol' ? 'list-decimal' : 'list-disc'"
      >
        <li v-for="(item, m) in b.items" :key="m" class="marker:text-fg-faint">
          <template v-for="(i, k) in item" :key="key(i, k)"
            ><b v-if="i.t === 'bold'" class="font-semibold">{{ i.v }}</b
            ><code
              v-else-if="i.t === 'code'"
              class="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
              >{{ i.v }}</code
            ><a
              v-else-if="i.t === 'link'"
              :href="i.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-text underline underline-offset-2"
              >{{ i.v }}</a
            ><template v-else>{{ i.v }}</template></template
          >
        </li>
      </ul>
      <p
        v-else-if="b.t === 'p' || b.t === 'quote'"
        :class="
          b.t === 'quote' && 'border-l-2 border-line-strong pl-3 text-fg-muted'
        "
      >
        <template v-for="(i, k) in b.inline" :key="key(i, k)"
          ><b v-if="i.t === 'bold'" class="font-semibold">{{ i.v }}</b
          ><code
            v-else-if="i.t === 'code'"
            class="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
            >{{ i.v }}</code
          ><a
            v-else-if="i.t === 'link'"
            :href="i.href"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-text underline underline-offset-2"
            >{{ i.v }}</a
          ><template v-else>{{ i.v }}</template></template
        ><span
          v-if="streaming && n === blocks.length - 1"
          class="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-primary"
          aria-hidden="true"
        />
      </p>
    </template>
    <span
      v-if="streaming && (!blocks.length || blocks.at(-1)!.t !== 'p')"
      class="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary"
      aria-hidden="true"
    />
  </div>
</template>
