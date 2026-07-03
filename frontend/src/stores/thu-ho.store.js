import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/client';

/**
 * Store lưu badge count và tổng hợp COD cho sidebar + ThuHoView.
 *
 * Badge sidebar = số BN đang ở trạng thái COD cần xử lý (cho_thu + da_thu_chanh).
 * TongHop = object từ /thu-ho/tong-hop — được cache ở store để tránh re-fetch.
 *
 * Đồng bộ qua 2 cơ chế:
 *  1. AppSidebar: gọi fetchCount() mỗi 60s
 *  2. ThuHoView.fetchData(): gọi setFromSummary() với summary từ response
 */
export const useThuHoStore = defineStore('thu-ho', () => {
  // Badge số đang cần xử lý (cho_thu + da_thu_chanh)
  const count   = ref(0);
  // Tổng hợp theo trạng thái COD (cache từ /thu-ho/tong-hop)
  const tongHop = ref(null);

  async function fetchCount() {
    try {
      const { data: res } = await api.get('/thu-ho/tong-hop');
      tongHop.value = res.data;
      // Badge = BN chờ xử lý COD
      const d = res.data ?? {};
      count.value = (d.cho_thu?.count ?? 0) + (d.da_thu_chanh?.count ?? 0);
    } catch (err) {
      console.warn('[ThuHoStore] fetchCount failed:', err.message);
    }
  }

  /**
   * Đặt count trực tiếp từ summary response của ThuHoView — tránh HTTP round-trip.
   * @param {object} summaryData - res.data.summary từ GET /thu-ho
   */
  function setFromSummary(summaryData) {
    if (!summaryData) return;
    const cho_thu      = summaryData.cho_thu?.count ?? 0;
    const da_thu_chanh = summaryData.da_thu_chanh?.count ?? 0;
    count.value = cho_thu + da_thu_chanh;
  }

  /**
   * Cập nhật tongHop từ response /thu-ho/tong-hop.
   * @param {object} tongHopData
   */
  function setTongHop(tongHopData) {
    tongHop.value = tongHopData;
    if (!tongHopData) return;
    count.value = (tongHopData.cho_thu?.count ?? 0) + (tongHopData.da_thu_chanh?.count ?? 0);
  }

  return { count, tongHop, fetchCount, setFromSummary, setTongHop };
});
