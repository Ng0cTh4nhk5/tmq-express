<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatPhone } from '../utils/format';

// ============================================================================
// MARK: - STATE VARIABLES
// ============================================================================
const toast = useToast();
const chanhs = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);

const form = ref({
  ten: '',
  dia_chi: '',
  dien_thoai: '',
  nguoi_lien_he: '',
  ghi_chu: '',
});

// ============================================================================
// MARK: - API: FETCH DATA
// ============================================================================
async function loadData() {
  loading.value = true;
  try {
    const { data: res } = await api.get('/chanh');
    chanhs.value = res.data;
  } catch (err) {
    handleApiError(err, toast, 'Lỗi tải danh sách chành');
  } finally {
    loading.value = false;
  }
}

// ============================================================================
// MARK: - ACTIONS
// ============================================================================
function openNew() {
  form.value = { ten: '', dia_chi: '', dien_thoai: '', nguoi_lien_he: '', ghi_chu: '' };
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

// ============================================================================
// MARK: - LIFECYCLE
// ============================================================================
onMounted(() => {
  loadData();
});
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & TOOLBAR                                              -->
  <!-- ===================================================================== -->
  <div class="animate-fade-in">
    <PageHeader title="Quản lý Chành" icon="pi pi-map-marker">
      <template #actions>
        <Button label="Thêm chành" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <!-- Toolbar -->
    <div class="filter-bar">
      <Button icon="pi pi-refresh" text rounded size="small" @click="loadData" v-tooltip.top="'Tải lại'" />
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DATA TABLE                                                    -->
    <!-- ===================================================================== -->
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
        <Column field="dia_chi" header="Địa chỉ" />
        <Column header="Điện thoại" style="width: 140px;">
          <template #body="{ data }">{{ formatPhone(data.dien_thoai) }}</template>
        </Column>
        <Column field="nguoi_lien_he" header="Liên hệ" style="width: 140px;" />
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

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: CREATE/EDIT CHANH                                     -->
    <!-- ===================================================================== -->
    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="isEdit ? 'Sửa chành' : 'Thêm chành mới'"
      :style="{ width: '500px' }"
      modal
      class="compact-dialog"
    >
      <!-- Section: Thông tin chành -->
      <div class="dialog-section-title">
        <i class="pi pi-map-marker"></i> Thông tin chành
      </div>
      <div class="form-grid-dialog-1">
        <div class="form-group">
          <label class="form-label">Tên chành <span class="req">*</span></label>
          <InputText
            v-model="form.ten"
            placeholder="VD: Chành Miền Tây - Bến xe Miền Tây"
            fluid
            spellcheck="false"
          />
          <small class="field-hint">Tên đầy đủ, rõ địa chỉ hoặc khu vực chành quản lý.</small>
        </div>
      </div>

      <!-- Section: Liên hệ & Địa chỉ -->
      <div class="dialog-section-title" style="margin-top: 1rem;">
        <i class="pi pi-phone"></i> Liên hệ & Địa chỉ
      </div>
      <div class="form-grid-dialog-1">
        <div class="form-group">
          <label class="form-label">Địa chỉ chành</label>
          <InputText
            v-model="form.dia_chi"
            placeholder="Số nhà, đường, phường/xã, quận/huyện"
            fluid
            spellcheck="false"
          />
        </div>
      </div>
      <div class="form-grid-dialog" style="margin-top: 0.5rem;">
        <div class="form-group">
          <label class="form-label">Điện thoại</label>
          <InputText
            v-model="form.dien_thoai"
            placeholder="Số liên hệ chành"
            inputmode="tel"
            fluid
            spellcheck="false"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Người liên hệ</label>
          <InputText
            v-model="form.nguoi_lien_he"
            placeholder="Tên người liên hệ"
            fluid
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Section: Ghi chú -->
      <div class="dialog-section-title" style="margin-top: 1rem;">
        <i class="pi pi-comment"></i> Ghi chú
      </div>
      <div class="form-group">
        <Textarea
          v-model="form.ghi_chu"
          rows="2"
          placeholder="Giờ nhận hàng, khu vực phụ trách, lưu ý..."
          fluid
          spellcheck="false"
        />
      </div>

      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo chành'" icon="pi pi-check" size="small" :loading="saving" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES
   ============================================================================ */
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

/* 2 cột bằng nhau */
.form-grid-dialog {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* 1 cột full-width */
.form-grid-dialog-1 {
  display: grid;
  grid-template-columns: 1fr;
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
  color: #334155;
}

.req { color: #ef4444; }

.field-hint {
  color: #94a3b8;
  font-size: 0.7rem;
}
</style>
