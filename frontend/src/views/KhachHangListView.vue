<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();
const customers = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const search = ref('');
const page = ref(1);
const limit = 20;
let searchTimeout = null;

async function loadData() {
  loading.value = true;
  try {
    const { data: res } = await api.get('/khach-hang', {
      params: { search: search.value, page: page.value, limit },
    });
    customers.value = res.data;
    totalRecords.value = res.pagination.total;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách khách hàng');
  } finally {
    loading.value = false;
  }
}

async function toggleActive(row) {
  try {
    await api.patch(`/khach-hang/${row.id}/active`, { active: !row.active });
    toast.add({ severity: 'info', summary: row.active ? 'Đã ngừng KH' : 'Đã kích hoạt KH', life: 2000 });
    loadData();
  } catch (err) {
    handleApiError(err, toast, 'Không thể thay đổi trạng thái');
  }
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; loadData(); }, 300);
}

function onPage(event) {
  page.value = event.page + 1;
  loadData();
}

watch(search, onSearch);
onMounted(loadData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Khách hàng" icon="pi pi-users">
      <template #actions>
        <InputText v-model="search" placeholder="Tìm tên, SĐT, mã KH..." style="width: 220px;" />
        <Button label="Thêm KH" icon="pi pi-plus" size="small" @click="router.push('/khach-hang/them-moi')" />
      </template>
    </PageHeader>

    <div class="card">
      <DataTable
        :value="customers" :loading="loading" :totalRecords="totalRecords" :rows="limit" :lazy="true"
        paginator :first="(page - 1) * limit" @page="onPage" stripedRows size="small" responsiveLayout="scroll">
        <Column field="ma_kh" header="Mã KH" style="width: 85px;" />
        <Column field="loai_kh" header="Loại khách hàng" style="width: 120px;">
          <template #body="{ data }">
            <Tag :value="data.loai_kh === 'doanh_nghiep' ? 'Doanh nghiệp' : 'Cá nhân'" :severity="data.loai_kh === 'doanh_nghiep' ? 'info' : 'secondary'" />
          </template>
        </Column>
        <Column field="ten_don_vi" header="Tên đơn vị" />
        <Column field="nguoi_lien_he" header="Người liên hệ" />
        <Column field="dien_thoai" header="Số điện thoại" style="width: 120px;" />
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Ngừng'" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="router.push(`/khach-hang/${data.id}/sua`)" v-tooltip.left="'Sửa'" />
            <Button v-if="auth.isAdmin" :icon="data.active ? 'pi pi-ban' : 'pi pi-check-circle'" text rounded size="small"
              :severity="data.active ? 'warn' : 'success'" @click="toggleActive(data)"
              v-tooltip.left="data.active ? 'Ngừng' : 'Kích hoạt'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
