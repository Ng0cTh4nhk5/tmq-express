<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const vanPhongs = ref([]);
const previewMaSo = ref('');

const form = ref({
  van_phong_gui_id: null,
  van_phong_nhan_id: null,
  don_vi_gui: '',
  nguoi_gui: '',
  dien_thoai_gui: '',
  dia_chi_gui: '',
  don_vi_nhan: '',
  nguoi_nhan: '',
  dien_thoai_nhan: '',
  dia_chi_nhan: '',
  so_cccd: '',
  ten_hang_hoa: '',
  gia_tri_hang: null,
  trong_luong: null,
  thu_ho: 0,
  gia_cuoc: 0,
  trang_thai_thu: 'da_thu',
  can_xuat_hddt: false,
  hinh_thuc_giao: 'tan_noi',
});

const trangThaiThuOptions = [
  { label: 'Đã thu', value: 'da_thu' },
  { label: 'Chưa thu', value: 'chua_thu' },
  { label: 'Công nợ', value: 'cong_no' },
];

const hinhThucGiaoOptions = [
  { label: 'Giao tận nơi', value: 'tan_noi' },
  { label: 'Gọi điện', value: 'goi_dien' },
  { label: 'Khách tự tới', value: 'tu_toi' },
];

// Autocomplete
const guiSuggestions = ref([]);
const nhanSuggestions = ref([]);

async function searchKH(event, target) {
  const q = event.query;
  if (!q || q.length < 2) return;
  const { data: res } = await api.get('/khach-hang/autocomplete', { params: { q } });
  if (target === 'gui') guiSuggestions.value = res.data;
  else nhanSuggestions.value = res.data;
}

function onSelectGui(event) {
  const kh = event.value;
  form.value.don_vi_gui = kh.ten_don_vi;
  form.value.nguoi_gui = kh.nguoi_lien_he || '';
  form.value.dien_thoai_gui = kh.dien_thoai || '';
  form.value.dia_chi_gui = kh.dia_chi || '';
}

function onSelectNhan(event) {
  const kh = event.value;
  form.value.don_vi_nhan = kh.ten_don_vi;
  form.value.nguoi_nhan = kh.nguoi_lien_he || '';
  form.value.dien_thoai_nhan = kh.dien_thoai || '';
  form.value.dia_chi_nhan = kh.dia_chi || '';
}

// Preview mã BN
async function fetchPreviewMaSo() {
  if (!form.value.van_phong_gui_id || !form.value.van_phong_nhan_id) {
    previewMaSo.value = '';
    return;
  }
  try {
    const { data: res } = await api.get('/bien-nhan/next-ma-so', {
      params: { vp_gui_id: form.value.van_phong_gui_id, vp_nhan_id: form.value.van_phong_nhan_id },
    });
    previewMaSo.value = res.data || '';
  } catch {
    previewMaSo.value = '';
  }
}

watch([() => form.value.van_phong_gui_id, () => form.value.van_phong_nhan_id], fetchPreviewMaSo);

async function loadVanPhongs() {
  const { data: res } = await api.get('/van-phong?active=true');
  vanPhongs.value = res.data.map((v) => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
}

async function loadBienNhan() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const { data: res } = await api.get(`/bien-nhan/${route.params.id}`);
    const bn = res.data;
    previewMaSo.value = bn.ma_so;
    form.value = {
      van_phong_gui_id: bn.van_phong_gui_id,
      van_phong_nhan_id: bn.van_phong_nhan_id,
      don_vi_gui: bn.don_vi_gui || '',
      nguoi_gui: bn.nguoi_gui || '',
      dien_thoai_gui: bn.dien_thoai_gui || '',
      dia_chi_gui: bn.dia_chi_gui || '',
      don_vi_nhan: bn.don_vi_nhan || '',
      nguoi_nhan: bn.nguoi_nhan || '',
      dien_thoai_nhan: bn.dien_thoai_nhan || '',
      dia_chi_nhan: bn.dia_chi_nhan || '',
      so_cccd: bn.so_cccd || '',
      ten_hang_hoa: bn.ten_hang_hoa || '',
      gia_tri_hang: bn.gia_tri_hang ? Number(bn.gia_tri_hang) : null,
      trong_luong: bn.trong_luong ? Number(bn.trong_luong) : null,
      thu_ho: Number(bn.thu_ho) || 0,
      gia_cuoc: Number(bn.gia_cuoc) || 0,
      trang_thai_thu: bn.trang_thai_thu,
      can_xuat_hddt: bn.can_xuat_hddt,
      hinh_thuc_giao: bn.hinh_thuc_giao,
    };
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy biên nhận', life: 3000 });
    router.push('/bien-nhan');
  } finally {
    loading.value = false;
  }
}

