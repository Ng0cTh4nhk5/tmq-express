<script setup>
import { computed } from 'vue';

const props = defineProps({
  current: { type: String, required: true },
  compact: { type: Boolean, default: false },
});

const STEPS = [
  { key: 'cho_vc', label: 'Chờ VC', icon: 'pi pi-box', short: 'Chờ' },
  { key: 'dang_vc', label: 'Đang vận chuyển', icon: 'pi pi-truck', short: 'Đang VC' },
  { key: 'da_den_kho', label: 'Đã đến kho', icon: 'pi pi-building', short: 'Đến kho' },
  { key: 'da_bao_khach', label: 'Đã báo khách', icon: 'pi pi-phone', short: 'Đã báo' },
  { key: 'khach_da_nhan', label: 'Khách đã nhận', icon: 'pi pi-check-circle', short: 'Đã nhận' },
];

const currentIdx = computed(() => STEPS.findIndex(s => s.key === props.current));

function stepClass(idx) {
  if (idx < currentIdx.value) return 'done';
  if (idx === currentIdx.value) return 'active';
  return 'pending';
}
</script>

<template>
  <div class="status-stepper" :class="{ compact }">
    <div v-for="(step, i) in STEPS" :key="step.key" class="stepper-step" :class="stepClass(i)">
      <div class="step-node">
        <i v-if="i < currentIdx" class="pi pi-check"></i>
        <i v-else :class="step.icon"></i>
      </div>
      <span class="step-label">{{ compact ? step.short : step.label }}</span>
      <div v-if="i < STEPS.length - 1" class="step-connector" :class="{ filled: i < currentIdx }"></div>
    </div>
  </div>
</template>

<style scoped>
.status-stepper {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: 100%;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  min-width: 0;
}

.step-node {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  border: 2px solid #d1d5db;
  background: #f3f4f6;
  color: #9ca3af;
  z-index: 1;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step-label {
  margin-top: 0.3rem;
  font-size: 0.62rem;
  color: #9ca3af;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
  max-width: 70px;
}

/* Connector line */
.step-connector {
  position: absolute;
  top: 15px;
  left: calc(50% + 15px);
  right: calc(-50% + 15px);
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
  transition: background 0.3s ease;
}

.step-connector.filled {
  background: #22c55e;
}

/* Done state */
.stepper-step.done .step-node {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}
.stepper-step.done .step-label {
  color: #22c55e;
  font-weight: 600;
}

/* Active state */
.stepper-step.active .step-node {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
  animation: pulse-ring 2s ease-in-out infinite;
}
.stepper-step.active .step-label {
  color: #2563eb;
  font-weight: 700;
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2); }
  50% { box-shadow: 0 0 0 7px rgba(37, 99, 235, 0.08); }
}

/* Compact variant */
.compact .step-node {
  width: 24px;
  height: 24px;
  font-size: 0.65rem;
}
.compact .step-label {
  font-size: 0.58rem;
  max-width: 55px;
}
.compact .step-connector {
  top: 12px;
  left: calc(50% + 12px);
  right: calc(-50% + 12px);
}
</style>
