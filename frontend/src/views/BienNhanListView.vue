<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import StatusBadge from '../components/bien-nhan/StatusBadge.vue';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const router = useRouter();
const auth = useAuthStore();
const items = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const vanPhongs = ref([]);
const page = ref(1);
const limit = 20;
const selectedItems = ref([]);
const batchLoading = ref(false);

const filters = ref({
  search: '',
  trang_thai: null,
  vp_gui: null,
  vp_nhan: null,
  dateRange: null,
});

const trangThaiOptions = [
  { label: 'Tất cả', value: null },
  { label: 'Chờ vận chuyển', value: 'cho_vc' },
  { label: 'Đang vận chuyển', value: 'dang_vc' },
  { label: 'Đã đến kho', value: 'da_den_kho' },
  { label: 'Đã báo khách', value: 'da_bao_khach' },
  { label: 'Khách đã nhận', value: 'khach_da_nhan' },
];

let searchTimeout = null;

async function loadVanPhongs() {
  const { data: res } = await api.get('/van-phong?active=true');
  vanPhongs.value = [{ label: 'Tất cả văn phòng', value: null }, ...res.data.map((v) => ({ label: v.ten, value: v.id }))];
}

async function loadData() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit,
      search: filters.value.search || undefined,
      trang_thai: filters.value.trang_thai || undefined,
      vp_gui: filters.value.vp_gui || undefined,
      vp_nhan: filters.value.vp_nhan || undefined,
    };
    if (filters.value.dateRange?.[0]) {
      params.from = filters.value.dateRange[0].toISOString().split('T')[0];
    }
    if (filters.value.dateRange?.[1]) {
      params.to = filters.value.dateRange[1].toISOString().split('T')[0];
    }
    const { data: res } = await api.get('/bien-nhan', { params });
    items.value = res.data;
    totalRecords.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; loadData(); }, 300);
}

function onFilterChange() {
  page.value = 1;
  loadData();
}

function onPage(event) {
  page.value = event.page + 1;
  loadData();
}

function formatCurrency(val) {
  if (!val) return '—';
  return Number(val).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('vi-VN');
}

function openPDF(id) {
  window.open(`/bien-nhan/${id}/xem-pdf`, '_blank');
}

async function batchUpdateStatus(trang_thai) {
  if (!selectedItems.value.length) {
    toast.add({ severity: 'warn', summary: 'Chưa chọn', detail: 'Chọn ít nhất 1 biên nhận', life: 3000 });
    return;
  }
  batchLoading.value = true;
  try {
    const ids = selectedItems.value.map((i) => i.id);
    await api.patch('/bien-nhan/batch-trang-thai', { ids, trang_thai });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Đã cập nhật ${ids.length} biên nhận`, life: 3000 });
    selectedItems.value = [];
    await loadData();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: err.response?.data?.error?.message || 'Không thể cập nhật trạng thái', life: 5000 });
  } finally {
    batchLoading.value = false;
  }
}

watch(() => filters.value.search, onSearch);

onMounted(() => {
  loadVanPhongs();
  loadData();
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Biên nhận" icon="pi pi-file-edit">
      <template #actions>
        <Button
          v-if="selectedItems.length && auth.hasRole('admin', 'staff')"
          :label="`Gửi xe (${selectedItems.length})`"
          icon="pi pi-truck"
          severity="warn"
          size="small"
          :loading="batchLoading"
          @click="batchUpdateStatus('dang_vc')"
        />
        <Button
          v-if="auth.hasRole('admin', 'staff')"
          label="Tạo biên nhận"
          icon="pi pi-plus"
          size="small"
          @click="router.push('/bien-nhan/tao-moi')"
        />
      </template>
    </PageHeader>

    <div class="card">
      <!-- Compact Filters -->
      <div class="filter-bar">
        <InputText v-model="filters.search" placeholder="Tìm mã biên nhận, hàng, người gửi/nhận..." style="width: 290px;" />
        <Select v-model="filters.trang_thai" :options="trangThaiOptions" optionLabel="label" optionValue="value" placeholder="Trạng thái" @change="onFilterChange" style="width: 150px;" />
        <Select v-model="filters.vp_gui" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Văn phòng gửi" @change="onFilterChange" style="width: 175px;" />
        <Select v-model="filters.vp_nhan" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Văn phòng nhận" @change="onFilterChange" style="width: 175px;" />
        <DatePicker v-model="filters.dateRange" selectionMode="range" placeholder="Khoảng ngày" dateFormat="dd/mm/yy" @date-select="onFilterChange" showIcon style="width: 230px;" />
      </div>

      <DataTable
        v-model:selection="selectedItems"
        :value="items"
        :loading="loading"
        :totalRecords="totalRecords"
        :rows="limit"
        :lazy="true"
        paginator
        :first="(page - 1) * limit"
        @page="onPage"
        stripedRows
        size="small"
        responsiveLayout="scroll"
        dataKey="id"
      >
        <Column selectionMode="multiple" style="width: 32px;" />
        <Column field="ma_so" header="Mã biên nhận" style="width: 130px; font-weight: 700;" sortable />
        <Column header="Ngày" style="width: 75px;">
          <template #body="{ data }">{{ formatDate(data.ngay_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="width: 80px;">
          <template #body="{ data }">
            {{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}
          </template>
        </Column>
        <Column field="don_vi_gui" header="Người gửi">
          <template #body="{ data }">
            <span class="text-truncate" style="max-width: 160px; display: inline-block; vertical-align: middle;">{{ data.don_vi_gui || data.nguoi_gui || '—' }}</span>
          </template>
        </Column>
        <Column field="ten_hang_hoa" header="Hàng hóa">
          <template #body="{ data }">
            <span class="text-truncate" style="max-width: 160px; display: inline-block; vertical-align: middle;">{{ data.ten_hang_hoa }}</span>
          </template>
        </Column>
        <Column header="Cước" style="width: 90px; text-align: right;">
          <template #body="{ data }">{{ formatCurrency(data.gia_cuoc) }}</template>
        </Column>
        <Column header="Trạng thái" style="width: 145px;">
          <template #body="{ data }">
            <StatusBadge :value="data.trang_thai" type="trang_thai" />
          </template>
        </Column>
        <Column header="Thanh toán" style="width: 85px;">
          <template #body="{ data }">
            <StatusBadge :value="data.trang_thai_thu" type="thu" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-file-pdf" text rounded severity="danger" size="small" @click="openPDF(data.id)" v-tooltip.left="'In PDF'" />
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="router.push(`/bien-nhan/${data.id}/sua`)" v-tooltip.left="'Sửa'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
