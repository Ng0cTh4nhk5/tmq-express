<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useHangDenStore } from '../../stores/hang-den.store';
import { useChoVanChuyenStore } from '../../stores/cho-van-chuyen.store';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const hangDen = useHangDenStore();
const choVanChuyen = useChoVanChuyenStore();

// Menu items grouped by section
const menuGroups = computed(() => {
  const groups = [];

  // ── VẬN HÀNH ──
  const vanHanh = {
    label: 'Vận hành',
    items: [
      { label: 'Trang chủ', icon: 'pi pi-home', to: '/', show: true },
      { label: 'Biên nhận', icon: 'pi pi-file-edit', to: '/bien-nhan', show: true },
      { label: 'Chờ vận chuyển', icon: 'pi pi-truck', to: '/cho-van-chuyen', show: auth.hasRole('admin', 'quan_ly', 'staff'), badge: 'cvc' },
      { label: 'Giao nhận hàng', icon: 'pi pi-inbox', to: '/hang-den', show: auth.hasRole('admin', 'quan_ly', 'staff'), badge: 'hd' },
      { label: 'Khách hàng', icon: 'pi pi-users', to: '/khach-hang', show: true },
    ].filter(i => i.show),
  };
  if (vanHanh.items.length) groups.push(vanHanh);

  // ── TÀI CHÍNH ──
  const taiChinh = {
    label: 'Tài chính',
    items: [
      { label: 'Bảng kê HĐĐT', icon: 'pi pi-file-excel', to: '/bang-ke-hddt', show: auth.hasRole('admin', 'quan_ly') },
      { label: 'Bảng kê công nợ', icon: 'pi pi-chart-bar', to: '/cong-no', show: auth.hasRole('admin', 'quan_ly') },
      { label: 'Thu hộ (COD)', icon: 'pi pi-money-bill', to: '/thu-ho', show: true },
      { label: 'Cước nhận', icon: 'pi pi-wallet', to: '/cuoc-nhan', show: auth.hasRole('admin', 'quan_ly', 'staff') },
      { label: 'Báo cáo doanh thu', icon: 'pi pi-chart-line', to: '/doanh-thu', show: auth.hasRole('admin', 'quan_ly', 'staff') },
      { label: 'Báo cáo tuyến/chành', icon: 'pi pi-map', to: '/bao-cao', show: auth.hasRole('admin', 'quan_ly', 'staff') },
    ].filter(i => i.show),
  };
  if (taiChinh.items.length) groups.push(taiChinh);

  // ── QUẢN TRỊ (admin only) ──
  if (auth.isAdmin) {
    groups.push({
      label: 'Quản trị',
      items: [
        { label: 'Văn phòng',    icon: 'pi pi-building',    to: '/van-phong',    show: true },
        { label: 'Nhân viên',    icon: 'pi pi-id-card',     to: '/nhan-vien',    show: true },
        { label: 'Chành',        icon: 'pi pi-map-marker',  to: '/chanh',        show: true },
        { label: 'Doanh nghiệp', icon: 'pi pi-briefcase',   to: '/doanh-nghiep', show: true },
      ],
    });
  } else if (auth.isQuanLy) {
    // Quản lý thấy Chành + Doanh nghiệp, không thấy Nhân viên và Văn phòng
    groups.push({
      label: 'Quản lý',
      items: [
        { label: 'Chành',        icon: 'pi pi-map-marker',  to: '/chanh',        show: true },
        { label: 'Doanh nghiệp', icon: 'pi pi-briefcase',   to: '/doanh-nghiep', show: true },
      ],
    });
  }

  return groups;
});

function isActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function getBadgeCount(badge) {
  if (badge === 'hd') return hangDen.count;
  if (badge === 'cvc') return choVanChuyen.count;
  return 0;
}

// Debounce collapse để tránh co rút khi di chuột qua nhanh
let collapseTimer = null;

function handleMouseEnter() {
  clearTimeout(collapseTimer);
  ui.expandSidebar();
}

function handleMouseLeave() {
  collapseTimer = setTimeout(() => {
    ui.collapseSidebar();
  }, 250);
}

// Poll badge count khi sidebar mount — mỗi 60 giây
let badgePollTimer = null;
onMounted(() => {
  hangDen.fetchCount();
  choVanChuyen.fetchCount();
  badgePollTimer = setInterval(() => { hangDen.fetchCount(); choVanChuyen.fetchCount(); }, 60_000);
});
onUnmounted(() => { clearInterval(badgePollTimer); });
</script>

