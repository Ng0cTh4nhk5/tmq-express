<script setup>
import { useAuthStore } from '../../stores/auth.store';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="header-vp">
        <i class="pi pi-building"></i>
        <span>{{ auth.userVanPhong?.ten || 'TMQ Express' }}</span>
      </div>
    </div>
    <div class="header-right">
      <span class="header-user">
        <i class="pi pi-user"></i>
        {{ auth.user?.ten }}
        <span class="header-role">({{ auth.user?.role }})</span>
      </span>
      <Button
        icon="pi pi-sign-out"
        severity="secondary"
        text
        rounded
        size="small"
        @click="handleLogout"
        v-tooltip.bottom="'Đăng xuất'"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--header-height);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 90;
  transition: left var(--transition);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-vp {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.header-vp i {
  color: var(--primary);
  font-size: 0.85rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-user {
  color: var(--text-muted);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.header-role {
  color: var(--text-light);
  font-size: 0.7rem;
}
</style>
