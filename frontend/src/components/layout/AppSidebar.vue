<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

const menuItems = computed(() => {
  const items = [
    { label: 'Trang chủ', icon: 'pi pi-home', to: '/', show: true },
    { label: 'Biên nhận', icon: 'pi pi-file-edit', to: '/bien-nhan', show: auth.hasRole('admin', 'staff', 'accountant') },
    { label: 'Khách hàng', icon: 'pi pi-users', to: '/khach-hang', show: true },
    { label: 'Bảng kê HĐĐT', icon: 'pi pi-file-excel', to: '/bang-ke', show: auth.isAdmin },
    { label: 'Phiếu thu', icon: 'pi pi-wallet', to: '/phieu-thu', show: auth.hasRole('admin', 'accountant') },
    { label: 'Phiếu chi', icon: 'pi pi-credit-card', to: '/phieu-chi', show: auth.hasRole('admin', 'accountant') },
    { label: 'Công nợ', icon: 'pi pi-chart-bar', to: '/cong-no', show: auth.hasRole('admin', 'accountant') },
    { label: 'Dashboard', icon: 'pi pi-chart-pie', to: '/dashboard', show: true },
    { label: 'Báo cáo', icon: 'pi pi-print', to: '/bao-cao', show: auth.hasRole('admin', 'accountant') },
  ];

  if (auth.isAdmin) {
    items.push(
      { type: 'divider' },
      { label: 'Văn phòng', icon: 'pi pi-building', to: '/van-phong', show: true },
      { label: 'Nhân viên', icon: 'pi pi-id-card', to: '/nhan-vien', show: true },
    );
  }

  return items.filter((i) => i.type === 'divider' || i.show);
});

function isActive(path) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function handleMouseEnter() {
  ui.expandSidebar();
}

function handleMouseLeave() {
  ui.collapseSidebar();
}
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
        <i class="pi pi-truck"></i>
      </div>
      <transition name="fade-text">
        <div v-if="ui.sidebarExpanded" class="brand-text">
          <span class="brand-name">TMQ Express</span>
          <span class="brand-sub">Hệ thống quản lý</span>
        </div>
      </transition>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">
      <template v-for="(item, i) in menuItems" :key="i">
        <div v-if="item.type === 'divider'" class="nav-divider"></div>
        <router-link
          v-else
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="!ui.sidebarExpanded ? item.label : undefined"
        >
          <i :class="item.icon"></i>
          <transition name="fade-text">
            <span v-if="ui.sidebarExpanded" class="nav-label">{{ item.label }}</span>
          </transition>
        </router-link>
      </template>
    </nav>

    <!-- Footer / User -->
    <div class="sidebar-footer">
      <div class="user-badge">
        <div class="user-avatar">{{ auth.user?.ten?.[0] || 'U' }}</div>
        <transition name="fade-text">
          <div v-if="ui.sidebarExpanded" class="user-info">
            <span class="user-name">{{ auth.user?.ten }}</span>
            <span class="user-role">{{ auth.user?.role }} · {{ auth.userVanPhong?.ma_vp }}</span>
          </div>
        </transition>
      </div>
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
  padding: 0.65rem;
  height: var(--header-height);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.brand-icon {
  width: 34px;
  height: 34px;
  min-width: 34px;
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  margin: 0 auto;
}

.sidebar.expanded .brand-icon {
  margin: 0;
}

.brand-text {
  overflow: hidden;
  white-space: nowrap;
}

.brand-name {
  display: block;
  color: #f1f5f9;
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.2;
}

.brand-sub {
  display: block;
  color: #64748b;
  font-size: 0.65rem;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem;
  margin-bottom: 1px;
  border-radius: var(--radius-sm);
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.nav-item.active {
  background: rgba(37, 99, 235, 0.15);
  color: #60a5fa;
}

.nav-item i {
  font-size: 0.95rem;
  width: 34px;
  min-width: 34px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar:not(.expanded) .nav-item i {
  margin: 0 auto;
}

.nav-label {
  overflow: hidden;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 0.35rem 0.5rem;
}

/* Footer */
.sidebar-footer {
  padding: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.user-avatar {
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  margin: 0 auto;
}

.sidebar.expanded .user-avatar {
  margin: 0;
}

.user-info {
  overflow: hidden;
  white-space: nowrap;
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

/* Transitions */
.fade-text-enter-active { transition: opacity 0.15s ease 0.05s; }
.fade-text-leave-active { transition: opacity 0.1s ease; }
.fade-text-enter-from,
.fade-text-leave-to { opacity: 0; }
</style>
