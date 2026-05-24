<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { use }            from 'echarts/core';
import { CanvasRenderer }  from 'echarts/renderers';
import { PieChart }        from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';

// Đăng ký các ECharts components cần thiết (bắt buộc với vue-echarts v6+)
use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent]);
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatDate, formatNumber } from '../utils/format';
import { downloadBase64File } from '../utils/file';

const toast = useToast();

// ─── Bảng kê công nợ tháng ────────────────────────────────────────────────
const bkThang = ref(new Date().getMonth() + 1);
const bkNam   = ref(new Date().getFullYear());
const bkData  = ref([]);
const bkTong  = ref(null);
const bkLoading   = ref(false);
const bkExporting = ref(false);

async function fetchBangKeThang() {
  bkLoading.value = true;
  try {
    const res = await api.get('/cong-no/bang-ke-thang', {
      params: { thang: bkThang.value, nam: bkNam.value },
    });
    bkData.value = res.data.data;
    bkTong.value = res.data.tong;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải bảng kê');
  }
  bkLoading.value = false;
}

async function exportBangKe(doiTuong = null) {
  bkExporting.value = true;
  try {
    const params = { thang: bkThang.value, nam: bkNam.value };
    if (doiTuong) params.doi_tuong = doiTuong;
    const res = await api.get('/cong-no/bang-ke-thang/export', { params });
    const { file } = res.data.data;
    downloadBase64File(file.base64, file.name);
    toast.add({ severity: 'success', summary: `Đã tải ${file.name}`, life: 3000 });
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xuất bảng kê');
  }
  bkExporting.value = false;
}

// ─── Dialog chi tiết đối tượng ────────────────────────────────────────────
const detailVisible  = ref(false);
const detailDoiTuong = ref('');
const detailItems    = ref([]);
const detailTong     = ref(null);
const pdfExporting   = ref(false);

async function openDetail(row) {
  detailDoiTuong.value = row.doi_tuong;
  detailTong.value = { tong: row.tong, da_thu: row.da_thu, con_no: row.con_no, so_cong_no: row.so_cong_no };
  try {
    const res = await api.get('/cong-no/report', {
      params: {
        doi_tuong: row.doi_tuong,
        from: `${bkNam.value}-${String(bkThang.value).padStart(2,'0')}-01`,
        to:   lastDayOfMonth(bkThang.value, bkNam.value),
      },
    });
    detailItems.value = res.data.data || [];
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải chi tiết');
    return;
  }
  detailVisible.value = true;
}

