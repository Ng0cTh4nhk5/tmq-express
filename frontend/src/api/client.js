import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';
import router from '../router';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tmq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: handle 401 (expired/revoked)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.error?.code;
      // TOKEN_REVOKED or expired — force logout
      if (code === 'TOKEN_REVOKED' || code === 'UNAUTHORIZED') {
        const authStore = useAuthStore();
        authStore.logout();
        router.push('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default api;
