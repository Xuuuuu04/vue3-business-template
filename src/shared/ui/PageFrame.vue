<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <section class="page-frame" :aria-label="title">
    <header class="page-heading">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="description" class="muted">{{ description }}</p>
      </div>
      <div class="page-actions"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>