function lastDayOfMonth(m, y) {
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

async function exportDetailPDF() {
  pdfExporting.value = true;
  try {
    const res = await api.get('/cong-no/bang-ke-thang/export-pdf', {
      params: { thang: bkThang.value, nam: bkNam.value, doi_tuong: detailDoiTuong.value },
    });
    const { file } = res.data.data;
    downloadBase64File(file.base64, file.name);
    toast.add({ severity: 'success', summary: `Đã tải ${file.name}`, life: 3000 });
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xuất PDF');
  }
  pdfExporting.value = false;
}

// ─── Đối soát cước ────────────────────────────────────────────────────────
const dsThang   = ref(new Date().getMonth() + 1);
const dsNam     = ref(new Date().getFullYear());
const dsData    = ref([]);
const dsTongHop = ref(null);
const dsLoading = ref(false);

async function fetchDoiSoat() {
  dsLoading.value = true;
  try {
    const res = await api.get('/cong-no/doi-soat-chi-tiet', {
      params: { thang: dsThang.value, nam: dsNam.value },
    });
    dsData.value    = res.data.data || [];
    dsTongHop.value = res.data.tong_hop;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải đối soát');
  }
  dsLoading.value = false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

function fmtDate(d) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function downloadFile(binaryStr, filename, mimeType) {
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

// ─── Doughnut chart ──────────────────────────────────────────────────────
const doughnutOption = computed(() => {
  if (!bkTong.value) return null;
  const daThu = Number(bkTong.value.da_thu || 0);
  const conNo = Number(bkTong.value.con_no || 0);
  if (daThu + conNo === 0) return null;
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}đ ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      label: { show: false },
      data: [
        { value: daThu, name: 'Đã thu', itemStyle: { color: '#16a34a' } },
        { value: conNo, name: 'Còn nợ', itemStyle: { color: '#dc2626' } },
      ],
    }],
  };
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Bảng kê công nợ" icon="pi pi-chart-bar" />

    <!-- ══ PHẦN 1: Bảng kê tháng ══ -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="form-section-title">Bảng kê công nợ cuối tháng theo đối tượng</div>

      <div class="filter-section">
        <label>Tháng</label>
        <input type="number" v-model="bkThang" min="1" max="12" style="width:80px;" />
        <label class="filter-spacer">Năm</label>
        <input type="number" v-model="bkNam" min="2020" max="2030" style="width:80px;" />
        <Button label="Xem" icon="pi pi-search" style="margin-left: auto;" @click="fetchBangKeThang" :loading="bkLoading" />
        <Button v-if="bkData.length" label="Xuất tất cả (Excel)" icon="pi pi-file-excel" severity="success" :loading="bkExporting" @click="exportBangKe(null)" />
      </div>

      <!-- Stats + Doughnut -->
      <div v-if="bkTong" class="cn-stats-row">
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); flex: 1;">
          <StatCard icon="pi pi-wallet"               label="Tổng"    :value="fmt(bkTong.tong) + 'đ'"    variant="info" />
          <StatCard icon="pi pi-check-circle"         label="Đã thu"  :value="fmt(bkTong.da_thu) + 'đ'"  variant="success" />
          <StatCard icon="pi pi-exclamation-triangle" label="Còn nợ" :value="fmt(bkTong.con_no) + 'đ'" variant="danger" />
        </div>
        <div v-if="doughnutOption" class="cn-doughnut">
          <VChart :option="doughnutOption" autoresize style="height: 140px; width: 180px;" />
        </div>
      </div>

      <DataTable :value="bkData" :loading="bkLoading" stripedRows size="small" responsiveLayout="scroll">
        <template #empty>
          <div style="text-align:center; padding:2rem; color:var(--text-muted);">
            <i class="pi pi-inbox" style="font-size:1.5rem; opacity:.3;"></i>
            <p style="font-size:0.85rem;">Chọn tháng/năm rồi bấm "Xem" để tải bảng kê</p>
          </div>
        </template>

        <Column header="Đối tượng">
          <template #body="{ data }">
            <span class="dt-link" @click="openDetail(data)" :title="`Xem chi tiết ${data.doi_tuong}`">
              {{ data.doi_tuong }}
            </span>
          </template>
        </Column>

        <Column header="Số CN" style="width:70px; text-align:center;">
          <template #body="{ data }">
            <Tag :value="String(data.so_cong_no)" severity="info" />
          </template>
        </Column>

        <Column header="Tổng" style="width:130px; text-align:right;">
          <template #body="{ data }">{{ fmt(data.tong) }}đ</template>
        </Column>

        <Column header="Đã thu" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span class="text-success">{{ fmt(data.da_thu) }}đ</span>
          </template>
        </Column>

        <Column header="Còn nợ" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span :class="[data.con_no > 0 ? 'text-danger' : 'text-success', 'fw-700']">
              {{ fmt(data.con_no) }}đ
            </span>
          </template>
        </Column>

        <Column header="" style="width:110px; text-align:center;">
          <template #body="{ data }">
            <div style="display:flex; gap:4px; justify-content:center;">
              <Button icon="pi pi-eye"      text rounded severity="info"    size="small" @click="openDetail(data)"       v-tooltip.top="'Chi tiết'" />
              <Button icon="pi pi-download" text rounded severity="success" size="small" @click="exportBangKe(data.doi_tuong)" v-tooltip.top="'Xuất Excel'" />
            </div>
          </template>
        </Column>
      </DataTable>

      <div v-if="bkTong && bkData.length" class="summary-footer">
        <span>Tổng: {{ fmt(bkTong.tong) }}đ</span>
        <span class="text-success">Đã thu: {{ fmt(bkTong.da_thu) }}đ</span>
        <span class="text-danger">Còn nợ: {{ fmt(bkTong.con_no) }}đ</span>
      </div>
    </div>

    <!-- ══ PHẦN 2: Đối soát cước ══ -->
    <div class="card">
      <div class="form-section-title" style="display:flex; align-items:center; gap:0.5rem;">
        <i class="pi pi-shield text-warning"></i>
        Đối soát cước — Phát hiện bất thường HĐĐT
      </div>
      <p style="font-size:0.8rem; color:#64748b; margin-bottom:0.75rem;">
        So sánh cước thực tế gửi trong tháng với giá trị HĐĐT đã/đang xuất hoá đơn. Cảnh báo khi xuất HĐĐT cao hơn cước thực tế.
      </p>

      <div class="filter-section">
        <label>Tháng</label>
        <input type="number" v-model="dsThang" min="1" max="12" style="width:80px;" />
        <label class="filter-spacer">Năm</label>
        <input type="number" v-model="dsNam" min="2020" max="2030" style="width:80px;" />
        <Button label="Đối soát" icon="pi pi-search" style="margin-left: auto;" @click="fetchDoiSoat" :loading="dsLoading" severity="warn" />
      </div>

      <!-- Tổng hợp đối soát -->
      <div v-if="dsTongHop" class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 0.75rem;">
        <StatCard icon="pi pi-users"       label="Số đối tượng"   :value="fmt(dsTongHop.so_doi_tuong)"  variant="info" />
        <StatCard icon="pi pi-inbox"       label="Cước thực tế"   :value="fmt(dsTongHop.cuoc_thuc_te) + 'đ'" variant="success" />
        <StatCard icon="pi pi-file-check"  label="Cước HĐĐT"      :value="fmt(dsTongHop.cuoc_hddt) + 'đ'"    variant="gold" />
        <StatCard icon="pi pi-exclamation-triangle" label="Bất thường" :value="dsTongHop.so_bat_thuong + ' đối tượng'" variant="danger" />
      </div>

      <DataTable :value="dsData" :loading="dsLoading" stripedRows size="small"
        :rowClass="(row) => row.bat_thuong ? 'ds-row-alert' : ''">
        <template #empty>
          <div style="text-align:center; padding:2rem; color:var(--text-muted);">
            <i class="pi pi-shield" style="font-size:1.5rem; opacity:.3;"></i>
            <p style="font-size:0.85rem;">Chọn tháng/năm rồi bấm "Đối soát" để kiểm tra</p>
          </div>
        </template>

        <Column header="" style="width:30px; text-align:center;">
          <template #body="{ data }">
            <i v-if="data.bat_thuong" class="pi pi-exclamation-triangle text-danger" style="font-size:0.9rem;" v-tooltip.top="'Bất thường: HĐĐT cao hơn cước thực tế hoặc ít hàng nhưng hoá đơn lớn'" />
          </template>
        </Column>

        <Column field="doi_tuong" header="Đối tượng" style="font-weight:500;" />

        <Column header="Số BN" style="width:60px; text-align:center;">
          <template #body="{ data }">
            <Tag :value="String(data.so_bn)" :severity="data.so_bn <= 5 && data.cuoc_hddt > 1000000 ? 'danger' : 'info'" />
          </template>
        </Column>

        <Column header="Cước thực tế" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span style="font-weight:600;">{{ fmt(data.cuoc_thuc_te) }}đ</span>
          </template>
        </Column>

        <Column header="Cước HĐĐT" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span :class="[data.cuoc_hddt > data.cuoc_thuc_te ? 'text-danger' : 'text-success', 'fw-600']">
              {{ fmt(data.cuoc_hddt) }}đ
            </span>
          </template>
        </Column>

        <Column header="Chênh lệch" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span v-if="data.chenh_lech === 0" class="text-muted">0đ</span>
            <span v-else-if="data.chenh_lech > 0" class="text-danger fw-700">
              +{{ fmt(data.chenh_lech) }}đ ⚠️
            </span>
            <span v-else class="text-success">{{ fmt(data.chenh_lech) }}đ</span>
          </template>
        </Column>

        <Column header="BN có HĐĐT" style="width:90px; text-align:center;">
          <template #body="{ data }">
            <span class="text-muted" style="font-size:0.8rem;">{{ data.so_bn_hddt }}/{{ data.so_bn }}</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ══ DIALOG: Chi tiết công nợ đối tượng ══ -->
    <Dialog v-model:visible="detailVisible" :header="`Chi tiết công nợ — ${detailDoiTuong}`"
      :style="{ width: '800px' }" modal scrollable>

      <!-- Summary header inside dialog -->
      <div v-if="detailTong" class="summary-footer" style="margin-bottom:0.75rem;">
        <span>{{ detailTong.so_cong_no }} phiếu</span>
        <span>Tổng: {{ fmt(detailTong.tong) }}đ</span>
        <span class="text-success">Đã thu: {{ fmt(detailTong.da_thu) }}đ</span>
        <span class="text-danger">Còn nợ: {{ fmt(detailTong.con_no) }}đ</span>
      </div>

      <DataTable :value="detailItems" size="small" stripedRows>
        <Column header="STT" style="width:45px; text-align:center;">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>
        <Column header="Ngày" style="width:90px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_phat_sinh) }}</template>
        </Column>
        <Column header="Mã BN" style="width:110px; font-family:monospace;">
          <template #body="{ data }">{{ data.bien_nhan?.ma_so || '—' }}</template>
        </Column>
        <Column header="Hàng hoá">
          <template #body="{ data }">{{ data.bien_nhan?.ten_hang_hoa || '—' }}</template>
        </Column>
        <Column header="Số tiền" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span style="font-weight:600;">{{ fmt(data.so_tien_no) }}đ</span>
          </template>
        </Column>
        <Column header="Trạng thái" style="width:120px; text-align:center;">
          <template #body="{ data }">
            <Tag v-if="data.trang_thai === 'da_thu'" value="Đã thu"   severity="success" />
            <Tag v-else                              value="Chưa thu" severity="danger" />
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
          <Button label="Xuất PDF" icon="pi pi-file-pdf" severity="danger" :loading="pdfExporting" @click="exportDetailPDF" />
          <Button label="Xuất Excel" icon="pi pi-file-excel" severity="success" :loading="bkExporting"
            @click="exportBangKe(detailDoiTuong)" />
          <Button label="Đóng" icon="pi pi-times" severity="secondary" @click="detailVisible = false" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Stats + Doughnut row */
.cn-stats-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.cn-doughnut {
  flex-shrink: 0;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-base);
  padding: 0.25rem;
}

/* Summary footer */
.summary-footer {
  display: flex;
  gap: 1.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-sunken);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 700;
  border: 1px solid var(--border);
}

/* Đối tượng clickable */
.dt-link {
  color: var(--navy-400);
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dt-link:hover {
  color: var(--navy-600);
}

/* Hàng bất thường trong đối soát */
:deep(.ds-row-alert td) {
  background: var(--danger-light) !important;
}

:deep(.ds-row-alert:hover td) {
  background: #ffe4e4 !important;
}
</style>