<template>
  <aside
    class="sidebar"
    :class="{ expanded: ui.sidebarExpanded }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-icon">
        <img src="/logo.png" alt="TMQ" />
      </div>
      <div class="brand-text">
        <span class="brand-name">TMQ <span class="brand-accent">Express</span></span>
        <span class="brand-sub">Hệ thống quản lý</span>
      </div>
    </div>

    <!-- Nav — Grouped -->
    <nav class="sidebar-nav">
      <template v-for="(group, gi) in menuGroups" :key="gi">
        <div class="nav-group-label">{{ group.label }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="!ui.sidebarExpanded ? item.label : undefined"
        >
          <div class="nav-icon-wrap">
            <i :class="item.icon"></i>
            <!-- Badge dot khi collapsed -->
            <span
              v-if="item.badge && getBadgeCount(item.badge) > 0 && !ui.sidebarExpanded"
              class="nav-dot"
              :class="{ warn: item.badge === 'cvc' }"
            ></span>
          </div>
          <span class="nav-label">{{ item.label }}</span>
          <!-- Badge count khi expanded -->
          <span
            v-if="item.badge === 'hd' && hangDen.count > 0"
            class="nav-badge"
          >{{ hangDen.count > 99 ? '99+' : hangDen.count }}</span>
          <span
            v-if="item.badge === 'cvc' && choVanChuyen.count > 0"
            class="nav-badge nav-badge-warn"
          >{{ choVanChuyen.count > 99 ? '99+' : choVanChuyen.count }}</span>
        </router-link>
      </template>
    </nav>

    <!-- Footer / User -->
    <div class="sidebar-footer">
      <div class="user-badge">
        <div class="user-avatar">{{ auth.user?.ten?.[0] || 'U' }}</div>
        <div class="user-info">
          <span class="user-name">{{ auth.user?.ten }}</span>
          <span class="user-role">{{ auth.user?.role === 'quan_ly' ? 'Quản lý' : auth.user?.role }} · {{ auth.userVanPhong?.ma_vp }}</span>
        </div>
      </div>

      <!-- Đổi mật khẩu -->
      <router-link
        to="/doi-mat-khau"
        class="nav-item change-pw-item"
        :title="!ui.sidebarExpanded ? 'Đổi mật khẩu' : undefined"
      >
        <div class="nav-icon-wrap">
          <i class="pi pi-key"></i>
        </div>
        <span class="nav-label">Đổi mật khẩu</span>
      </router-link>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
  transition: width var(--transition);
  will-change: width;
}

.sidebar.expanded {
  width: var(--sidebar-expanded);
  box-shadow: var(--shadow-sidebar);
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.5rem 0.5rem 11px;
  height: var(--header-height);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.brand-icon {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius);
}

.brand-text {
  overflow: hidden;
  white-space: nowrap;
  max-width: 0;
  opacity: 0;
  margin-left: 0;
  transition:
    max-width 0.2s ease,
    opacity 0.15s ease 0.05s,
    margin-left 0.2s ease;
}

.sidebar.expanded .brand-text {
  max-width: 160px;
  opacity: 1;
}

.brand-name {
  display: block;
  color: #f1f5f9;
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.2;
}

.brand-accent {
  color: var(--gold-400);
}

.brand-sub {
  display: block;
  color: #64748b;
  font-size: 0.65rem;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 0.35rem 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Group labels — fixed height so nav items NEVER shift vertically */
.nav-group-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  /* Same height in both states — items don't move */
  height: 22px;
  padding: 0 0 0 14px;
  margin: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  position: relative;
}

/* Thin divider line visible when collapsed */
.nav-group-label::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-50%);
  transition: opacity 0.15s ease;
}

.sidebar.expanded .nav-group-label {
  opacity: 1;
}

/* Hide divider line when expanded (text visible) */
.sidebar.expanded .nav-group-label::after {
  opacity: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 8px 0 7px;
  margin-bottom: 1px;
  border-radius: var(--radius-sm);
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  height: 36px;
  transition: background var(--transition-fast), color var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.nav-item.active {
  background: rgba(42, 79, 138, 0.2);
  color: #93b8e8;
}

/* Active indicator — gold left bar */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: var(--gold-400);
  border-radius: 0 2px 2px 0;
}

.nav-icon-wrap {
  width: 34px;
  min-width: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.nav-icon-wrap i {
  font-size: 0.95rem;
}

/* Badge dot khi collapsed */
.nav-dot {
  position: absolute;
  top: -2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  border: 1.5px solid var(--bg-sidebar);
}

.nav-dot.warn {
  background: #d97706;
}

.nav-label {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  margin-left: 0;
  transition:
    max-width 0.2s ease,
    opacity 0.15s ease 0.05s,
    margin-left 0.2s ease;
}

.sidebar.expanded .nav-label {
  max-width: 160px;
  opacity: 1;
  margin-left: 0.65rem;
}

/* Badge count khi expanded */
.nav-badge {
  margin-left: auto;
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 0 5px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  flex-shrink: 0;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-width 0.2s ease,
    opacity 0.15s ease 0.05s;
}

.sidebar.expanded .nav-badge {
  max-width: 36px;
  opacity: 1;
}

.nav-badge-warn {
  background: #d97706;
}

/* Footer */
.sidebar-footer {
  padding: 0.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem 0.5rem 0.3rem 13px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.user-avatar {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--navy-400), var(--navy-600));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.user-info {
  overflow: hidden;
  white-space: nowrap;
  max-width: 0;
  opacity: 0;
  transition:
    max-width 0.2s ease,
    opacity 0.15s ease 0.05s;
}

.sidebar.expanded .user-info {
  max-width: 160px;
  opacity: 1;
}

.user-name {
  display: block;
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.75rem;
}

.user-role {
  display: block;
  color: #64748b;
  font-size: 0.65rem;
  text-transform: capitalize;
}

.change-pw-item {
  color: #64748b;
  font-size: 0.78rem;
}

.change-pw-item:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}
</style>
