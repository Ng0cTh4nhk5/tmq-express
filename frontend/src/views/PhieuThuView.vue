<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const auth = useAuthStore();
const toast = useToast();
const list = ref([]);
const totalRecords = ref(0);
const page = ref(1);
const limit = 20;
const loading = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const search = ref('');

const form = ref({ doi_tuong: '', ly_do: '', so_tien: 0, hinh_thuc: 'tien_mat', bien_nhan_id: null });

const htOptions = [
  { label: 'Tiền mặt', value: 'tien_mat' },
  { label: 'Chuyển khoản', value: 'chuyen_khoan' },
];

async function fetchData() {
  loading.value = true;
  try {
    const params = { page: page.value, limit };
    if (search.value) params.search = search.value;
    const res = await api.get('/phieu-thu', { params });
    list.value = res.data.data;
    totalRecords.value = res.data.pagination.total;
  } catch (err) { handleApiError(err, toast, 'Không thể tải danh sách phiếu thu'); }
  loading.value = false;
}

function openNew() {
  form.value = { doi_tuong: '', ly_do: '', so_tien: 0, hinh_thuc: 'tien_mat', bien_nhan_id: null };
  editing.value = false;
  dialogVisible.value = true;
}

function openEdit(row) {
  form.value = { ...row, so_tien: Number(row.so_tien) };
  editing.value = true;
  dialogVisible.value = true;
}

async function save() {
  try {
    if (editing.value) {
      await api.put(`/phieu-thu/${form.value.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Đã cập nhật', life: 2000 });
    } else {
      await api.post('/phieu-thu', form.value);
      toast.add({ severity: 'success', summary: 'Đã tạo phiếu thu', life: 2000 });
    }
    dialogVisible.value = false;
    fetchData();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
}

async function huy(row) {
  if (!confirm(`Hủy phiếu ${row.ma_phieu}?`)) return;
  try {
    await api.patch(`/phieu-thu/${row.id}/huy`);
    toast.add({ severity: 'warn', summary: 'Đã hủy', life: 2000 });
    fetchData();
  } catch (err) { handleApiError(err, toast, 'Không thể hủy phiếu thu'); }
}

function openPDF(id) {
  api.get(`/phieu-thu/${id}/pdf-preview`).then(res => {
    const binaryStr = atob(res.data.data.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }).catch(() => {
    toast.add({ severity: 'error', summary: 'Lỗi tải PDF', life: 3000 });
  });
}

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }
function fmtDate(dt) { return new Date(dt).toLocaleDateString('vi-VN'); }
function onPage(e) { page.value = Math.floor(e.first / limit) + 1; fetchData(); }

onMounted(fetchData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Phiếu thu" icon="pi pi-wallet">
      <template #actions>
        <InputText v-model="search" placeholder="Tìm kiếm..." @keyup.enter="fetchData" style="width: 180px;" />
        <Button label="Tạo phiếu" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="card">
      <DataTable :value="list" :loading="loading" :totalRecords="totalRecords" :rows="limit" :lazy="true"
        paginator :first="(page - 1) * limit" @page="onPage" stripedRows size="small" responsiveLayout="scroll" dataKey="id">
        <Column field="ma_phieu" header="Số phiếu" style="width: 90px; font-weight: 700;" />
        <Column header="Ngày" style="width: 80px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_thu) }}</template>
        </Column>
        <Column field="doi_tuong" header="Đối tượng" />
        <Column field="ly_do" header="Lý do" />
        <Column header="Số tiền" style="width: 100px; text-align: right;">
          <template #body="{ data }"><span style="font-weight: 600; color: #059669;">{{ fmt(data.so_tien) }}đ</span></template>
        </Column>
        <Column header="Hình thức" style="width: 115px;">
          <template #body="{ data }">
            <Tag :value="data.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'" :severity="data.hinh_thuc === 'tien_mat' ? 'info' : 'success'" />
          </template>
        </Column>
        <Column header="Biên nhận" style="width: 100px;">
          <template #body="{ data }">{{ data.bien_nhan?.ma_so || '—' }}</template>
        </Column>
        <Column header="Nhân viên" style="width: 100px;">
          <template #body="{ data }">{{ data.nhan_vien?.ten }}</template>
        </Column>
        <Column header="" style="width: 90px;">
          <template #body="{ data }">
            <Button icon="pi pi-file-pdf" text rounded severity="danger" size="small" @click="openPDF(data.id)" v-tooltip.left="'PDF'" />
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" />
            <Button v-if="auth.isAdmin" icon="pi pi-times" text rounded severity="warn" size="small" @click="huy(data)" v-tooltip.left="'Hủy'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Sửa phiếu thu' : 'Lập phiếu thu'" :modal="true" :style="{ width: '420px' }" class="compact-dialog">
      <div class="form-grid-1">
        <div class="form-group">
          <label class="form-label">Đối tượng</label>
          <InputText v-model="form.doi_tuong" placeholder="Tên người nộp / công ty" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Lý do</label>
          <InputText v-model="form.ly_do" placeholder="Nội dung thu" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Số tiền (VNĐ)</label>
          <InputNumber v-model="form.so_tien" :min="0" mode="decimal" :useGrouping="true" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Hình thức</label>
          <Select v-model="form.hinh_thuc" :options="htOptions" optionLabel="label" optionValue="value" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="editing ? 'Cập nhật' : 'Lập phiếu'" size="small" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
