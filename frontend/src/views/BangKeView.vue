<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const tab = ref('pending');
const pendingList = ref([]);
const historyList = ref([]);
const selectedBNs = ref([]);
const loading = ref(false);
const exporting = ref(false);

async function fetchPending() {
  loading.value = true;
  try {
    const res = await api.get('/bang-ke/bien-nhan-cho');
    pendingList.value = res.data.data;
  } catch (err) { handleApiError(err, toast, 'Không thể tải danh sách BN chờ'); }
  loading.value = false;
}

async function fetchHistory() {
  loading.value = true;
  try {
    const res = await api.get('/bang-ke?limit=50');
    historyList.value = res.data.data;
  } catch (err) { handleApiError(err, toast, 'Không thể tải lịch sử bảng kê'); }
  loading.value = false;
}

async function exportBangKe() {
  if (!selectedBNs.value.length) {
    toast.add({ severity: 'warn', summary: 'Chọn ít nhất 1 biên nhận', life: 2000 });
    return;
  }
  exporting.value = true;
  try {
    const ids = selectedBNs.value.map(bn => bn.id);
    const res = await api.post('/bang-ke', { bien_nhan_ids: ids });
    const { bang_ke, file } = res.data.data;
    downloadBase64File(file.base64, file.name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast.add({ severity: 'success', summary: `Đã xuất ${bang_ke.ma_bang_ke}`, detail: `${bang_ke.so_bien_nhan} biên nhận`, life: 4000 });
    selectedBNs.value = [];
    fetchPending();
    fetchHistory();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
  exporting.value = false;
}

async function redownload(bk) {
  try {
    const res = await api.get(`/bang-ke/${bk.id}/download`);
    const { file } = res.data.data;
    downloadBase64File(file.base64, file.name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (err) {
    handleApiError(err, toast, 'Lỗi tải file excel');
  }
}

function downloadBase64File(base64, filename, mime) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }
function fmtDate(dt) { return new Date(dt).toLocaleDateString('vi-VN'); }

onMounted(() => { fetchPending(); fetchHistory(); });
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Bảng kê hóa đơn điện tử" icon="pi pi-file-excel">
      <template #actions>
        <Button v-if="tab === 'pending' && selectedBNs.length" :label="`Xuất bảng kê (${selectedBNs.length})`"
          icon="pi pi-file-excel" severity="success" size="small" :loading="exporting" @click="exportBangKe" />
      </template>
    </PageHeader>

    <!-- Tab buttons -->
    <div style="display: flex; gap: 0.4rem; margin-bottom: 0.75rem;">
      <Button :label="`Biên nhận chờ (${pendingList.length})`" size="small" :severity="tab === 'pending' ? undefined : 'secondary'"
        :outlined="tab !== 'pending'" @click="tab = 'pending'" />
      <Button :label="`Lịch sử (${historyList.length})`" size="small" :severity="tab === 'history' ? undefined : 'secondary'"
        :outlined="tab !== 'history'" @click="tab = 'history'" />
    </div>

    <!-- Pending Tab -->
    <div class="card" v-if="tab === 'pending'">
      <DataTable :value="pendingList" :loading="loading" v-model:selection="selectedBNs" stripedRows size="small"
        responsiveLayout="scroll" dataKey="id">
        <Column selectionMode="multiple" style="width: 32px;" />
        <Column field="ma_so" header="Mã biên nhận" style="width: 120px; font-weight: 700;" />
        <Column header="Ngày" style="width: 75px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="width: 80px;">
          <template #body="{ data }">{{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}</template>
        </Column>
        <Column field="don_vi_gui" header="Người gửi" />
        <Column field="ten_hang_hoa" header="Hàng hóa" />
        <Column header="Cước" style="width: 90px; text-align: right;">
          <template #body="{ data }">{{ fmt(data.gia_cuoc) }}đ</template>
        </Column>
      </DataTable>
    </div>

    <!-- History Tab -->
    <div class="card" v-if="tab === 'history'">
      <DataTable :value="historyList" :loading="loading" stripedRows size="small" responsiveLayout="scroll" dataKey="id">
        <Column field="ma_bang_ke" header="Mã bảng kê" style="width: 120px; font-weight: 700;" />
        <Column header="Ngày xuất" style="width: 90px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_xuat) }}</template>
        </Column>
        <Column header="Số biên nhận" style="width: 100px; text-align: center;">
          <template #body="{ data }">
            <Tag :value="String(data.so_bien_nhan)" severity="info" />
          </template>
        </Column>
        <Column header="Tổng cước" style="width: 110px; text-align: right;">
          <template #body="{ data }">{{ fmt(data.tong_cuoc) }}đ</template>
        </Column>
        <Column field="ten_file" header="File" />
        <Column header="" style="width: 60px;">
          <template #body="{ data }">
            <Button icon="pi pi-download" text rounded severity="info" size="small" @click="redownload(data)" v-tooltip.left="'Tải lại'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
