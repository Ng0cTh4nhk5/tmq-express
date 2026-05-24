import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';
import { useAuthStore } from './auth.store';

/**
 * Store lưu số lượng biên nhận đang chờ xử lý tại VP nhận.
 * Badge sidebar = tổng 3 trạng thái: dang_vc + da_den_kho + da_bao_khach.
 *
 * [Fix #5 — Design decision] Badge CHỈ hoạt động với staff (có van_phong_id cố định).
 * Admin/accountant không có VP mặc định → badge sidebar không áp dụng (luôn ẩn).
 * Admin xem hàng đến bằng cách chọn VP thủ công trong HangDenView — không cần badge.
 * Nếu cần badge cho admin, phải truyền selectedVpNhan từ HangDenView vào store.
 */
export const useHangDenStore = defineStore('hang-den', () => {
  const count = ref(0); // tổng 3 tab
  const tabCounts = ref({ dang_vc: 0, da_den_kho: 0, da_bao_khach: 0 });

  async function fetchCount() {
    const auth = useAuthStore();
    if (!auth.isLoggedIn || !auth.userVanPhong) return;
    try {
      const { data: res } = await api.get('/bien-nhan/hang-den', { params: { count_all: 'true' } });
      // count_all=true → backend trả { success, tab_counts, total } — total ở root level (không phải res.stats.total)
      tabCounts.value = res.tab_counts ?? { dang_vc: 0, da_den_kho: 0, da_bao_khach: 0 };
      count.value = res.total ?? 0;
    } catch {
      // Silent fail — badge chỉ ẩn, không crash app
    }
  }

  /**
   * [N-L04] Update badge trực tiếp từ tab_counts đã có trong response API.
   * Dùng khi HangDenView đã có res.tab_counts — tránh HTTP round-trip fetchCount() thêm.
   * Đồng bộ với cách choVcStore.count được set trực tiếp từ ChoVanChuyenView.
   */
  function setFromTabCounts(newTabCounts) {
    if (!newTabCounts) return;
    tabCounts.value = newTabCounts;
    count.value = Object.values(newTabCounts).reduce((s, v) => s + v, 0);
  }

  return { count, tabCounts, fetchCount, setFromTabCounts };
});
