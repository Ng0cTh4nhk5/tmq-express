<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Tabs from 'primevue/tabs';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatPhone } from '../utils/format';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const allCustomers = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const search = ref('');
const page = ref(1);
const limit = 20;
const activeTab = ref('all'); // 'all' | 'doanh_nghiep' | 'ca_nhan'
let searchTimeout = null;

const loaiKhFilter = computed(() => {
  if (activeTab.value === 'doanh_nghiep') return 'doanh_nghiep';
  if (activeTab.value === 'ca_nhan') return 'ca_nhan';
  return undefined;
});

async function loadData() {
  loading.value = true;
  try {
    const params = { search: search.value, page: page.value, limit };
    if (loaiKhFilter.value) params.loai_kh = loaiKhFilter.value;

    const { data: res } = await api.get('/khach-hang', { params });
    allCustomers.value = res.data;
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

function onTabChange() {
  page.value = 1;
  loadData();
}

watch(search, onSearch);
watch(activeTab, onTabChange);
onMounted(loadData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Khách hàng" icon="pi pi-users">
      <template #actions>
        <InputText v-model="search" placeholder="Tìm tên, SĐT, mã KH..." style="width: 220px;" />
        <Button
          label="Thêm khách hàng mới"
          icon="pi pi-plus"
          size="small"
          @click="router.push('/khach-hang/them-moi')"
        />
      </template>
    </PageHeader>

    <!-- Tab DN / CN -->
    <Tabs v-model:value="activeTab" class="kh-tabs">
      <TabList>
        <Tab value="all">Tất cả</Tab>
        <Tab value="doanh_nghiep">
          <i class="pi pi-building" style="margin-right: 0.4rem;"></i>Doanh nghiệp
        </Tab>
        <Tab value="ca_nhan">
          <i class="pi pi-user" style="margin-right: 0.4rem;"></i>Cá nhân
        </Tab>
      </TabList>
    </Tabs>

    <div class="card" style="margin-top: 0; border-top-left-radius: 0; border-top-right-radius: 0;">
      <DataTable
        :value="allCustomers"
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
      >
        <Column field="ma_kh" header="Mã KH" style="width: 85px;" />
        <Column header="Loại" style="width: 110px;">
          <template #body="{ data }">
            <Tag
              :value="data.loai_kh === 'doanh_nghiep' ? 'Doanh nghiệp' : 'Cá nhân'"
              :severity="data.loai_kh === 'doanh_nghiep' ? 'info' : 'secondary'"
            />
          </template>
        </Column>
        <Column field="ten_don_vi" header="Tên đơn vị / Họ tên" />
        <Column field="nguoi_lien_he" header="Người liên hệ" style="width: 160px;" />
        <Column header="Số điện thoại" style="width: 130px;">
          <template #body="{ data }">{{ formatPhone(data.dien_thoai) }}</template>
        </Column>
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Ngừng'" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button
              icon="pi pi-pencil"
              text rounded severity="info" size="small"
              @click="router.push(`/khach-hang/${data.id}/sua`)"
              v-tooltip.left="'Sửa'"
            />
            <Button
              v-if="auth.isAdmin"
              :icon="data.active ? 'pi pi-ban' : 'pi pi-check-circle'"
              text rounded size="small"
              :severity="data.active ? 'warn' : 'success'"
              @click="toggleActive(data)"
              v-tooltip.left="data.active ? 'Ngừng' : 'Kích hoạt'"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.kh-tabs {
  margin-bottom: 0;
}

/* Gắn tab liền với card bên dưới */
:deep(.p-tablist) {
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  background: var(--bg-card, #fff);
  padding: 0.5rem 0.75rem 0;
  border: 1px solid var(--border, #e2e8f0);
  border-bottom: none;
}
</style>
