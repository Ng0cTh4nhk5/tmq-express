<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { applyPhoneFormat, stripPhone } from '../utils/phone';
import { usePhoneInput } from '../composables/usePhoneInput';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);

const loaiKhOptions = [
  { label: 'Cá nhân', value: 'ca_nhan' },
  { label: 'Doanh nghiệp', value: 'doanh_nghiep' },
];

const form = ref({
  ten_don_vi: '', loai_kh: null, nguoi_lien_he: '',
  dien_thoai: '', so_cccd: '', dia_chi: '',
  email: '', ma_so_thue: '', ghi_chu: '',
});
const maKh = ref('');

// ── Phone input composable ───────────────────────────────────────
const { handlePhoneInput } = usePhoneInput();

// onPhoneInput: dùng handlePhoneInput(form, 'dien_thoai', $event) trong template
// formatPhone → applyPhoneFormat từ utils/phone (dùng khi load dữ liệu)
function onPhoneInput(e) {
  handlePhoneInput(form, 'dien_thoai', e);
}

// Chỉ cho nhập số ở MST
function onMstInput(e) {
  form.value.ma_so_thue = e.target.value.replace(/\D/g, '');
}

// Label động theo loại KH
const tenDonViLabel = computed(() =>
  form.value.loai_kh === 'ca_nhan' ? 'Họ và tên' : 'Tên đơn vị'
);

const isCaNhan = computed(() => form.value.loai_kh === 'ca_nhan');
const isDoanh  = computed(() => form.value.loai_kh === 'doanh_nghiep');

async function loadKH() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const { data: res } = await api.get(`/khach-hang/${route.params.id}`);
    const kh = res.data;
    maKh.value = kh.ma_kh;
    form.value = {
      ten_don_vi: kh.ten_don_vi || '', loai_kh: kh.loai_kh || null,
      nguoi_lien_he: kh.nguoi_lien_he || '',
      dien_thoai: kh.dien_thoai || '',
      so_cccd: kh.so_cccd || '', dia_chi: kh.dia_chi || '',
      email: kh.email || '', ma_so_thue: kh.ma_so_thue || '', ghi_chu: kh.ghi_chu || '',
    };
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy khách hàng', life: 3000 });
    router.push('/khach-hang');
  } finally {
    loading.value = false;
  }
}

function validate() {
  if (!form.value.loai_kh) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn nhóm khách hàng', life: 3000 });
    return false;
  }
  if (!form.value.ten_don_vi.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Tên đơn vị / Họ tên là bắt buộc', life: 3000 });
    return false;
  }
  if (form.value.ma_so_thue && !/^\d{10}(\d{3})?$/.test(form.value.ma_so_thue)) {
    toast.add({ severity: 'warn', summary: 'MST không hợp lệ', detail: 'Mã số thuế phải có 10 hoặc 13 chữ số', life: 3000 });
    return false;
  }
  return true;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    // SĐT: strip space, bỏ nếu rỗng
    const rawPhone = stripPhone(form.value.dien_thoai);
    const payload = { ...form.value };

    // SĐT: strip space, bỏ nếu rỗng
    if (rawPhone) {
      payload.dien_thoai = rawPhone;
    } else {
      delete payload.dien_thoai;
    }

    // Các trường optional: KHÔNG gửi chuỗi rỗng lên backend
    // vì Fastify AJV sẽ reject format:email / pattern khi value = ""
    const optionalFields = ['email', 'nguoi_lien_he', 'so_cccd', 'ma_so_thue', 'ghi_chu', 'dia_chi'];
    for (const field of optionalFields) {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        delete payload[field];
      }
    }

    if (isEdit.value) {
      await api.put(`/khach-hang/${route.params.id}`, payload);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật khách hàng', life: 3000 });
    } else {
      await api.post('/khach-hang', payload);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Tạo khách hàng mới', life: 3000 });
    }
    router.push('/khach-hang');
  } catch (err) {
    handleApiError(err, toast, 'Không thể lưu khách hàng');
  } finally {
    saving.value = false;
  }
}

onMounted(loadKH);
</script>


