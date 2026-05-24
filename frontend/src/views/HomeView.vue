<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { formatDate, formatNumber } from '../utils/format';

const auth = useAuthStore();
const router = useRouter();

const recentBN = ref([]);
const loading = ref(true);
const dashStats = ref(null);
const cuocStats = ref(null); // tong-hop cuoc nhan

// formatDate, formatNumber — đã import từ utils/format
const fmt = formatNumber;

const greeting = computed(() => {
  const hour = new Date().getHours();
  const name = auth.user?.ten || 'bạn';
  if (hour < 12) return `Chào buổi sáng, ${name}`;
  if (hour < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
});

const roleLabel = computed(() => {
  return { admin: 'Quản trị viên', staff: 'Nhân viên' }[auth.user?.role] || auth.user?.role;
});

const quickActions = computed(() => {
  const role = auth.user?.role;
  const actions = [];

  if (role === 'admin' || role === 'staff') {
    actions.push(
      { label: 'Tạo biên nhận', icon: 'pi pi-plus', to: '/bien-nhan', color: 'navy' },
      { label: 'Chờ vận chuyển', icon: 'pi pi-truck', to: '/cho-van-chuyen', color: 'gold' },
      { label: 'Cước nhận', icon: 'pi pi-wallet', to: '/cuoc-nhan', color: 'warning', badge: true },
    );
  }

  actions.push(
    { label: 'Khách hàng', icon: 'pi pi-users', to: '/khach-hang', color: 'default' },
    { label: 'Doanh thu', icon: 'pi pi-chart-line', to: '/doanh-thu', color: 'default' },
  );

  if (role === 'admin') {
    actions.push(
      { label: 'Công nợ', icon: 'pi pi-chart-bar', to: '/cong-no', color: 'default' },
      { label: 'Bảng kê HĐĐT', icon: 'pi pi-file-excel', to: '/bang-ke-hddt', color: 'default' },
    );
  }

  return actions;
});

// Fetch dashboard data
async function fetchData() {
  loading.value = true;
  try {
    const [bnRes, dtRes, cuocRes] = await Promise.allSettled([
      api.get('/bien-nhan', { params: { limit: 5, page: 1 } }),
      api.get('/doanh-thu', { params: { nhom: 'thang' } }),
      api.get('/cuoc-nhan/tong-hop'),
    ]);

    if (bnRes.status === 'fulfilled') {
      recentBN.value = bnRes.value.data.data;
    }

    if (dtRes.status === 'fulfilled') {
      const th = dtRes.value.data.data?.tong_hop;
      if (th) {
        dashStats.value = {
          so_bn: th.so_bn || 0,
          tong_cuoc: th.tong_cuoc || 0,
          da_thu: th.da_thu || 0,
          chua_thu: (th.chua_thu || 0) + (th.cong_no || 0),
        };
      }
    }

    if (cuocRes.status === 'fulfilled') {
      cuocStats.value = cuocRes.value.data.data;
    }
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
    <!-- Compact Welcome -->
    <div class="welcome-row">
      <div class="welcome-text">
        <h1 class="welcome-title">{{ greeting }}</h1>
        <p class="welcome-meta">
          {{ auth.userVanPhong?.ten || 'TMQ Express' }}
          <span class="welcome-role">· {{ roleLabel }}</span>
        </p>
      </div>
    </div>

    <!-- KPI Stats -->
    <div v-if="dashStats" class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
      <StatCard
        icon="pi pi-file-edit"
        label="Biên nhận tháng này"
        :value="fmt(dashStats.so_bn) + ' BN'"
        variant="info"
        class="stagger-item"
      />
      <StatCard
        icon="pi pi-wallet"
        label="Tổng doanh thu"
        :value="fmt(dashStats.tong_cuoc) + 'đ'"
        variant="gold"
        class="stagger-item"
      />
      <StatCard
        icon="pi pi-check-circle"
        label="Đã thu"
        :value="fmt(dashStats.da_thu) + 'đ'"
        variant="success"
        class="stagger-item"
      />
      <StatCard
        icon="pi pi-exclamation-triangle"
        label="Chưa thu + Nợ"
        :value="fmt(dashStats.chua_thu) + 'đ'"
        variant="danger"
        class="stagger-item"
      />
    </div>

    <!-- Alert: Cước nhận cần xử lý -->
    <div v-if="cuocStats && cuocStats.cho_thu?.count > 0"
      class="cuoc-alert-banner"
      @click="router.push('/cuoc-nhan')"
    >
      <i class="pi pi-exclamation-triangle"></i>
      <span><b>{{ cuocStats.cho_thu.count }} BN cước nhận</b> đã giao nhưng chưa thu — <span style="text-decoration:underline;cursor:pointer;">Xử lý ngay</span></span>
    </div>

    <!-- Quick Actions — Icon Grid -->
    <div class="card" style="margin-bottom: 0.75rem;">
      <div class="card-header">
        <span class="card-title"><i class="pi pi-bolt" style="margin-right: 0.35rem;"></i>Thao tác nhanh</span>
      </div>
      <div class="action-grid">
        <div
          v-for="action in quickActions"
          :key="action.label"
          class="action-card"
          :class="'action-' + action.color"
          style="position:relative;"
          @click="router.push(action.to)"
        >
          <i :class="action.icon" class="action-icon"></i>
          <span class="action-label">{{ action.label }}</span>
          <!-- Badge cần xử lý -->
          <span
            v-if="action.badge && cuocStats && cuocStats.cho_thu?.count > 0"
            class="action-badge"
          >{{ cuocStats.cho_thu.count }}</span>
        </div>
      </div>
    </div>

    <!-- Recent BN -->
    <div class="card" v-if="recentBN.length">
      <div class="card-header">
        <span class="card-title"><i class="pi pi-clock" style="margin-right: 0.35rem;"></i>Biên nhận gần đây</span>
        <Button label="Xem tất cả" text size="small" @click="router.push('/bien-nhan')" />
      </div>
      <div class="recent-list">
        <div v-for="bn in recentBN" :key="bn.id" class="recent-item" @click="router.push('/bien-nhan')">
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
/* Welcome row — compact */
.welcome-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
}

.welcome-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.1rem;
}

.welcome-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.welcome-role {
  color: var(--text-light);
}

/* Quick Actions — Icon Grid */
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-base);
  cursor: pointer;
  transition: all var(--transition);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--navy-200);
}

