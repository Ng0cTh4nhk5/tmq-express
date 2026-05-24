<script setup>
import AppSidebar from './AppSidebar.vue';
import AppHeader from './AppHeader.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useUiStore } from '../../stores/ui.store';

const ui = useUiStore();
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <AppHeader />
    <Toast position="top-right" />
    <ConfirmDialog />
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <!-- Backdrop khi sidebar expanded -->
    <div
      v-if="ui.sidebarExpanded"
      class="sidebar-backdrop"
      @click="ui.collapseSidebar"
    ></div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-main {
  margin-left: var(--sidebar-width);
  margin-top: var(--header-height);
  padding: var(--content-padding);
  min-height: calc(100vh - var(--header-height));
  transition: margin-left var(--transition);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 95;
  cursor: default;
}
</style>
