<script setup>
import { computed } from 'vue';

const props = defineProps({
  current: { type: String, required: true },
});

const STEPS = [
  { key: 'cho_thu',   label: 'Chờ thu',   icon: 'pi pi-clock' },
  { key: 'da_thu',    label: 'Đã thu',    icon: 'pi pi-money-bill' },
  { key: 'da_chuyen', label: 'Đã chuyển', icon: 'pi pi-send' },
  { key: 'da_tra',    label: 'Hoàn tất',  icon: 'pi pi-check-circle' },
];

const currentIdx = computed(() => STEPS.findIndex(s => s.key === props.current));

function stepClass(idx) {
  if (idx < currentIdx.value) return 'done';
  if (idx === currentIdx.value) return 'active';
  return 'pending';
}
</script>

<template>
  <div class="cod-stepper">
    <div v-for="(step, i) in STEPS" :key="step.key" class="cod-step" :class="stepClass(i)">
      <div class="cod-node">
        <i v-if="i < currentIdx" class="pi pi-check" />
        <i v-else :class="step.icon" />
      </div>
      <span class="cod-label">{{ step.label }}</span>
      <div v-if="i < STEPS.length - 1" class="cod-connector" :class="{ filled: i < currentIdx }" />
    </div>
  </div>
</template>

<style scoped>
.cod-stepper {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: 100%;
}

.cod-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  min-width: 0;
}

.cod-node {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  border: 2px solid #d1d5db;
  background: #f3f4f6;
  color: #9ca3af;
  z-index: 1;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.cod-label {
  margin-top: 0.25rem;
  font-size: 0.6rem;
  font-weight: 600;
  color: #9ca3af;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  max-width: 60px;
}

/* Connector line */
.cod-connector {
  position: absolute;
  top: 13px;
  left: calc(50% + 13px);
  right: calc(-50% + 13px);
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
  transition: background 0.3s ease;
}

.cod-connector.filled {
  background: #f59e0b;
}

/* Done */
.cod-step.done .cod-node {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}
.cod-step.done .cod-label {
  color: #d97706;
  font-weight: 700;
}

/* Active */
.cod-step.active .cod-node {
  background: #d97706;
  border-color: #d97706;
  color: white;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.2);
  animation: cod-pulse 2s ease-in-out infinite;
}
.cod-step.active .cod-label {
  color: #92400e;
  font-weight: 700;
}

@keyframes cod-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.2); }
  50%       { box-shadow: 0 0 0 7px rgba(217, 119, 6, 0.07); }
}
</style>
