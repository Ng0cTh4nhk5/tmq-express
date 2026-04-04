import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

import LoginView from '../views/LoginView.vue';
import MainLayout from '../components/layout/MainLayout.vue';
import HomeView from '../views/HomeView.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: HomeView },
      { path: 'bien-nhan', name: 'BienNhanList', component: () => import('../views/BienNhanListView.vue') },
      { path: 'bien-nhan/tao-moi', name: 'BienNhanNew', component: () => import('../views/BienNhanFormView.vue') },
      { path: 'bien-nhan/:id/sua', name: 'BienNhanEdit', component: () => import('../views/BienNhanFormView.vue') },
      { path: 'khach-hang', name: 'KhachHangList', component: () => import('../views/KhachHangListView.vue') },
      { path: 'khach-hang/them-moi', name: 'KhachHangNew', component: () => import('../views/KhachHangFormView.vue') },
      { path: 'khach-hang/:id/sua', name: 'KhachHangEdit', component: () => import('../views/KhachHangFormView.vue') },
      { path: 'bang-ke', name: 'BangKe', component: () => import('../views/BangKeView.vue'), meta: { role: ['admin'] } },
      { path: 'phieu-thu', name: 'PhieuThu', component: () => import('../views/PhieuThuView.vue'), meta: { role: ['admin', 'accountant'] } },
      { path: 'phieu-chi', name: 'PhieuChi', component: () => import('../views/PhieuChiView.vue'), meta: { role: ['admin', 'accountant'] } },
      { path: 'cong-no', name: 'CongNo', component: () => import('../views/CongNoView.vue'), meta: { role: ['admin', 'accountant'] } },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'bao-cao', name: 'BaoCao', component: () => import('../views/BaoCaoView.vue'), meta: { role: ['admin', 'accountant'] } },
      { path: 'van-phong', name: 'VanPhong', component: () => import('../views/VanPhongView.vue'), meta: { role: ['admin'] } },
      { path: 'nhan-vien', name: 'NhanVien', component: () => import('../views/NhanVienView.vue'), meta: { role: ['admin'] } },
    ],
  },
  {
    path: '/scan/:ma_so',
    name: 'Scan',
    component: () => import('../views/ScanView.vue'),
    meta: { public: true },
  },
  {
    path: '/bien-nhan/:id/xem-pdf',
    name: 'PdfViewer',
    component: () => import('../views/PdfViewerPage.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Public pages (scan)
  if (to.meta.public) return next();

  // If requires auth
  if (to.meta.requiresAuth || to.matched.some((r) => r.meta.requiresAuth)) {
    if (!authStore.token) {
      return next('/login');
    }

    // Fetch profile if not loaded
    if (!authStore.user) {
      const user = await authStore.fetchProfile();
      if (!user) return next('/login');
    }

    // Role check
    const routeRole = to.meta.role;
    if (routeRole && !routeRole.includes(authStore.user.role)) {
      return next('/');
    }
  }

  // If guest page and already logged in
  if (to.meta.guest && authStore.token) {
    return next('/');
  }

  next();
});

export default router;
