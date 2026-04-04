<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const list = ref([]);
const totalRecords = ref(0);
const summary = ref({ tong_no: 0, so_cong_no: 0 });
const page = ref(1);
const limit = 20;
const loading = ref(false);
const filter = ref('chua_thu,qua_han');
const search = ref('');

// Payment dialog
const payDialogVisible = ref(false);
const payingItem = ref(null);
const payForm = ref({ hinh_thuc: 'tien_mat', ghi_chu: '' });

const filterOptions = [
  { label: 'Chưa thu & Quá hạn', value: 'chua_thu,qua_han' },
  { label: 'Chưa thu', value: 'chua_thu' },
  { label: 'Quá hạn', value: 'qua_han' },
  { label: 'Đã thu', value: 'da_thu' },
  { label: 'Tất cả', value: '' },
];

async function fetchData() {
  loading.value = true;
  try {
    const params = { page: page.value, limit };
    if (filter.value) params.trang_thai = filter.value;
    if (search.value) params.search = search.value;
    const res = await api.get('/cong-no', { params });
    list.value = res.data.data;
    totalRecords.value = res.data.pagination.total;
    summary.value = res.data.summary;
  } catch (err) { handleApiError(err, toast, 'Không thể tải danh sách công nợ'); }
  loading.value = false;
}

function openPay(row) {
  payingItem.value = row;
  payForm.value = { hinh_thuc: 'tien_mat', ghi_chu: '' };
  payDialogVisible.value = true;
}

async function confirmPay() {
  try {
    const res = await api.post(`/cong-no/${payingItem.value.id}/xac-nhan-thanh-toan`, payForm.value);
    toast.add({
      severity: 'success',
      summary: 'Đã xác nhận thanh toán',
      detail: `Phiếu thu ${res.data.data.phieu_thu.ma_phieu} đã được tạo`,
      life: 4000,
    });
    payDialogVisible.value = false;
    fetchData();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
}

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }
function fmtDate(dt) { return new Date(dt).toLocaleDateString('vi-VN'); }
function onPage(e) { page.value = Math.floor(e.first / limit) + 1; fetchData(); }

function statusSeverity(row) {
  if (row.trang_thai === 'da_thu') return 'success';
  if (row.qua_han) return 'danger';
  return 'warn';
}

function statusLabel(row) {
  if (row.trang_thai === 'da_thu') return 'Đã thu';
  if (row.qua_han) return `Quá hạn (${row.so_ngay} ngày)`;
  return 'Chưa thu';
}

onMounted(fetchData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Công nợ" icon="pi pi-chart-bar" />

    <!-- Summary -->
    <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
      <StatCard icon="pi pi-exclamation-triangle" label="Tổng nợ còn" :value="fmt(summary.tong_no) + 'đ'" gradient="orange" />
      <StatCard icon="pi pi-list" label="Số công nợ" :value="summary.so_cong_no" gradient="blue" />
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <Select v-model="filter" :options="filterOptions" optionLabel="label" optionValue="value"
        placeholder="Trạng thái" @change="fetchData" style="width: 190px;" />
      <InputText v-model="search" placeholder="Tìm theo biên nhận, đối tượng..." @keyup.enter="fetchData" style="width: 240px;" />
      <Button icon="pi pi-search" size="small" @click="fetchData" />
    </div>

    <div class="card">
      <DataTable :value="list" :loading="loading" :totalRecords="totalRecords" :rows="limit" :lazy="true"
        paginator :first="(page - 1) * limit" @page="onPage" stripedRows size="small" responsiveLayout="scroll"
        dataKey="id" :rowClass="(data) => data.qua_han ? 'row-overdue' : ''">
        <Column header="Biên nhận" style="width: 120px; font-weight: 700;">
          <template #body="{ data }">{{ data.bien_nhan?.ma_so }}</template>
        </Column>
        <Column field="doi_tuong" header="Đối tượng" />
        <Column header="Số tiền nợ" style="width: 110px; text-align: right;">
          <template #body="{ data }">
            <span :style="{ color: data.qua_han ? '#ef4444' : '#1e40af', fontWeight: 700 }">{{ fmt(data.so_tien_no) }}đ</span>
          </template>
        </Column>
        <Column header="Ngày phát sinh" style="width: 100px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_phat_sinh) }}</template>
        </Column>
        <Column header="Trạng thái" style="width: 130px;">
          <template #body="{ data }">
            <Tag :value="statusLabel(data)" :severity="statusSeverity(data)" />
          </template>
        </Column>
        <Column header="Phiếu thu" style="width: 100px;">
          <template #body="{ data }">{{ data.phieu_thu?.ma_phieu || '—' }}</template>
        </Column>
        <Column header="" style="width: 70px;">
          <template #body="{ data }">
            <Button v-if="data.trang_thai !== 'da_thu'" label="Thu" icon="pi pi-check" size="small"
              severity="success" @click="openPay(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Payment Dialog -->
    <Dialog v-model:visible="payDialogVisible" header="Xác nhận thanh toán" :modal="true" :style="{ width: '380px' }" class="compact-dialog">
      <div v-if="payingItem" style="margin-bottom: 0.75rem; font-size: 0.85rem;">
        <p><strong>Biên nhận:</strong> {{ payingItem.bien_nhan?.ma_so }}</p>
        <p><strong>Đối tượng:</strong> {{ payingItem.doi_tuong }}</p>
        <p><strong>Số tiền:</strong> <span style="color: #dc2626; font-weight: 700;">{{ fmt(payingItem.so_tien_no) }}đ</span></p>
      </div>
      <div class="form-grid-1">
        <div class="form-group">
          <label class="form-label">Hình thức</label>
          <Select v-model="payForm.hinh_thuc" :options="[{ label: 'Tiền mặt', value: 'tien_mat' }, { label: 'Chuyển khoản', value: 'chuyen_khoan' }]"
            optionLabel="label" optionValue="value" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Ghi chú</label>
          <InputText v-model="payForm.ghi_chu" placeholder="KH trả tại quầy..." fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="payDialogVisible = false" />
        <Button label="Xác nhận thu" severity="success" size="small" @click="confirmPay" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.row-overdue) { background-color: #fef2f2 !important; }
</style>
