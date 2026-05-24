<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatPhone, stripPhone } from '../utils/phone';

const toast = useToast();
const confirm = useConfirm();
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
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách văn phòng');
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
  // Chỉ pick các field cần thiết, không spread toàn bộ object DB
  form.value = {
    id: vp.id,
    ma_vp: vp.ma_vp,
    ten: vp.ten,
    dia_chi: vp.dia_chi ?? '',
    dien_thoai: stripPhone(vp.dien_thoai),
  };
  isEdit.value = true;
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.ma_vp || !form.value.ten) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Mã văn phòng và Tên là bắt buộc', life: 3000 });
    return;
  }
  saving.value = true;
  // Lưu số điện thoại dưới dạng digits thuần (không format)
  const payload = { ...form.value, dien_thoai: stripPhone(form.value.dien_thoai) };
  try {
    if (isEdit.value) {
      await api.put(`/van-phong/${form.value.id}`, payload);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật văn phòng', life: 3000 });
    } else {
      await api.post('/van-phong', payload);
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

function confirmToggleActive(vp) {
  if (vp.active) {
    // Deactivate → cần confirm
    confirm.require({
      message: `Bạn có chắc muốn vô hiệu hóa văn phòng "${vp.ten}"?\nThao tác này sẽ bị từ chối nếu còn biên nhận đang xử lý hoặc nhân viên đang hoạt động.`,
      header: 'Xác nhận vô hiệu hóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Vô hiệu hóa',
      rejectLabel: 'Hủy',
      acceptClass: 'p-button-danger',
      accept: () => doToggleActive(vp),
    });
  } else {
    // Activate lại không cần confirm
    doToggleActive(vp);
  }
}

async function doToggleActive(vp) {
  const newActive = !vp.active;
  try {
    await api.patch(`/van-phong/${vp.id}/active`, { active: newActive });
    // Cập nhật sau khi API confirm thành công
    vp.active = newActive;
    toast.add({
      severity: newActive ? 'success' : 'warn',
      summary: 'Đã cập nhật',
      detail: newActive ? 'Kích hoạt văn phòng' : 'Vô hiệu hóa văn phòng',
      life: 2500,
    });
  } catch (err) {
    handleApiError(err, toast, 'Không thể thay đổi trạng thái VP');
    // Không cập nhật vp.active vì API đã thất bại
  }
}

onMounted(loadData);
</script>

<template>
  <div class="animate-fade-in">
    <!-- ConfirmDialog cần mount trong component dùng nó -->
    <ConfirmDialog />

    <PageHeader title="Quản lý Văn phòng" icon="pi pi-building">
      <template #actions>
        <Button label="Thêm văn phòng" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="card">
      <DataTable
        :value="vanPhongs"
        :loading="loading"
        stripedRows
        responsiveLayout="scroll"
        size="small"
        emptyMessage="Chưa có văn phòng nào."
      >
        <Column field="ma_vp" header="Mã VP" style="width: 100px;" sortable />
        <Column field="ten" header="Tên văn phòng" sortable />
        <Column field="dia_chi" header="Địa chỉ" />
        <Column header="Số điện thoại" style="width: 140px;">
          <template #body="{ data }">
            {{ formatPhone(data.dien_thoai) }}
          </template>
        </Column>
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Ngừng'" :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" />
            <Button
              :icon="data.active ? 'pi pi-ban' : 'pi pi-check'"
              text rounded size="small"
              :severity="data.active ? 'danger' : 'success'"
              v-tooltip.top="data.active ? 'Vô hiệu hóa' : 'Kích hoạt'"
              @click="confirmToggleActive(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? 'Sửa văn phòng' : 'Thêm văn phòng mới'"
      :style="{ width: '460px' }"
      modal
      class="compact-dialog"
    >
      <!-- Section: Thông tin cơ bản -->
      <div class="dialog-section-title">
        <i class="pi pi-building"></i> Thông tin văn phòng
      </div>
      <div class="form-grid-dialog">
        <div class="form-group">
          <label class="form-label">Mã văn phòng <span class="req">*</span></label>
          <InputText
            v-model="form.ma_vp"
            :disabled="isEdit"
            placeholder="VD: SG01, VL, CT"
            fluid
            spellcheck="false"
          />
          <small v-if="isEdit" class="field-hint">Không thể sửa mã văn phòng sau khi tạo.</small>
          <small v-else class="field-hint">Mã ngắn, viết hoa, dùng cho mã nhân viên và cấu hình.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Tên văn phòng <span class="req">*</span></label>
          <InputText
            v-model="form.ten"
            placeholder="VD: Văn phòng Vĩnh Long"
            fluid
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Section: Liên hệ -->
      <div class="dialog-section-title" style="margin-top: 1rem;">
        <i class="pi pi-phone"></i> Thông tin liên hệ
      </div>
      <div class="form-grid-dialog">
        <div class="form-group">
          <label class="form-label">Số điện thoại</label>
          <InputText
            v-model="form.dien_thoai"
            placeholder="VD: 0909123456"
            inputmode="tel"
            fluid
            spellcheck="false"
          />
          <small class="field-hint">Nhập số, tự động định dạng khi hiển thị.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText
            v-model="form.dia_chi"
            placeholder="Nhập địa chỉ văn phòng"
            fluid
            spellcheck="false"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo văn phòng'" icon="pi pi-check" size="small" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.dialog-section-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.form-grid-dialog {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary, #334155);
}

.req { color: #ef4444; }

.field-hint {
  color: #94a3b8;
  font-size: 0.7rem;
}
</style>