<template>
  <div class="animate-fade-in">
    <PageHeader :title="isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng mới'" icon="pi pi-users">
      <template #actions>
        <Button label="Quay lại" icon="pi pi-arrow-left" severity="secondary" outlined size="small" @click="router.push('/khach-hang')" />
      </template>
    </PageHeader>

    <div class="card kh-form-card" v-if="!loading">

      <div v-if="isEdit" class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label">Mã khách hàng</label>
        <InputText :modelValue="maKh" disabled fluid style="max-width: 140px;" />
      </div>

      <div class="section-title"><i class="pi pi-tag"></i> Nhóm khách hàng</div>
      <div class="form-group">
        <div class="loai-kh-selector">
          <div class="loai-kh-option" :class="{ active: form.loai_kh === 'ca_nhan' }" @click="form.loai_kh = 'ca_nhan'">
            <i class="pi pi-user"></i><span>Cá nhân</span>
          </div>
          <div class="loai-kh-option" :class="{ active: form.loai_kh === 'doanh_nghiep' }" @click="form.loai_kh = 'doanh_nghiep'">
            <i class="pi pi-building"></i><span>Doanh nghiệp</span>
          </div>
        </div>
      </div>

      <template v-if="isCaNhan">
        <div class="section-title" style="margin-top: 0.75rem;"><i class="pi pi-id-card"></i> Thông tin cá nhân</div>
        <div class="form-grid-2-1">
          <div class="form-group">
            <label class="form-label">Họ và tên <span class="req">*</span></label>
            <InputText v-model="form.ten_don_vi" placeholder="Nhập họ và tên đầy đủ" fluid spellcheck="false" />
          </div>
          <div class="form-group">
            <label class="form-label">Số CCCD/CMND</label>
            <InputText v-model="form.so_cccd" placeholder="12 chữ số" inputmode="numeric" fluid spellcheck="false" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="form.dia_chi" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" fluid spellcheck="false" />
        </div>
        <div class="section-title" style="margin-top: 0.25rem;"><i class="pi pi-phone"></i> Thông tin liên hệ</div>
        <div class="form-grid-1-2">
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <InputText :value="form.dien_thoai" @input="onPhoneInput" placeholder="0901 234 567" inputmode="tel" fluid spellcheck="false" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <InputText v-model="form.email" placeholder="Nhập địa chỉ email" type="email" fluid spellcheck="false" />
          </div>
        </div>
      </template>

      <template v-if="isDoanh">
        <div class="section-title" style="margin-top: 0.75rem;"><i class="pi pi-building"></i> Thông tin doanh nghiệp</div>
        <div class="form-grid-2-1">
          <div class="form-group">
            <label class="form-label">Tên đơn vị <span class="req">*</span></label>
            <InputText v-model="form.ten_don_vi" placeholder="VD: Công ty TNHH ABC Thương Mại" fluid spellcheck="false" />
          </div>
          <div class="form-group">
            <label class="form-label">Mã số thuế</label>
            <InputText :value="form.ma_so_thue" @input="onMstInput" placeholder="10 hoặc 13 chữ số" inputmode="numeric" fluid spellcheck="false" />
            <small class="field-hint">Chỉ nhập số, 10 hoặc 13 ký tự.</small>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="form.dia_chi" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" fluid spellcheck="false" />
        </div>
        <div class="section-title" style="margin-top: 0.25rem;"><i class="pi pi-user"></i> Người liên hệ</div>
        <div class="form-grid-2-1">
          <div class="form-group">
            <label class="form-label">Họ tên người liên hệ</label>
            <InputText v-model="form.nguoi_lien_he" placeholder="Họ tên người đại diện / liên hệ" fluid spellcheck="false" />
          </div>
          <div class="form-group">
            <label class="form-label">CCCD người liên hệ</label>
            <InputText v-model="form.so_cccd" placeholder="12 chữ số" inputmode="numeric" fluid spellcheck="false" />
          </div>
        </div>
        <div class="section-title" style="margin-top: 0.25rem;"><i class="pi pi-phone"></i> Thông tin liên hệ</div>
        <div class="form-grid-1-2">
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <InputText :value="form.dien_thoai" @input="onPhoneInput" placeholder="0901 234 567" inputmode="tel" fluid spellcheck="false" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <InputText v-model="form.email" placeholder="Nhập địa chỉ email" type="email" fluid spellcheck="false" />
          </div>
        </div>
      </template>

      <template v-if="form.loai_kh">
        <div class="section-title" style="margin-top: 0.25rem;"><i class="pi pi-comment"></i> Ghi chú</div>
        <div class="form-group">
          <Textarea v-model="form.ghi_chu" rows="2" placeholder="Ghi chú thêm về khách hàng..." fluid spellcheck="false" />
        </div>
        <div class="kh-form-actions">
          <Button :label="isEdit ? 'Cập nhật' : 'Tạo khách hàng'" icon="pi pi-check" :loading="saving" @click="save" />
          <Button label="Hủy" severity="secondary" text @click="router.push('/khach-hang')" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.kh-form-card { max-width: 680px; }

.section-title {
  font-size: 0.78rem; font-weight: 700; color: var(--primary);
  display: flex; align-items: center; gap: 0.4rem;
  margin-bottom: 0.65rem; padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.form-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 0.85rem; }
.form-grid-1-2 { display: grid; grid-template-columns: 1fr 2fr; gap: 0.85rem; }

.form-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }

.form-label { font-size: 0.78rem; font-weight: 600; color: #334155; }
.req { color: #ef4444; }
.field-hint { color: #94a3b8; font-size: 0.7rem; }

.loai-kh-selector { display: flex; gap: 0.75rem; }

.loai-kh-option {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 0.5rem; padding: 0.6rem 1rem;
  border: 2px solid var(--border); border-radius: var(--radius);
  cursor: pointer; font-size: 0.85rem; font-weight: 500;
  color: var(--text-muted); transition: all 0.15s ease;
  background: var(--bg); user-select: none;
}

.loai-kh-option:hover { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.loai-kh-option.active { border-color: var(--primary); background: #eff6ff; color: #1d4ed8; font-weight: 600; }
.loai-kh-option.active i, .loai-kh-option:hover i { color: var(--primary); }
.loai-kh-option i { font-size: 1rem; }

.kh-form-actions {
  display: flex; align-items: center; gap: 0.75rem;
  padding-top: 0.75rem; border-top: 1px solid var(--border-light); margin-top: 0.25rem;
}
</style>