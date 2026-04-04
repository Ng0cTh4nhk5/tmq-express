import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const sidebarExpanded = ref(false);

  function expandSidebar() {
    sidebarExpanded.value = true;
  }

  function collapseSidebar() {
    sidebarExpanded.value = false;
  }

  function toggleSidebar() {
    sidebarExpanded.value = !sidebarExpanded.value;
  }

  return {
    sidebarExpanded,
    expandSidebar,
    collapseSidebar,
    toggleSidebar,
  };
});
