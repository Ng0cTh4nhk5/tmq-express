<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const vanPhongs = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({ ma_vp: '', ten: '', dia_chi: '', dien_thoai: '' });
const saving = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const { data: res } = await api.get('/van-phong');
    vanPhongs.value = res.data;
  } finally {
    loading.value = false;
  }
}

function openNew() {
  form.value = { ma_vp: '', ten: '', dia_chi: '', dien_thoai: '' };
  isEdit.value = false;
  dialogVisible.value = true;
}

function openEdit(vp) {
  form.value = { ...vp };
  isEdit.value = true;
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.ma_vp || !form.value.ten) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Mã văn phòng và Tên là bắt buộc', life: 3000 });
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await api.put(`/van-phong/${form.value.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật văn phòng', life: 3000 });
    } else {
      await api.post('/van-phong', form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Tạo văn phòng mới', life: 3000 });
    }
    dialogVisible.value = false;
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu văn phòng');
  } finally {
    saving.value = false;
  }
}

async function toggleActive(vp) {
  try {
    await api.patch(`/van-phong/${vp.id}/active`, { active: !vp.active });
    vp.active = !vp.active;
    toast.add({ severity: 'info', summary: 'Đã cập nhật', detail: vp.active ? 'Kích hoạt văn phòng' : 'Vô hiệu hóa văn phòng', life: 2000 });
  } catch (err) {
    handleApiError(err, toast, 'Không thể thay đổi trạng thái VP');
  }
}

onMounted(loadData);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Quản lý Văn phòng" icon="pi pi-building">
      <template #actions>
        <Button label="Thêm văn phòng" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="card">
      <DataTable :value="vanPhongs" :loading="loading" stripedRows responsiveLayout="scroll" size="small">
        <Column field="ma_vp" header="Mã văn phòng" style="width: 110px;" sortable />
        <Column field="ten" header="Tên văn phòng" sortable />
        <Column field="dia_chi" header="Địa chỉ" />
        <Column field="dien_thoai" header="Số điện thoại" style="width: 130px;" />
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Ngừng'" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" />
            <Button :icon="data.active ? 'pi pi-ban' : 'pi pi-check'" text rounded size="small" :severity="data.active ? 'danger' : 'success'" @click="toggleActive(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="isEdit ? 'Sửa văn phòng' : 'Thêm văn phòng'" :style="{ width: '420px' }" modal class="compact-dialog">
      <div class="form-grid-1">
        <div class="form-group">
          <label class="form-label">Mã văn phòng</label>
          <InputText v-model="form.ma_vp" :disabled="isEdit" placeholder="VD: VL" fluid />
          <small v-if="isEdit" style="color: var(--text-muted); font-size: 0.7rem;">Không thể sửa mã văn phòng</small>
        </div>
        <div class="form-group">
          <label class="form-label">Tên văn phòng</label>
          <InputText v-model="form.ten" placeholder="VD: VP Vĩnh Long" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="form.dia_chi" placeholder="Nhập địa chỉ" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Điện thoại</label>
          <InputText v-model="form.dien_thoai" placeholder="Nhập số điện thoại" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo mới'" icon="pi pi-check" size="small" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
