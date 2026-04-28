<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import api from '../api/client';

const auth = useAuthStore();
const router = useRouter();

const recentBN = ref([]);
const loading = ref(true);

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('vi-VN');
}

const greeting = computed(() => {
  const hour = new Date().getHours();
  const name = auth.user?.ten || 'bạn';
  if (hour < 12) return `Chào buổi sáng, ${name}`;
  if (hour < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
});

const quickActions = computed(() => {
  const role = auth.user?.role;
  const actions = [];

  if (role === 'admin' || role === 'staff') {
    actions.push(
      { label: 'Tạo biên nhận', icon: 'pi pi-plus', to: '/bien-nhan', severity: undefined },
      { label: 'Danh sách biên nhận', icon: 'pi pi-search', to: '/bien-nhan', severity: 'secondary' },
    );
  }

  actions.push(
    { label: 'Khách hàng', icon: 'pi pi-users', to: '/khach-hang', severity: 'info' },
  );

  if (role === 'admin') {
    actions.push(
      { label: 'Bảng kê HĐĐT', icon: 'pi pi-file-excel', to: '/bang-ke', severity: 'success' },
    );
  }

  if (role === 'admin' || role === 'accountant') {
    actions.push(
      { label: 'Bảng kê công nợ', icon: 'pi pi-chart-bar', to: '/cong-no', severity: 'warn' },
      { label: 'Báo cáo doanh thu', icon: 'pi pi-chart-line', to: '/doanh-thu', severity: 'help' },
    );
  }

  return actions;
});

async function fetchData() {
  loading.value = true;
  try {
    const bnRes = await api.get('/bien-nhan', { params: { limit: 5, page: 1 } });
    recentBN.value = bnRes.data.data;
  } catch (e) {
    console.warn('Home fetch error:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="animate-fade-in">
    <!-- Branded Hero -->
    <div class="home-hero">
      <div class="hero-content">
        <img src="/logo.png" alt="TMQ Express" class="hero-logo" />
        <div class="hero-text">
          <h1 class="hero-title">{{ greeting }}</h1>
          <p class="hero-subtitle">
            <i class="pi pi-building"></i> {{ auth.userVanPhong?.ten || 'TMQ Express' }}
            <span class="hero-role">· {{ { admin: 'Quản trị viên', staff: 'Nhân viên', accountant: 'Kế toán' }[auth.user?.role] || auth.user?.role }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card" style="margin-bottom: 0.75rem;">
      <div class="card-header">
        <span class="card-title"><i class="pi pi-bolt" style="margin-right: 0.35rem;"></i>Thao tác nhanh</span>
      </div>
      <div class="quick-actions">
        <Button
          v-for="action in quickActions"
          :key="action.label"
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
        <div v-for="bn in recentBN" :key="bn.id" class="recent-item">
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
          <div class="recent-date">{{ formatDate(bn.ngay_bien_nhan) }}</div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!loading && !recentBN.length" class="card" style="text-align:center; padding:2rem; color:var(--text-muted);">
      <i class="pi pi-inbox" style="font-size:2rem; opacity:.3;"></i>
      <p style="margin-top:0.5rem;">Chưa có biên nhận nào</p>
    </div>
  </div>
</template>

<style scoped>
.home-hero {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%);
  border-radius: var(--radius-xl);
  padding: 1.25rem 1.5rem;
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;
}

.home-hero::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -30px;
  width: 120px;
  height: 120px;
  background: rgba(249, 115, 22, 0.15);
  border-radius: 50%;
  filter: blur(30px);
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.hero-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  background: white;
  padding: 3px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.hero-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.15rem;
}

.hero-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.hero-role {
  color: rgba(255, 255, 255, 0.5);
}

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
