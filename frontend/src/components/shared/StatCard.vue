<script setup>
defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  iconBg: { type: String, default: '#dbeafe' },
  iconColor: { type: String, default: '#2563eb' },
  gradient: { type: String, default: '' },
});
</script>

<template>
  <!-- Gradient variant -->
  <div v-if="gradient" class="stat-card-gradient" :class="gradient">
    <div class="stat-icon"><i :class="icon"></i></div>
    <div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>

  <!-- Default variant -->
  <div v-else class="stat-card">
    <div class="stat-icon" :style="{ background: iconBg, color: iconColor }">
      <i :class="icon"></i>
    </div>
    <div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>
