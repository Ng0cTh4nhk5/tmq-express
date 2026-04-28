<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

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
  ten_don_vi: '', loai_kh: 'ca_nhan', nguoi_lien_he: '', dien_thoai: '',
  so_cccd: '', dia_chi: '',
  email: '', ma_so_thue: '', ghi_chu: '',
});
const maKh = ref('');

async function loadKH() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const { data: res } = await api.get(`/khach-hang/${route.params.id}`);
    const kh = res.data;
    maKh.value = kh.ma_kh;
    form.value = {
      ten_don_vi: kh.ten_don_vi || '', loai_kh: kh.loai_kh || 'ca_nhan', nguoi_lien_he: kh.nguoi_lien_he || '',
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
  if (!form.value.ten_don_vi.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Tên đơn vị là bắt buộc', life: 3000 });
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
    if (isEdit.value) {
      await api.put(`/khach-hang/${route.params.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật khách hàng', life: 3000 });
    } else {
      await api.post('/khach-hang', form.value);
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
    <PageHeader :title="isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'" icon="pi pi-users">
      <template #actions>
        <Button label="Quay lại" icon="pi pi-arrow-left" severity="secondary" text size="small" @click="router.push('/khach-hang')" />
      </template>
    </PageHeader>

    <div class="card" style="max-width: 650px;" v-if="!loading">
      <div v-if="isEdit" class="form-group">
        <label class="form-label">Mã khách hàng</label>
        <InputText :modelValue="maKh" disabled fluid />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Tên đơn vị <span style="color:var(--danger)">*</span></label>
          <InputText v-model="form.ten_don_vi" placeholder="VD: Cty TNHH ABC" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Loại khách hàng</label>
          <Select v-model="form.loai_kh" :options="loaiKhOptions" optionLabel="label" optionValue="value" fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Người liên hệ</label>
          <InputText v-model="form.nguoi_lien_he" placeholder="Họ tên" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Số điện thoại</label>
          <InputText v-model="form.dien_thoai" placeholder="0901234567" fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">CCCD/CMND</label>
          <InputText v-model="form.so_cccd" placeholder="Số CCCD..." fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="form.dia_chi" placeholder="Địa chỉ liên hệ..." fluid />
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Email</label>
          <InputText v-model="form.email" placeholder="email@example.com" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Mã số thuế</label>
          <InputText v-model="form.ma_so_thue" placeholder="10 hoặc 13 chữ số" fluid />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <Textarea v-model="form.ghi_chu" rows="2" placeholder="Ghi chú thêm..." fluid />
      </div>

      <div class="form-actions">
        <Button :label="isEdit ? 'Cập nhật' : 'Tạo khách hàng'" icon="pi pi-check" :loading="saving" @click="save" />
        <Button label="Hủy" severity="secondary" text @click="router.push('/khach-hang')" />
      </div>
    </div>
  </div>
</template>
