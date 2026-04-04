<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
});
</script>

<template>
  <div class="page-header">
    <h1>
      <i v-if="icon" :class="icon"></i>
      {{ title }}
    </h1>
    <div class="page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
