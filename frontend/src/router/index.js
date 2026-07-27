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
      { path: '', name: 'Home', component: HomeView, meta: { title: 'Trang chủ' } },
      { path: 'doi-mat-khau', name: 'ChangePassword', component: () => import('../views/ChangePasswordView.vue'), meta: { title: 'Đổi mật khẩu' } },
      { path: 'bien-nhan', name: 'BienNhanList', component: () => import('../views/BienNhanListView.vue'), meta: { title: 'Biên nhận' } },
      { path: 'cho-van-chuyen', name: 'ChoVanChuyen', component: () => import('../views/ChoVanChuyenView.vue'), meta: { title: 'Chờ vận chuyển', role: ['admin', 'quan_ly', 'staff'] } },
      { path: 'hang-den', name: 'HangDen', component: () => import('../views/HangDenView.vue'), meta: { title: 'Giao nhận hàng' } },

      { path: 'khach-hang', name: 'KhachHangList', component: () => import('../views/KhachHangListView.vue'), meta: { title: 'Khách hàng' } },
      { path: 'khach-hang/them-moi', name: 'KhachHangNew', component: () => import('../views/KhachHangFormView.vue'), meta: { title: 'Thêm khách hàng' } },
      { path: 'khach-hang/:id/sua', name: 'KhachHangEdit', component: () => import('../views/KhachHangFormView.vue'), meta: { title: 'Sửa khách hàng' } },
      { path: 'bang-ke-hddt', name: 'BangKe', component: () => import('../views/BangKeView.vue'), meta: { title: 'Bảng kê HĐĐT', role: ['admin', 'quan_ly'] } },
      { path: 'cong-no', name: 'CongNo', component: () => import('../views/CongNoView.vue'), meta: { title: 'Bảng kê công nợ', role: ['admin', 'quan_ly'] } },
      { path: 'doanh-thu', name: 'DoanhThu', component: () => import('../views/DoanhThuView.vue'), meta: { title: 'Báo cáo doanh thu', role: ['admin', 'quan_ly', 'staff'] } },
      { path: 'bao-cao', name: 'BaoCao', component: () => import('../views/BaoCaoView.vue'), meta: { title: 'Báo cáo tuyến & chành', role: ['admin', 'quan_ly', 'staff'] } },
      { path: 'van-phong', name: 'VanPhong', component: () => import('../views/VanPhongView.vue'), meta: { title: 'Văn phòng', role: ['admin'] } },
      { path: 'nhan-vien', name: 'NhanVien', component: () => import('../views/NhanVienView.vue'), meta: { title: 'Nhân viên', role: ['admin'] } },
      { path: 'chanh', name: 'Chanh', component: () => import('../views/ChanhView.vue'), meta: { title: 'Chành', role: ['admin', 'quan_ly'] } },
      { path: 'doanh-nghiep', name: 'DoanhNghiep', component: () => import('../views/DoanhNghiepView.vue'), meta: { title: 'Doanh nghiệp', role: ['admin', 'quan_ly'] } },
      { path: 'thu-ho', name: 'ThuHo', component: () => import('../views/ThuHoView.vue'), meta: { title: 'Thu hộ (COD)', role: ['admin', 'quan_ly', 'staff'] } },
      { path: 'cuoc-nhan', name: 'CuocNhan', component: () => import('../views/CuocNhanView.vue'), meta: { title: 'Cước nhận', role: ['admin', 'quan_ly', 'staff'] } },
    ],
  },
  {
    path: '/scan',
    name: 'ScanHome',
    component: () => import('../views/ScanHomeView.vue'),
    meta: { public: true },
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
  // Catch-all: tất cả đường dẫn không khớp → trang 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { public: true },
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

    // Nếu user cần đổi MK lần đầu → bắt buộc đến /doi-mat-khau
    if (
      authStore.user?.require_password_change &&
      to.name !== 'ChangePassword'
    ) {
      return next('/doi-mat-khau');
    }

    // Role check
    const routeRole = to.meta.role;
    if (routeRole && !routeRole.includes(authStore.user.role)) {
      // [Fix #7] Đính kèm flag để HomeView hiển thị toast giải thích
      return next({ path: '/', query: { access_denied: '1' } });
    }
  }

  // If guest page and already logged in
  if (to.meta.guest && authStore.token) {
    return next('/');
  }

  next();
});

export default router;
