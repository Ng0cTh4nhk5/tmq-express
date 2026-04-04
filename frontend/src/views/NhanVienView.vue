<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const list = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const vanPhongs = ref([]);

const form = ref({ ma_nv: '', ten: '', username: '', password: '', role: 'staff', van_phong_id: null });

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Nhân viên', value: 'staff' },
  { label: 'Kế toán', value: 'accountant' },
];

async function fetchData() {
  loading.value = true;
  try {
    const [nvRes, vpRes] = await Promise.all([
      api.get('/nhan-vien?limit=100'),
      api.get('/van-phong'),
    ]);
    list.value = nvRes.data.data;
    vanPhongs.value = vpRes.data.data.map(vp => ({ label: `${vp.ma_vp} - ${vp.ten}`, value: vp.id }));
  } catch (err) { handleApiError(err, toast, 'Không thể tải danh sách nhân viên'); }
  loading.value = false;
}

function openNew() {
  form.value = { ma_nv: '', ten: '', username: '', password: '', role: 'staff', van_phong_id: null };
  editing.value = false;
  dialogVisible.value = true;
}

function openEdit(row) {
  form.value = { ...row, van_phong_id: row.van_phong.id, password: '' };
  editing.value = true;
  dialogVisible.value = true;
}

async function save() {
  try {
    if (editing.value) {
      await api.put(`/nhan-vien/${form.value.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Đã cập nhật', life: 2000 });
    } else {
      await api.post('/nhan-vien', form.value);
      toast.add({ severity: 'success', summary: 'Đã thêm nhân viên', life: 2000 });
    }
    dialogVisible.value = false;
    fetchData();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
}

async function toggleActive(row) {
  try {
    await api.patch(`/nhan-vien/${row.id}/active`, { active: !row.active });
    toast.add({ severity: 'info', summary: row.active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt', life: 2000 });
    fetchData();
  } catch (err) { handleApiError(err, toast, 'Không thể thay đổi trạng thái'); }
}

async function resetPw(row) {
  if (!confirm(`Reset mật khẩu cho ${row.ten}?`)) return;
  try {
    const res = await api.post(`/nhan-vien/${row.id}/reset-password`);
    const tempPw = res.data.data.tempPassword;
    toast.add({
      severity: 'success',
      summary: 'Đã reset mật khẩu',
      detail: `Mật khẩu tạm: ${tempPw} — Hãy ghi lại và gửi cho nhân viên`,
      life: 15000,
    });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
}

function roleSeverity(role) {
  return role === 'admin' ? 'danger' : role === 'accountant' ? 'warn' : 'info';
}

onMounted(fetchData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Nhân viên" icon="pi pi-id-card">
      <template #actions>
        <Button label="Thêm nhân viên" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="card">
      <DataTable :value="list" :loading="loading" stripedRows size="small" responsiveLayout="scroll" dataKey="id">
        <Column field="ma_nv" header="Mã nhân viên" style="width: 120px; font-weight: 700;" />
        <Column field="ten" header="Họ tên" />
        <Column field="username" header="Username" style="width: 100px;" />
        <Column header="Vai trò" style="width: 90px;">
          <template #body="{ data }">
            <Tag :value="data.role" :severity="roleSeverity(data.role)" />
          </template>
        </Column>
        <Column header="Văn phòng" style="width: 120px;">
          <template #body="{ data }">{{ data.van_phong?.ten }}</template>
        </Column>
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Khóa'" :severity="data.active ? 'success' : 'secondary'" />
          </template>
        </Column>
        <Column header="" style="width: 100px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" />
            <Button icon="pi pi-key" text rounded severity="warn" size="small" @click="resetPw(data)" v-tooltip.left="'Khôi phục mật khẩu'" />
            <Button :icon="data.active ? 'pi pi-lock' : 'pi pi-lock-open'" text rounded size="small" :severity="data.active ? 'secondary' : 'success'" @click="toggleActive(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Sửa nhân viên' : 'Thêm nhân viên'" :modal="true" :style="{ width: '400px' }" class="compact-dialog">
      <div class="form-grid-1">
        <div class="form-group">
          <label class="form-label">Mã nhân viên</label>
          <InputText v-model="form.ma_nv" :disabled="editing" placeholder="NV-SG-001" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Họ tên</label>
          <InputText v-model="form.ten" placeholder="Nguyễn Văn A" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <InputText v-model="form.username" :disabled="editing" placeholder="nva" fluid />
        </div>
        <div class="form-group" v-if="!editing">
          <label class="form-label">Mật khẩu</label>
          <InputText v-model="form.password" type="password" placeholder="≥ 6 ký tự" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Vai trò</label>
          <Select v-model="form.role" :options="roleOptions" optionLabel="label" optionValue="value" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Văn phòng</label>
          <Select v-model="form.van_phong_id" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="editing ? 'Cập nhật' : 'Thêm'" size="small" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