.action-card.action-navy {
  border-color: var(--navy-100);
  background: var(--navy-50);
}
.action-card.action-navy:hover { border-color: var(--navy-400); }
.action-card.action-navy .action-icon { color: var(--navy-500); }

.action-card.action-gold {
  border-color: var(--gold-100);
  background: var(--gold-50);
}
.action-card.action-gold:hover { border-color: var(--gold-400); }
.action-card.action-gold .action-icon { color: var(--gold-500); }

.action-icon {
  font-size: 1.1rem;
  color: var(--navy-400);
}

.action-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
}

/* Recent list */
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
  cursor: pointer;
}

.recent-item:hover {
  background: var(--bg-base);
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-code {
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--navy-400);
  white-space: nowrap;
  min-width: 90px;
  font-family: var(--font-mono);
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

/* Cước nhận alert banner */
.cuoc-alert-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1rem;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #92400e;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}
.cuoc-alert-banner:hover { background: #fef3c7; }
.cuoc-alert-banner .pi { font-size: 1rem; flex-shrink: 0; color: #f59e0b; }

/* Badge trên action-card */
.action-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  min-width: 17px;
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  box-shadow: 0 1px 4px rgba(239,68,68,.4);
}

/* action-card warning variant */
.action-card.action-warning {
  border-color: #fde68a;
  background: #fffbeb;
}
.action-card.action-warning:hover { border-color: #f59e0b; }
.action-card.action-warning .action-icon { color: #d97706; }
</style>
