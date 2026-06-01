<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Checkbox from 'primevue/checkbox';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

// ============================================================================
// MARK: - STATE & OPTIONS
// ============================================================================
const toast = useToast();
const confirm = useConfirm();
const list = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const vanPhongs = ref([]);
// [FE-03] Search filter
const searchQuery = ref('');

const emptyForm = () => ({
  ma_nv: '', ten: '', username: '',
  password: '', confirm_password: '',
  role: null, van_phong_id: null,
  require_password_change: true,
});

const form = ref(emptyForm());
const pwError = ref('');

// ============================================================================
// MARK: - WATCHERS
// ============================================================================
// ── [FE-01] Tự sinh mã NV khi chọn VP (chỉ khi tạo mới) ───────────────────
// Derive số thứ tự từ index trong vanPhongs (thứ tự load từ API), không hardcode
watch(() => form.value.van_phong_id, (vpId) => {
  if (editing.value || !vpId) return;
  const vpIndex = vanPhongs.value.findIndex(v => v.value === vpId);
  const vp = vanPhongs.value[vpIndex];
  if (!vp) return;
  const maVp = vp.ma_vp;
  // Số thứ tự VP = index + 1 (thứ tự load từ DB, consistent với server)
  const vpNum = String(vpIndex + 1).padStart(2, '0');
  // Đếm số NV hiện tại của VP đó
  const count = list.value.filter(nv => nv.van_phong?.ma_vp === maVp).length;
  const stt = String(count + 1).padStart(3, '0');
  form.value.ma_nv = `NV${vpNum}${stt}`;
});

// ============================================================================
// MARK: - COMPUTED SEARCH FILTERS
// ============================================================================
// ── [FE-03] Computed filtered list ──────────────────────────────────────────
const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list.value;
  return list.value.filter(nv =>
    nv.ma_nv?.toLowerCase().includes(q) ||
    nv.ten?.toLowerCase().includes(q) ||
    nv.username?.toLowerCase().includes(q) ||
    nv.van_phong?.ten?.toLowerCase().includes(q),
  );
});

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Nhân viên', value: 'staff' },
];

function roleSeverity(role) {
  if (role === 'admin') return 'danger';
  return 'info';
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  return 'Nhân viên';
}

// ============================================================================
// MARK: - API: FETCH DATA
// ============================================================================
async function fetchData() {
  loading.value = true;
  try {
    const [nvRes, vpRes] = await Promise.all([
      api.get('/nhan-vien?limit=100'),
      api.get('/van-phong'),
    ]);
    // [FE-05] Thêm ?? [] fallback phòng trường hợp API trả sai format
    list.value = nvRes.data.data ?? [];
    vanPhongs.value = (vpRes.data.data ?? []).map(vp => ({
      label: `${vp.ma_vp} — ${vp.ten}`,
      value: vp.id,
      ma_vp: vp.ma_vp,
    }));
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách nhân viên');
  }
  loading.value = false;
}

// ============================================================================
// MARK: - ACTIONS
// ============================================================================
function openNew() {
  form.value = emptyForm();
  pwError.value = '';
  editing.value = false;
  dialogVisible.value = true;
}

function openEdit(row) {
  form.value = { ...emptyForm(), ...row, van_phong_id: row.van_phong.id };
  pwError.value = '';
  editing.value = true;
  dialogVisible.value = true;
}

// ── [FE-04] Username format validation ──────────────────────────────────────
const USERNAME_PATTERN = /^[a-z0-9_.\-]+$/;

function validateForm() {
  pwError.value = '';
  if (!form.value.ma_nv?.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập mã nhân viên', life: 3000 });
    return false;
  }
  if (!form.value.ten?.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng nhập họ tên', life: 3000 });
    return false;
  }
  if (!form.value.role) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn vai trò', life: 3000 });
    return false;
  }
  if (!form.value.van_phong_id) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn văn phòng', life: 3000 });
    return false;
  }
  if (!editing.value) {
    // Validate username format
    if (!form.value.username || form.value.username.length < 3) {
      toast.add({ severity: 'warn', summary: 'Tài khoản không hợp lệ', detail: 'Tài khoản phải có ít nhất 3 ký tự', life: 3000 });
      return false;
    }
    if (!USERNAME_PATTERN.test(form.value.username)) {
      toast.add({ severity: 'warn', summary: 'Tài khoản không hợp lệ', detail: 'Chỉ được dùng chữ thường, số và ký tự . _ -', life: 3000 });
      return false;
    }
    if (!form.value.password || form.value.password.length < 6) {
      pwError.value = 'Mật khẩu phải có ít nhất 6 ký tự';
      return false;
    }
    if (form.value.password !== form.value.confirm_password) {
      pwError.value = 'Mật khẩu xác nhận không khớp';
      return false;
    }
  }
  return true;
}

