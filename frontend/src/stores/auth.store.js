import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  // C-01: Dùng sessionStorage thay localStorage — tự xóa khi đóng tab, không bị XSS đọc từ tab khác
  const token = ref(sessionStorage.getItem('tmq_token') || null);

  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isQuanLy = computed(() => user.value?.role === 'quan_ly');
  const isStaff = computed(() => user.value?.role === 'staff');
  const userVanPhong = computed(() => user.value?.van_phong || null);

  function hasRole(...roles) {
    return roles.includes(user.value?.role);
  }

  async function login(username, password) {
    const { data: res } = await api.post('/auth/login', { username, password });
    token.value = res.data.token;
    user.value = res.data.user;
    sessionStorage.setItem('tmq_token', res.data.token);
    return res.data.user;
  }

  async function fetchProfile() {
    try {
      const { data: res } = await api.get('/auth/me');
      user.value = res.data;
      return res.data;
    } catch {
      logout();
      return null;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    sessionStorage.removeItem('tmq_token');
  }

  return {
    user, token,
    isLoggedIn, isAdmin, isQuanLy, isStaff, userVanPhong,
    hasRole, login, fetchProfile, logout,
  };
});
