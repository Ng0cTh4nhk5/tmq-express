<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';

const toast = useToast();
const reportType = ref('doanh-thu');
const dateRange = ref(null);
const loading = ref(false);
const reportData = ref(null);
const summary = ref(null);

const reportOptions = [
  { label: 'Doanh thu', value: 'doanh-thu', icon: 'pi pi-chart-line' },
  { label: 'Sổ quỹ', value: 'so-quy', icon: 'pi pi-wallet' },
  { label: 'Biên nhận theo tuyến', value: 'bien-nhan', icon: 'pi pi-truck' },
  { label: 'Công nợ tổng hợp', value: 'cong-no', icon: 'pi pi-list' },
];

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }
function fmtDate(dt) { return new Date(dt).toLocaleDateString('vi-VN'); }

async function generate() {
  loading.value = true;
  reportData.value = null;
  summary.value = null;

  try {
    const params = {};
    if (dateRange.value?.[0]) params.from = dateRange.value[0].toISOString().slice(0, 10);
    if (dateRange.value?.[1]) params.to = dateRange.value[1].toISOString().slice(0, 10);

    const res = await api.get(`/bao-cao/${reportType.value}`, { params });
    const d = res.data.data;

    if (reportType.value === 'doanh-thu') {
      reportData.value = d.chi_tiet;
      summary.value = d.tong_hop;
    } else if (reportType.value === 'so-quy') {
      reportData.value = d;
      summary.value = d.tong_hop;
    } else if (reportType.value === 'bien-nhan') {
      reportData.value = d;
    } else if (reportType.value === 'cong-no') {
      reportData.value = d.chi_tiet;
      summary.value = d.tong_hop;
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.message, life: 3000 });
  }
  loading.value = false;
}
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Báo cáo" icon="pi pi-print" />

    <!-- Filters -->
    <div class="filter-bar">
      <Select v-model="reportType" :options="reportOptions" optionLabel="label" optionValue="value"
        style="width: 180px;" />
      <DatePicker v-model="dateRange" selectionMode="range" dateFormat="dd/mm/yy" placeholder="Khoảng ngày"
        showIcon style="width: 220px;" />
      <Button label="Xem báo cáo" icon="pi pi-search" size="small" :loading="loading" @click="generate" />
    </div>

    <!-- Summary -->
    <div v-if="summary" class="summary-bar">
      <template v-if="reportType === 'doanh-thu'">
        <span><strong>Tổng biên nhận:</strong> {{ summary.so_bn }}</span>
        <span><strong>Tổng cước:</strong> {{ fmt(summary.tong_cuoc) }}đ</span>
      </template>
      <template v-if="reportType === 'so-quy'">
        <span style="color: #22c55e;"><strong>Tổng thu:</strong> {{ fmt(summary.tong_thu) }}đ</span>
        <span style="color: #ef4444;"><strong>Tổng chi:</strong> {{ fmt(summary.tong_chi) }}đ</span>
        <span style="color: #1e40af;"><strong>Tồn quỹ:</strong> {{ fmt(summary.ton_quy) }}đ</span>
      </template>
      <template v-if="reportType === 'cong-no'">
        <span style="color: #ef4444;"><strong>Tổng nợ:</strong> {{ fmt(summary.tong_no) }}đ</span>
        <span><strong>Số công nợ:</strong> {{ summary.so_cong_no }}</span>
      </template>
    </div>

    <!-- Doanh thu -->
    <div class="card" v-if="reportType === 'doanh-thu' && reportData">
      <DataTable :value="reportData" stripedRows size="small" responsiveLayout="scroll"
        :paginator="reportData.length > 20" :rows="20" dataKey="ma_so">
        <Column field="ma_so" header="Mã biên nhận" style="width: 120px; font-weight: 700;" />
        <Column header="Ngày" style="width: 75px;"><template #body="{ data }">{{ fmtDate(data.ngay_nhan) }}</template></Column>
        <Column header="Tuyến" style="width: 75px;"><template #body="{ data }">{{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}</template></Column>
        <Column field="don_vi_gui" header="Người gửi" />
        <Column field="ten_hang_hoa" header="Hàng hóa" />
        <Column header="Cước" style="width: 90px; text-align: right;"><template #body="{ data }">{{ fmt(data.gia_cuoc) }}đ</template></Column>
        <Column header="Thu" style="width: 70px;">
          <template #body="{ data }">
            <Tag :value="data.trang_thai_thu === 'da_thu' ? 'Đã thu' : 'Chưa'" :severity="data.trang_thai_thu === 'da_thu' ? 'success' : 'warn'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Sổ quỹ -->
    <div v-if="reportType === 'so-quy' && reportData">
      <div class="card" style="margin-bottom: 0.75rem;">
        <h3 class="card-title" style="color: #22c55e; margin-bottom: 0.5rem;">Phiếu thu ({{ reportData.phieu_thu?.length || 0 }})</h3>
        <DataTable :value="reportData.phieu_thu" stripedRows size="small" :rows="20" :paginator="(reportData.phieu_thu?.length || 0) > 20">
          <Column field="ma_phieu" header="Số phiếu" style="font-weight: 700;" />
          <Column header="Ngày"><template #body="{ data }">{{ fmtDate(data.ngay_thu) }}</template></Column>
          <Column field="doi_tuong" header="Đối tượng" />
          <Column field="ly_do" header="Lý do" />
          <Column header="Số tiền" style="text-align: right; color: #22c55e; font-weight: 600;">
            <template #body="{ data }">+{{ fmt(data.so_tien) }}đ</template>
          </Column>
        </DataTable>
      </div>

      <div class="card">
        <h3 class="card-title" style="color: #ef4444; margin-bottom: 0.5rem;">Phiếu chi ({{ reportData.phieu_chi?.length || 0 }})</h3>
        <DataTable :value="reportData.phieu_chi" stripedRows size="small" :rows="20" :paginator="(reportData.phieu_chi?.length || 0) > 20">
          <Column field="ma_phieu" header="Số phiếu" style="font-weight: 700;" />
          <Column header="Ngày"><template #body="{ data }">{{ fmtDate(data.ngay_chi) }}</template></Column>
          <Column field="nguoi_nhan" header="Người nhận" />
          <Column field="ly_do" header="Lý do" />
          <Column header="Số tiền" style="text-align: right; color: #ef4444; font-weight: 600;">
            <template #body="{ data }">-{{ fmt(data.so_tien) }}đ</template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- BN theo tuyến -->
    <div class="card" v-if="reportType === 'bien-nhan' && reportData">
      <DataTable :value="reportData" stripedRows size="small">
        <Column field="tuyen" header="Tuyến" style="font-weight: 700;" />
        <Column field="so_bn" header="Số biên nhận" style="width: 100px; text-align: center;" />
        <Column header="Tổng cước" style="width: 110px; text-align: right;"><template #body="{ data }">{{ fmt(data.tong_cuoc) }}đ</template></Column>
        <Column field="da_giao" header="Đã giao" style="width: 80px; text-align: center;" />
        <Column header="Công nợ" style="width: 80px; text-align: center;">
          <template #body="{ data }">
            <Tag :value="String(data.cong_no)" :severity="data.cong_no > 0 ? 'warn' : 'success'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Công nợ -->
    <div class="card" v-if="reportType === 'cong-no' && reportData">
      <DataTable :value="reportData" stripedRows size="small" :paginator="reportData.length > 20" :rows="20">
        <Column header="Biên nhận" style="font-weight: 700;"><template #body="{ data }">{{ data.bien_nhan?.ma_so }}</template></Column>
        <Column field="doi_tuong" header="Đối tượng" />
        <Column header="Số nợ" style="text-align: right; color: #ef4444; font-weight: 700;">
          <template #body="{ data }">{{ fmt(data.so_tien_no) }}đ</template>
        </Column>
        <Column header="Ngày phát sinh"><template #body="{ data }">{{ fmtDate(data.ngay_phat_sinh) }}</template></Column>
        <Column header="Trạng thái">
          <template #body="{ data }">
            <Tag :value="data.trang_thai === 'da_thu' ? 'Đã thu' : 'Chưa thu'" :severity="data.trang_thai === 'da_thu' ? 'success' : 'warn'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Empty state -->
    <div v-if="!reportData && !loading" class="placeholder-view">
      <i class="pi pi-chart-bar"></i>
      <h2>Chọn loại báo cáo</h2>
      <p>Chọn loại báo cáo và ấn "Xem báo cáo" để bắt đầu</p>
    </div>
  </div>
</template>

<style scoped>
.summary-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-radius: var(--radius);
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}
</style>