function validate() {
  const errors = [];
  if (!form.value.van_phong_gui_id) errors.push('Văn phòng gửi');
  if (!form.value.van_phong_nhan_id) errors.push('Văn phòng nhận');
  if (!form.value.ten_hang_hoa?.trim()) errors.push('Tên hàng hóa');
  if (form.value.van_phong_gui_id === form.value.van_phong_nhan_id && form.value.van_phong_gui_id) {
    toast.add({ severity: 'warn', summary: 'Lỗi', detail: 'Văn phòng gửi và văn phòng nhận không được trùng nhau', life: 3000 });
    return false;
  }
  if (errors.length) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: `Cần nhập: ${errors.join(', ')}`, life: 4000 });
    return false;
  }
  return true;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await api.put(`/bien-nhan/${route.params.id}`, form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật biên nhận', life: 3000 });
      router.push('/bien-nhan');
    } else {
      const { data: res } = await api.post('/bien-nhan', form.value);
      toast.add({ severity: 'success', summary: 'Thành công', detail: `Tạo biên nhận ${previewMaSo.value}`, life: 3000 });
      // Thông báo khách hàng tự tạo
      if (res.auto_created_kh?.length) {
        for (const kh of res.auto_created_kh) {
          toast.add({ severity: 'info', summary: 'Tự tạo khách hàng mới', detail: `${kh.ma_kh} — ${kh.ten_don_vi}`, life: 5000 });
        }
      }
      const vpGui = form.value.van_phong_gui_id;
      const vpNhan = form.value.van_phong_nhan_id;
      form.value = { ...form.value, don_vi_gui: '', nguoi_gui: '', dien_thoai_gui: '', dia_chi_gui: '', don_vi_nhan: '', nguoi_nhan: '', dien_thoai_nhan: '', dia_chi_nhan: '', so_cccd: '', ten_hang_hoa: '', gia_tri_hang: null, trong_luong: null, thu_ho: 0, gia_cuoc: 0, can_xuat_hddt: false };
      form.value.van_phong_gui_id = vpGui;
      form.value.van_phong_nhan_id = vpNhan;
      fetchPreviewMaSo();
    }
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu biên nhận');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadVanPhongs();
  loadBienNhan();
  if (!isEdit.value && auth.userVanPhong) {
    form.value.van_phong_gui_id = auth.userVanPhong.id;
  }
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader :title="isEdit ? 'Sửa biên nhận' : 'Tạo biên nhận mới'" icon="pi pi-file-edit">
      <template #actions>
        <div v-if="previewMaSo" class="ma-preview">
          <i class="pi pi-hashtag"></i> {{ previewMaSo }}
        </div>
        <Button label="Quay lại" icon="pi pi-arrow-left" severity="secondary" text size="small" @click="router.push('/bien-nhan')" />
      </template>
    </PageHeader>

    <div class="bn-form-container" v-if="!loading">
      <!-- 2-column layout -->
      <div class="bn-form-grid">
        <!-- LEFT COLUMN -->
        <div class="bn-col">
          <!-- Tuyến -->
          <div class="card">
            <div class="form-section-title">Tuyến vận chuyển</div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Văn phòng gửi <span class="req">*</span></label>
                <Select v-model="form.van_phong_gui_id" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng gửi" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Văn phòng nhận <span class="req">*</span></label>
                <Select v-model="form.van_phong_nhan_id" :options="vanPhongs" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng nhận" fluid />
              </div>
            </div>
          </div>

          <!-- Người gửi -->
          <div class="card">
            <div class="form-section-title">Người gửi</div>
            <div class="form-group">
              <label class="form-label">Đơn vị / Tên</label>
              <AutoComplete v-model="form.don_vi_gui" :suggestions="guiSuggestions" field="ten_don_vi" @complete="(e) => searchKH(e, 'gui')" @item-select="onSelectGui" placeholder="Gõ tên hoặc số điện thoại..." fluid>
                <template #option="{ option }">
                  <div style="display: flex; justify-content: space-between; width: 100%; gap: 1rem;">
                    <span>{{ option.ten_don_vi }}</span>
                    <span v-if="option.dien_thoai" style="color: var(--text-muted); font-size: 0.8rem;">{{ option.dien_thoai }}</span>
                  </div>
                </template>
              </AutoComplete>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Người liên hệ</label>
                <InputText v-model="form.nguoi_gui" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <InputText v-model="form.dien_thoai_gui" fluid />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Địa chỉ</label>
              <InputText v-model="form.dia_chi_gui" fluid />
            </div>
          </div>

          <!-- Người nhận -->
          <div class="card">
            <div class="form-section-title">Người nhận</div>
            <div class="form-group">
              <label class="form-label">Đơn vị / Tên</label>
              <AutoComplete v-model="form.don_vi_nhan" :suggestions="nhanSuggestions" field="ten_don_vi" @complete="(e) => searchKH(e, 'nhan')" @item-select="onSelectNhan" placeholder="Gõ tên hoặc số điện thoại..." fluid>
                <template #option="{ option }">
                  <div style="display: flex; justify-content: space-between; width: 100%; gap: 1rem;">
                    <span>{{ option.ten_don_vi }}</span>
                    <span v-if="option.dien_thoai" style="color: var(--text-muted); font-size: 0.8rem;">{{ option.dien_thoai }}</span>
                  </div>
                </template>
              </AutoComplete>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Người liên hệ</label>
                <InputText v-model="form.nguoi_nhan" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <InputText v-model="form.dien_thoai_nhan" fluid />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Địa chỉ</label>
              <InputText v-model="form.dia_chi_nhan" fluid />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="bn-col">
          <div class="card">
            <div class="form-section-title">Hàng hóa & Cước</div>
            <div class="form-group">
              <label class="form-label">Tên hàng hóa <span class="req">*</span></label>
              <InputText v-model="form.ten_hang_hoa" placeholder="VD: Máy bơm nước..." fluid />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Giá trị hàng</label>
                <InputNumber v-model="form.gia_tri_hang" mode="decimal" :useGrouping="true" suffix=" đ" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Trọng lượng (kg)</label>
                <InputNumber v-model="form.trong_luong" mode="decimal" :minFractionDigits="0" :maxFractionDigits="2" fluid />
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Giá cước</label>
                <InputNumber v-model="form.gia_cuoc" mode="decimal" :useGrouping="true" suffix=" đ" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Thu hộ</label>
                <InputNumber v-model="form.thu_ho" mode="decimal" :useGrouping="true" suffix=" đ" fluid />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">CCCD</label>
              <InputText v-model="form.so_cccd" fluid />
            </div>
          </div>

          <div class="card">
            <div class="form-section-title">Thanh toán & Giao hàng</div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Trạng thái thu</label>
                <Select v-model="form.trang_thai_thu" :options="trangThaiThuOptions" optionLabel="label" optionValue="value" fluid />
              </div>
              <div class="form-group">
                <label class="form-label">Hình thức giao</label>
                <Select v-model="form.hinh_thuc_giao" :options="hinhThucGiaoOptions" optionLabel="label" optionValue="value" fluid />
              </div>
            </div>
            <div class="form-group" style="margin-top: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <Checkbox v-model="form.can_xuat_hddt" :binary="true" inputId="hddt" />
                <label for="hddt" style="font-weight: 500; cursor: pointer; font-size: 0.85rem;">Cần xuất hóa đơn điện tử</label>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions" style="border-top: none; padding-top: 0;">
            <Button :label="isEdit ? 'Cập nhật' : 'Lưu biên nhận'" icon="pi pi-check" :loading="saving" @click="save" />
            <Button v-if="!isEdit" label="Lưu & Tạo tiếp" icon="pi pi-plus" severity="secondary" :loading="saving" @click="save" />
            <Button label="Hủy" severity="secondary" text @click="router.push('/bien-nhan')" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bn-form-container {
  max-width: 100%;
}

.bn-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  align-items: start;
}

.bn-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ma-preview {
  background: var(--primary-light);
  color: var(--primary-dark);
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius);
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
}

.req { color: var(--danger); }
</style>
