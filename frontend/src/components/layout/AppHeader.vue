<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth.store';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// Breadcrumb auto-gen từ route meta
const breadcrumbs = computed(() => {
  const crumbs = [];
  for (const matched of route.matched) {
    if (matched.meta?.title) {
      crumbs.push({
        label: matched.meta.title,
        to: matched.path || '/',
      });
    }
  }
  return crumbs;
});

function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="header-breadcrumb">
        <span class="breadcrumb-vp">{{ auth.userVanPhong?.ten || 'TMQ Express' }}</span>
        <template v-for="(crumb, i) in breadcrumbs" :key="i">
          <i class="pi pi-chevron-right breadcrumb-sep"></i>
          <router-link
            :to="crumb.to"
            class="breadcrumb-item"
            :class="{ active: i === breadcrumbs.length - 1 }"
          >{{ crumb.label }}</router-link>
        </template>
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
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  z-index: 90;
  transition: left var(--transition);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

/* Breadcrumb */
.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  min-width: 0;
}

.breadcrumb-vp {
  font-weight: 600;
  color: var(--navy-500);
  white-space: nowrap;
}

.breadcrumb-sep {
  font-size: 0.55rem;
  color: var(--text-light);
}

.breadcrumb-item {
  color: var(--text-muted);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.breadcrumb-item:hover {
  color: var(--navy-400);
}

.breadcrumb-item.active {
  color: var(--text-secondary);
  font-weight: 600;
  pointer-events: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
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
