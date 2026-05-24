<script setup>
defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  subtitle: { type: String, default: '' },
  iconBg: { type: String, default: '' },
  iconColor: { type: String, default: '' },
  variant: { type: String, default: '' }, // 'success' | 'warning' | 'danger' | 'gold' | 'info' | ''
  gradient: { type: String, default: '' }, // DEPRECATED — backward compat
});
</script>

<template>
  <!-- DEPRECATED: Gradient variant — backward compat -->
  <div v-if="gradient" class="stat-card-gradient" :class="gradient">
    <div class="stat-icon"><i :class="icon"></i></div>
    <div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      <div v-if="subtitle" class="stat-subtitle">{{ subtitle }}</div>
    </div>
  </div>

  <!-- New: variant design (left accent border) -->
  <div v-else class="stat-card" :class="variant">
    <div class="stat-icon" :style="iconBg ? { background: iconBg, color: iconColor } : {}">
      <i :class="icon"></i>
    </div>
    <div class="stat-info">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      <div v-if="subtitle" class="stat-subtitle">{{ subtitle }}</div>
      <slot name="sparkline"></slot>
    </div>
  </div>
</template>

<style scoped>
.stat-info {
  min-width: 0;
  flex: 1;
}
</style>