// ============================================================================
// MARK: - API: SAVE & STATUS TOGGLES
// ============================================================================
async function save() {
  if (!validateForm()) return;
  try {
    if (editing.value) {
      await api.put(`/nhan-vien/${form.value.id}`, {
        ten: form.value.ten,
        role: form.value.role,
        van_phong_id: form.value.van_phong_id,
      });
      toast.add({ severity: 'success', summary: 'Đã cập nhật', life: 2000 });
    } else {
      await api.post('/nhan-vien', {
        ma_nv: form.value.ma_nv,
        ten: form.value.ten,
        username: form.value.username,
        password: form.value.password,
        role: form.value.role,
        van_phong_id: form.value.van_phong_id,
        require_password_change: form.value.require_password_change,
      });
      toast.add({ severity: 'success', summary: 'Đã thêm nhân viên', life: 2000 });
    }
    dialogVisible.value = false;
    // [FE-06] await fetchData để đảm bảo danh sách cập nhật đúng
    await fetchData();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: e.response?.data?.error?.message || e.message, life: 3000 });
  }
}

async function toggleActive(row) {
  try {
    await api.patch(`/nhan-vien/${row.id}/active`, { active: !row.active });
    toast.add({ severity: 'info', summary: row.active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt', life: 2000 });
    await fetchData();
  } catch (err) { handleApiError(err, toast, 'Không thể thay đổi trạng thái'); }
}

// ============================================================================
// MARK: - API: RESET PASSWORD
// ============================================================================
async function resetPw(row) {
  confirm.require({
    message: `Reset mật khẩu cho ${row.ten}?`,
    header: 'Xác nhận reset mật khẩu',
    icon: 'pi pi-key',
    acceptLabel: 'Reset',
    rejectLabel: 'Không',
    accept: async () => {
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
    },
  });
}

onMounted(fetchData);
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & TOOLBAR                                              -->
  <!-- ===================================================================== -->
  <div class="animate-fade-in">
    <PageHeader title="Nhân viên" icon="pi pi-id-card">
      <template #actions>
        <Button label="Thêm nhân viên" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="card">
      <!-- [FE-03] Search bar -->
      <div class="table-toolbar">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Tìm theo tên, mã NV, tài khoản, văn phòng..."
            size="small"
            style="width: 300px;"
          />
        </IconField>
        <span class="result-count" v-if="searchQuery">
          {{ filteredList.length }} / {{ list.length }} nhân viên
        </span>
      </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DATA TABLE                                                    -->
    <!-- ===================================================================== -->
    <DataTable
        :value="filteredList"
        :loading="loading"
        stripedRows
        size="small"
        responsiveLayout="scroll"
        dataKey="id"
      >
        <Column field="ma_nv" header="Mã nhân viên" style="width: 110px; font-weight: 700;" />
        <Column field="ten" header="Họ tên" style="width: 180px;" />
        <Column field="username" header="Tài khoản" style="width: 110px;" />
        <Column header="Vai trò" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="roleLabel(data.role)" :severity="roleSeverity(data.role)" />
          </template>
        </Column>
        <Column header="Văn phòng" style="width: 130px;">
          <template #body="{ data }">{{ data.van_phong?.ten }}</template>
        </Column>
        <Column header="Trạng thái" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Khóa'" :severity="data.active ? 'success' : 'secondary'" />
          </template>
        </Column>
        <Column header="" style="width: 110px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded severity="info" size="small" @click="openEdit(data)" v-tooltip.left="'Sửa'" />
            <Button icon="pi pi-key" text rounded severity="warn" size="small" @click="resetPw(data)" v-tooltip.left="'Reset mật khẩu'" />
            <Button
              :icon="data.active ? 'pi pi-lock' : 'pi pi-lock-open'"
              text rounded size="small"
              :severity="data.active ? 'secondary' : 'success'"
              @click="toggleActive(data)"
              v-tooltip.left="data.active ? 'Khóa tài khoản' : 'Kích hoạt'"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: CREATE/EDIT EMPLOYEE                                  -->
    <!-- ===================================================================== -->
    <!-- Dialog tạo / sửa -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editing ? 'Sửa nhân viên' : 'Thêm nhân viên mới'"
      :modal="true"
      :style="{ width: '460px' }"
      class="compact-dialog"
    >
      <!-- Section: Thông tin cơ bản -->
      <div class="dialog-section-title">
        <i class="pi pi-user"></i> Thông tin cơ bản
      </div>
      <div class="form-grid-dialog">
        <div class="form-group">
          <label class="form-label">Mã nhân viên <span class="req">*</span></label>
          <InputText
            v-model="form.ma_nv"
            :disabled="editing"
            placeholder="Tự sinh khi chọn VP"
            fluid
          />
          <small v-if="!editing" class="field-hint">Tự điền khi chọn văn phòng. Bạn có thể sửa tay.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Họ tên <span class="req">*</span></label>
          <InputText v-model="form.ten" placeholder="Nguyễn Văn A" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Tài khoản đăng nhập <span class="req" v-if="!editing">*</span></label>
          <InputText v-model="form.username" :disabled="editing" placeholder="vd: nva" fluid />
          <small v-if="!editing" class="field-hint">Chỉ dùng chữ thường, số và ký tự . _ -</small>
        </div>
      </div>

      <!-- Section: Phân quyền -->
      <div class="dialog-section-title" style="margin-top: 1rem;">
        <i class="pi pi-shield"></i> Phân quyền &amp; Văn phòng
      </div>
      <div class="form-grid-dialog">
        <div class="form-group">
          <label class="form-label">Vai trò <span class="req">*</span></label>
          <Select
            v-model="form.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Chọn vai trò"
            fluid
          >
            <template #value="slotProps">
              <div v-if="slotProps.value" class="role-selected">
                <Tag
                  :value="roleLabel(slotProps.value)"
                  :severity="roleSeverity(slotProps.value)"
                  style="font-size: 0.75rem;"
                />
              </div>
              <span v-else class="p-placeholder">Chọn vai trò</span>
            </template>
            <template #option="slotProps">
              <div class="role-option">
                <Tag
                  :value="slotProps.option.label"
                  :severity="roleSeverity(slotProps.option.value)"
                  style="font-size: 0.75rem;"
                />
              </div>
            </template>
          </Select>
        </div>
        <div class="form-group">
          <label class="form-label">Văn phòng <span class="req">*</span></label>
          <Select
            v-model="form.van_phong_id"
            :options="vanPhongs"
            optionLabel="label"
            optionValue="value"
            placeholder="Chọn văn phòng"
            fluid
          />
        </div>
      </div>

      <!-- Section: Mật khẩu (chỉ khi tạo mới) -->
      <template v-if="!editing">
        <div class="dialog-section-title" style="margin-top: 1rem;">
          <i class="pi pi-lock"></i> Mật khẩu
        </div>
        <div class="form-grid-dialog">
          <div class="form-group">
            <label class="form-label">Mật khẩu <span class="req">*</span></label>
            <Password
              v-model="form.password"
              :feedback="false"
              toggleMask
              placeholder="Tối thiểu 6 ký tự"
              :class="{ 'p-invalid': pwError }"
              fluid
            />
          </div>
          <div class="form-group">
            <label class="form-label">Xác nhận mật khẩu <span class="req">*</span></label>
            <Password
              v-model="form.confirm_password"
              :feedback="false"
              toggleMask
              placeholder="Nhập lại mật khẩu"
              :class="{ 'p-invalid': pwError }"
              fluid
            />
          </div>
          <small v-if="pwError" class="field-error" style="grid-column: 1/-1;">{{ pwError }}</small>
        </div>

        <div class="form-group checkbox-group">
          <Checkbox v-model="form.require_password_change" inputId="req_pw" :binary="true" />
          <label for="req_pw" class="form-label" style="margin:0; cursor:pointer;">
            Yêu cầu đổi mật khẩu lần đầu đăng nhập
          </label>
        </div>
      </template>

      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="dialogVisible = false" />
        <Button :label="editing ? 'Cập nhật' : 'Thêm nhân viên'" size="small" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES
   ============================================================================ */
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.result-count {
  font-size: 0.78rem;
  color: #64748b;
}

.dialog-section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
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
  color: #334155;
}

.req {
  color: #ef4444;
}

.field-hint {
  color: #94a3b8;
  font-size: 0.7rem;
}

.field-error {
  color: #ef4444;
  font-size: 0.73rem;
}

.role-option,
.role-selected {
  display: flex;
  align-items: center;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
