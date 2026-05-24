import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';
import { useAuthStore } from './auth.store';

/**
 * Store lưu số lượng biên nhận đang chờ giao xe tại VP Gửi.
 * Badge sidebar = số BN có trang_thai = 'cho_vc'.
 * Chỉ poll badge cho staff (admin không có VP mặc định → badge không áp dụng).
 */
export const useChoVanChuyenStore = defineStore('cho-van-chuyen', () => {
  const count = ref(0);
  // [V3-L1] count được cập nhật qua 2 cơ chế song song — cả 2 hướng về cùng 1 ref:
  //   1. AppSidebar: gọi fetchCount() mỗi 60s → HTTP GET /cho-van-chuyen?count_all=true
  //   2. ChoVanChuyenView.loadData(): gán trực tiếp choVcStore.count = res.stats.total
  // Cơ chế #2 nhanh hơn (không cần request riêng), #1 đảm bảo badge luôn đúng dù view chưa mở.

  async function fetchCount() {
    const auth = useAuthStore();
    if (!auth.isLoggedIn || !auth.userVanPhong) return;
    try {
      const { data: res } = await api.get('/bien-nhan/cho-van-chuyen', {
        params: { count_all: 'true' },
      });
      count.value = res.count ?? 0;
    } catch {
      // Silent fail — badge chỉ ẩn, không crash app
    }
  }

  return { count, fetchCount };
});
