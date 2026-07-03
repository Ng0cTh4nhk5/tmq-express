import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';
import { useAuthStore } from './auth.store';

/**
 * Store lưu số lượng biên nhận đang chờ xử lý tại VP nhận.
 * Badge sidebar = tổng các tab active + pending của da_giao_chanh.
 * (da_giao_chanh: chỉ tính BN còn COD/cước chưa xử lý, không tính đã hoàn tất)
 *
 * [Fix #5 — Design decision] Badge CHỈ hoạt động với staff (có van_phong_id cố định).
 * Admin/accountant không có VP mặc định → badge sidebar không áp dụng (luôn ẩn).
 */
export const useHangDenStore = defineStore('hang-den', () => {
  const count = ref(0); // tổng các tab (da_giao_chanh chỉ tính pending)
  const tabCounts = ref({ dang_vc: 0, da_den_kho: 0, da_bao_khach: 0 });
  // [Fix #7] Count riêng cho da_giao_chanh — chỉ BN còn tiền chưa xử lý
  const chanhPending = ref(0);

  async function fetchCount() {
    const auth = useAuthStore();
    if (!auth.isLoggedIn || !auth.userVanPhong) return;
    try {
      const { data: res } = await api.get('/bien-nhan/hang-den', { params: { count_all: 'true' } });
      tabCounts.value = res.tab_counts ?? { dang_vc: 0, da_den_kho: 0, da_bao_khach: 0 };
      // [Fix #7] Lưu pending riêng; tính count = tổng tab (trừ da_giao_chanh) + pending
      chanhPending.value = res.da_giao_chanh_pending ?? res.tab_counts?.da_giao_chanh ?? 0;
      const tabTotal = Object.entries(res.tab_counts ?? {}).reduce((s, [k, v]) =>
        k === 'da_giao_chanh' ? s : s + v, 0);
      count.value = tabTotal + chanhPending.value;
    } catch (err) {
      console.warn('[HangDenStore] fetchCount failed:', err.message);
    }
  }

  /**
   * [N-L04] Update badge trực tiếp từ tab_counts đã có trong response API.
   * Dùng khi HangDenView đã có res.tab_counts — tránh HTTP round-trip fetchCount() thêm.
   */
  function setFromTabCounts(newTabCounts, newChanhPending) {
    if (!newTabCounts) return;
    tabCounts.value = newTabCounts;
    // [Fix #7] Dùng pending chành thực tế thay vì total da_giao_chanh
    const pending = newChanhPending ?? newTabCounts.da_giao_chanh ?? 0;
    chanhPending.value = pending;
    const tabTotal = Object.entries(newTabCounts).reduce((s, [k, v]) =>
      k === 'da_giao_chanh' ? s : s + v, 0);
    count.value = tabTotal + pending;
  }

  return { count, tabCounts, chanhPending, fetchCount, setFromTabCounts };
});
