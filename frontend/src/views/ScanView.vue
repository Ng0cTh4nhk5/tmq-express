<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api/client';
import StatusBadge from '../components/bien-nhan/StatusBadge.vue';
import StatusStepper from '../components/bien-nhan/StatusStepper.vue';

const route = useRoute();
const ma_so = route.params.ma_so;
const bn = ref(null);
const loading = ref(true);
const error = ref('');

const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ vận chuyển',
  dang_vc: 'Đang vận chuyển',
  da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách',
  khach_da_nhan: 'Khách đã nhận',
};

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('vi-VN');
}

function formatCurrency(val) {
  if (!val) return '—';
  return Number(val).toLocaleString('vi-VN') + 'đ';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data: res } = await api.get(`/scan/${ma_so}`);
    bn.value = res.data;
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Không tìm thấy biên nhận';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="scan-page">
    <div class="scan-card" v-if="loading">
      <div class="scan-loading">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary);"></i>
        <p>Đang tra cứu...</p>
      </div>
    </div>

    <div class="scan-card" v-else-if="error">
      <div class="scan-error">
        <i class="pi pi-exclamation-triangle" style="font-size: 2.5rem; color: #ef4444;"></i>
        <h2>Không tìm thấy</h2>
        <p>{{ error }}</p>
        <p class="scan-ma">Mã: {{ ma_so }}</p>
      </div>
    </div>

    <div class="scan-result" v-else>
      <!-- Header -->
      <div class="scan-header">
        <div class="scan-brand">
          <img src="/logo.png" alt="TMQ Express" class="scan-logo" />
          TMQ Express
        </div>
        <div class="scan-ma-so">{{ bn.ma_so }}</div>
      </div>

      <!-- Status Stepper -->
      <div class="scan-section">
        <StatusStepper :current="bn.trang_thai" />
      </div>

      <!-- Status -->
      <div class="scan-status">
        <StatusBadge :value="bn.trang_thai" type="trang_thai" />
        <span class="scan-date">{{ formatDate(bn.ngay_bien_nhan) }}</span>
      </div>

      <!-- Route -->
      <div class="scan-section">
        <div class="scan-route">
          <div class="route-point">
            <div class="route-dot send"></div>
            <div>
              <strong>{{ bn.van_phong_gui?.ten }}</strong>
              <span>{{ bn.don_vi_gui || bn.nguoi_gui }}</span>
            </div>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <div class="route-dot recv"></div>
            <div>
              <strong>{{ bn.van_phong_nhan?.ten }}</strong>
              <span>{{ bn.don_vi_nhan || bn.nguoi_nhan }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="scan-section">
        <div class="scan-detail-row">
          <span class="detail-label">Hàng hóa</span>
          <span class="detail-value">{{ bn.ten_hang_hoa }}</span>
        </div>
      </div>

      <!-- Timeline -->
      <div class="scan-section" v-if="bn.lich_su?.length">
        <h3 class="section-title">Lịch sử</h3>
        <div class="timeline">
          <div v-for="(item, i) in bn.lich_su" :key="i" class="timeline-item">
            <div class="timeline-dot" :class="{ active: i === 0 }"></div>
            <div class="timeline-content">
              <strong>{{ TRANG_THAI_LABELS[item.trang_thai_moi] || item.trang_thai_moi }}</strong>
              <span>{{ formatDate(item.created_at) }}</span>
              <span v-if="item.ghi_chu" class="timeline-note">{{ item.ghi_chu }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.scan-card,
.scan-result {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.scan-loading,
.scan-error {
  padding: 3rem 2rem;
  text-align: center;
}

.scan-error h2 {
  margin: 0.75rem 0 0.25rem;
  color: #ef4444;
}

.scan-ma {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.scan-header {
  background: linear-gradient(135deg, #1e40af, #7c3aed);
  padding: 1.25rem 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scan-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
}

.scan-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
  background: white;
  padding: 2px;
}

.scan-ma-so {
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.scan-status {
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}

.scan-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.scan-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.scan-route {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.route-point strong {
  display: block;
  font-size: 0.9rem;
}

.route-point span {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.send { background: #2563eb; }
.route-dot.recv { background: #059669; }

.route-line {
  width: 2px;
  height: 16px;
  background: #cbd5e1;
  margin-left: 5px;
}

.scan-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.detail-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.detail-value.highlight {
  color: #dc2626;
  font-size: 1rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--secondary);
  margin-bottom: 0.75rem;
}

.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  position: relative;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: 0;
  width: 2px;
  background: #e2e8f0;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
  margin-top: 3px;
}

.timeline-dot.active { background: #2563eb; }

.timeline-content strong {
  display: block;
  font-size: 0.85rem;
}

.timeline-content span {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.timeline-note {
  font-style: italic;
}
</style>
