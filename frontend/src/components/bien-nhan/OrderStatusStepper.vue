<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentStatus: { type: String, required: true },
});

const STEPS = [
  { key: 'cho_vc',       label: 'Chờ VC',       icon: 'pi pi-inbox' },
  { key: 'dang_vc',      label: 'Đang VC',       icon: 'pi pi-truck' },
  { key: 'da_den_kho',   label: 'Đến kho',       icon: 'pi pi-building' },
  { key: 'da_bao_khach', label: 'Báo khách',     icon: 'pi pi-phone' },
  { key: 'khach_da_nhan',label: 'KH đã nhận',   icon: 'pi pi-check-circle' },
];

const ORDER = STEPS.map(s => s.key);

const currentIdx = computed(() => ORDER.indexOf(props.currentStatus));

function stepState(idx) {
  if (idx < currentIdx.value) return 'done';
  if (idx === currentIdx.value) return 'active';
  return 'pending';
}
</script>

<template>
  <div class="order-stepper">
    <div
      v-for="(step, idx) in STEPS"
      :key="step.key"
      class="stepper-step"
    >
      <!-- Node -->
      <div class="step-node" :class="stepState(idx)">
        <i v-if="stepState(idx) === 'done'" class="pi pi-check" />
        <i v-else :class="step.icon" />
      </div>

      <!-- Label -->
      <div class="step-label" :class="stepState(idx)">{{ step.label }}</div>

      <!-- Connector (not after last) -->
      <div
        v-if="idx < STEPS.length - 1"
        class="step-connector"
        :class="{ filled: idx < currentIdx }"
      />
    </div>
  </div>
</template>

<style scoped>
.order-stepper {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: 100%;
  padding: 0.5rem 0;
  position: relative;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  gap: 0.35rem;
}

/* connector line between steps */
.step-connector {
  position: absolute;
  top: 16px;
  left: calc(50% + 16px);
  right: calc(-50% + 16px);
  height: 2px;
  background: #e2e8f0;
  transition: background 0.3s;
  z-index: 0;
}
.step-connector.filled {
  background: #10b981;
}

/* Node circle */
.step-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  color: #94a3b8;
  transition: all 0.3s;
  z-index: 1;
  flex-shrink: 0;
}

.step-node.done {
  background: #10b981;
  border-color: #10b981;
  color: #fff;
}

.step-node.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
}

.step-node.pending {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #cbd5e1;
}

/* Labels */
.step-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  color: #94a3b8;
  white-space: nowrap;
  transition: color 0.3s;
  line-height: 1.2;
}

.step-label.done {
  color: #10b981;
}

.step-label.active {
  color: #3b82f6;
}

.step-label.pending {
  color: #cbd5e1;
}
</style>
