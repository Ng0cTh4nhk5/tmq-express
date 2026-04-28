<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const chanhs = ref([]);
const vanPhongs = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);

const form = ref({
  ten: '',
  dia_chi: '',
  dien_thoai: '',
  nguoi_lien_he: '',
  van_phong_id: null,
  ghi_chu: '',
});

// Filter
const filterVP = ref(null);

async function loadVanPhongs() {
  try {
    const { data: res } = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.map(vp => ({ label: `${vp.ma_vp} — ${vp.ten}`, value: vp.id }));
  } catch (err) {
    handleApiError(err, toast, 'Lỗi tải danh sách VP');
  }
}

async function loadData() {
  loading.value = true;
  try {
    const params = {};
    if (filterVP.value) params.van_phong_id = filterVP.value;
    const { data: res } = await api.get('/chanh', { params });
    chanhs.value = res.data;
  } catch (err) {
    handleApiError(err, toast, 'Lỗi tải danh sách chành');
  } finally {
    loading.value = false;
  }
}

function openNew() {
  form.value = { ten: '', dia_chi: '', dien_thoai: '', nguoi_lien_he: '', van_phong_id: null, ghi_chu: '' };
  isEdit.value = false;
  dialogVisible.value = true;
}

function openEdit(row) {
  form.value = {
    id: row.id,
    ten: row.ten,
    dia_chi: row.dia_chi || '',
    dien_thoai: row.dien_thoai || '',
    nguoi_lien_he: row.nguoi_lien_he || '',
    van_phong_id: row.van_phong_id,
    ghi_chu: row.ghi_chu || '',
  };
  isEdit.value = true;
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.ten?.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Tên chành là bắt buộc', life: 3000 });
    return;
  }
  if (!form.value.van_phong_id) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Chọn văn phòng quản lý', life: 3000 });
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await api.put(`/chanh/${form.value.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật chành', life: 3000 });
    } else {
      await api.post('/chanh', form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Tạo chành mới', life: 3000 });
    }
    dialogVisible.value = false;
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu chành');
  } finally {
    saving.value = false;
  }
}

async function toggleActive(row) {
  try {
    await api.patch(`/chanh/${row.id}/active`, { active: !row.active });
    row.active = !row.active;
    toast.add({
      severity: 'info',
      summary: 'Đã cập nhật',
      detail: row.active ? 'Kích hoạt chành' : 'Vô hiệu hóa chành',
      life: 2000,
    });
  } catch (err) {
    handleApiError(err, toast, 'Không thể thay đổi trạng thái');
  }
}

onMounted(() => {
  loadVanPhongs();
  loadData();
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Quản lý Chành" icon="pi pi-map-marker">
      <template #actions>
        <Button label="Thêm chành" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <!-- Filter -->
    <div class="filter-bar">
      <Select
        v-model="filterVP"
        :options="[{ label: 'Tất cả VP', value: null }, ...vanPhongs]"
        optionLabel="label"
        optionValue="value"
        placeholder="Lọc theo văn phòng"
        @change="loadData"
        style="width: 220px;"
      />
      <Button icon="pi pi-refresh" text rounded size="small" @click="loadData" v-tooltip.top="'Tải lại'" />
    </div>

    <div class="card">
      <DataTable :value="chanhs" :loading="loading" stripedRows responsiveLayout="scroll" size="small" dataKey="id">
        <Column header="STT" style="width: 40px; text-align: center;">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>
        <Column field="ten" header="Tên chành" sortable>
          <template #body="{ data }">
            <span style="font-weight: 600;">{{ data.ten }}</span>
          </template>
        </Column>
        <Column header="Văn phòng" style="width: 120px;">
          <template #body="{ data }">
            <Tag :value="data.van_phong?.ma_vp" severity="info" />
          </template>
        </Column>
        <Column field="dia_chi" header="Địa chỉ" />
        <Column field="dien_thoai" header="Điện thoại" style="width: 120px;" />
        <Column field="nguoi_lien_he" header="Liên hệ" style="width: 130px;" />
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Ngừng'" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" v-tooltip.left="'Sửa'" />
            <Button
              :icon="data.active ? 'pi pi-ban' : 'pi pi-check'"
              text rounded size="small"
              :severity="data.active ? 'danger' : 'success'"
              @click="toggleActive(data)"
              v-tooltip.left="data.active ? 'Vô hiệu' : 'Kích hoạt'"
            />
          </template>
        </Column>

        <template #empty>
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="pi pi-map-marker" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            <p>Chưa có chành nào. Bấm <strong>"Thêm chành"</strong> để bắt đầu.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? 'Sửa chành' : 'Thêm chành mới'"
      :style="{ width: '480px' }"
      modal
      class="compact-dialog"
    >
      <div class="form-grid-1">
        <div class="form-group">
          <label class="form-label">Tên chành <span style="color: #ef4444;">*</span></label>
          <InputText v-model="form.ten" placeholder="VD: Chành Miền Tây - Q.Bình Thạnh" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Văn phòng quản lý <span style="color: #ef4444;">*</span></label>
          <Select v-model="form.van_phong_id" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="form.dia_chi" placeholder="Nhập địa chỉ chành" fluid />
        </div>
        <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label class="form-label">Điện thoại</label>
            <InputText v-model="form.dien_thoai" placeholder="Số ĐT liên hệ" fluid />
          </div>
          <div class="form-group">
            <label class="form-label">Người liên hệ</label>
            <InputText v-model="form.nguoi_lien_he" placeholder="Tên người LH" fluid />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ghi chú</label>
          <Textarea v-model="form.ghi_chu" rows="2" placeholder="Ghi chú thêm (giờ nhận hàng, khu vực...)" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo mới'" icon="pi pi-check" size="small" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
