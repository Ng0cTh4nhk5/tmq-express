import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';

/**
 * Store lưu badge count cho Cước Nhận sidebar.
 *
 * Badge sidebar = số BN đang chờ thu cước (trang_thai_cuoc_nhan = 'cho_thu').
 * Đồng bộ qua 2 cơ chế:
 *  1. AppSidebar: gọi fetchCount() mỗi 60s
 *  2. CuocNhanView: gọi setCount() với summary từ response
 */
export const useCuocNhanStore = defineStore('cuoc-nhan', () => {
  // Badge = số BN chờ thu cước
  const count = ref(0);

  async function fetchCount() {
    try {
      const { data: res } = await api.get('/cuoc-nhan', {
        params: { limit: 1, page: 1 }, // chỉ cần pagination.total
      });
      count.value = res.pagination?.total ?? 0;
    } catch (err) {
      console.warn('[CuocNhanStore] fetchCount failed:', err.message);
    }
  }

  /**
   * Đặt count trực tiếp từ pagination response của CuocNhanView.
   * @param {number} total - pagination.total từ GET /cuoc-nhan
   */
  function setCount(total) {
    count.value = total ?? 0;
  }

  return { count, fetchCount, setCount };
});
