<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const stats = ref({ bn_hom_nay: 0, tong_bn: 0, doanh_thu_thang: 0, cong_no_ton: 0, so_cong_no: 0 });
const recentBN = ref([]);
const loading = ref(true);

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('vi-VN');
}

// Role-based greeting
const greeting = computed(() => {
  const hour = new Date().getHours();
  const name = auth.user?.ten || 'bạn';
  if (hour < 12) return `Chào buổi sáng, ${name}`;
  if (hour < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
});

// Role-based stat cards
const statCards = computed(() => {
  const role = auth.user?.role;

  if (role === 'staff') {
    return [
      { icon: 'pi pi-file-edit', label: 'Biên nhận hôm nay', value: stats.value.bn_hom_nay, iconBg: '#dbeafe', iconColor: '#2563eb' },
      { icon: 'pi pi-inbox', label: 'Tổng biên nhận', value: stats.value.tong_bn, iconBg: '#d1fae5', iconColor: '#059669' },
      { icon: 'pi pi-truck', label: 'Đang vận chuyển', value: stats.value.dang_vc || 0, iconBg: '#fef3c7', iconColor: '#d97706' },
    ];
  }

  if (role === 'accountant') {
    return [
      { icon: 'pi pi-wallet', label: 'Doanh thu tháng', value: fmt(stats.value.doanh_thu_thang) + 'đ', iconBg: '#e0e7ff', iconColor: '#4f46e5' },
      { icon: 'pi pi-exclamation-triangle', label: 'Công nợ tồn', value: fmt(stats.value.cong_no_ton) + 'đ', iconBg: '#fee2e2', iconColor: '#dc2626' },
      { icon: 'pi pi-chart-bar', label: 'Số công nợ', value: stats.value.so_cong_no, iconBg: '#fef3c7', iconColor: '#d97706' },
      { icon: 'pi pi-file-edit', label: 'Biên nhận hôm nay', value: stats.value.bn_hom_nay, iconBg: '#dbeafe', iconColor: '#2563eb' },
    ];
  }

  // Admin — full stats
  return [
    { icon: 'pi pi-file-edit', label: 'Biên nhận hôm nay', value: stats.value.bn_hom_nay, iconBg: '#dbeafe', iconColor: '#2563eb' },
    { icon: 'pi pi-inbox', label: 'Tổng biên nhận', value: stats.value.tong_bn, iconBg: '#d1fae5', iconColor: '#059669' },
    { icon: 'pi pi-wallet', label: 'Doanh thu tháng', value: fmt(stats.value.doanh_thu_thang) + 'đ', iconBg: '#e0e7ff', iconColor: '#4f46e5' },
    { icon: 'pi pi-exclamation-triangle', label: 'Công nợ tồn', value: fmt(stats.value.cong_no_ton) + 'đ', iconBg: '#fee2e2', iconColor: '#dc2626' },
  ];
});

// Role-based quick actions
const quickActions = computed(() => {
  const role = auth.user?.role;
  const actions = [];

  if (role === 'admin' || role === 'staff') {
    actions.push(
      { label: 'Tạo biên nhận', icon: 'pi pi-plus', to: '/bien-nhan/tao-moi', severity: undefined },
      { label: 'Danh sách biên nhận', icon: 'pi pi-search', to: '/bien-nhan', severity: 'secondary' },
    );
  }

  if (role === 'admin' || role === 'accountant') {
    actions.push(
      { label: 'Lập phiếu thu', icon: 'pi pi-wallet', to: '/phieu-thu', severity: 'success' },
      { label: 'Xem công nợ', icon: 'pi pi-chart-bar', to: '/cong-no', severity: 'warn' },
    );
  }

  actions.push(
    { label: 'Dashboard', icon: 'pi pi-chart-pie', to: '/dashboard', severity: 'info' },
  );

  if (role === 'admin' || role === 'accountant') {
    actions.push(
      { label: 'Báo cáo', icon: 'pi pi-print', to: '/bao-cao', severity: 'help' },
    );
  }

  return actions;
});

async function fetchData() {
  loading.value = true;
  try {
    const [statsRes, bnRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/bien-nhan', { params: { limit: 5, page: 1 } }),
    ]);
    stats.value = statsRes.data.data;
    recentBN.value = bnRes.data.data;
  } catch (e) {
    console.warn('Home fetch error:', e);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu tổng quan', life: 4000 });
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader :title="greeting" icon="pi pi-home" />

    <!-- Stat Cards -->
    <div class="stats-grid" :style="{ gridTemplateColumns: `repeat(${statCards.length}, 1fr)` }">
      <StatCard
        v-for="(card, i) in statCards"
        :key="i"
        :icon="card.icon"
        :label="card.label"
        :value="card.value"
        :iconBg="card.iconBg"
        :iconColor="card.iconColor"
      />
    </div>

    <!-- Quick Actions -->
    <div class="card" style="margin-bottom: 0.75rem;">
      <div class="card-header">
        <span class="card-title"><i class="pi pi-bolt" style="margin-right: 0.35rem;"></i>Thao tác nhanh</span>
      </div>
      <div class="quick-actions">
        <Button
          v-for="action in quickActions"
          :key="action.to"
          :label="action.label"
          :icon="action.icon"
          :severity="action.severity"
          size="small"
          outlined
          @click="router.push(action.to)"
        />
      </div>
    </div>

    <!-- Recent BN -->
    <div class="card" v-if="recentBN.length">
      <div class="card-header">
        <span class="card-title"><i class="pi pi-clock" style="margin-right: 0.35rem;"></i>Biên nhận gần đây</span>
        <Button label="Xem tất cả" text size="small" @click="router.push('/bien-nhan')" />
      </div>
      <div class="recent-list">
        <div v-for="bn in recentBN" :key="bn.id" class="recent-item" @click="router.push(`/bien-nhan/${bn.id}/sua`)">
          <div class="recent-code">{{ bn.ma_so }}</div>
          <div class="recent-info">
            <span class="recent-route">{{ bn.van_phong_gui?.ma_vp }} → {{ bn.van_phong_nhan?.ma_vp }}</span>
            <span class="recent-goods text-truncate">{{ bn.ten_hang_hoa }}</span>
          </div>
          <div class="recent-status">
            <span class="badge" :class="`badge-${bn.trang_thai}`">
              {{ { cho_vc: 'Chờ VC', dang_vc: 'Đang VC', da_den_kho: 'Đến kho', da_bao_khach: 'Đã báo', khach_da_nhan: 'Đã nhận' }[bn.trang_thai] }}
            </span>
          </div>
          <div class="recent-date">{{ formatDate(bn.ngay_nhan) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-radius: var(--radius-xs);
}

.recent-item:hover {
  background: var(--bg);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-code {
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--primary);
  white-space: nowrap;
  min-width: 90px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-route {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.recent-goods {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  max-width: 200px;
}

.recent-status {
  flex-shrink: 0;
}

.recent-date {
  font-size: 0.72rem;
  color: var(--text-light);
  white-space: nowrap;
  min-width: 65px;
  text-align: right;
}
</style>
