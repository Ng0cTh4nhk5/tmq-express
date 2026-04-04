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
const autoPrint = ref(false);
const editBienNhanId = ref(null);
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
  hang_hu_khong_den: false,
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
      hang_hu_khong_den: bn.hang_hu_khong_den || false,
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
      if (autoPrint.value) {
        openPdf(route.params.id);
      }
      router.push('/bien-nhan');
    } else {
      const { data: res } = await api.post('/bien-nhan', form.value);
      const createdId = res.data?.id || res.id;
      toast.add({ severity: 'success', summary: 'Thành công', detail: `Tạo biên nhận ${previewMaSo.value}`, life: 3000 });
      // Thông báo khách hàng tự tạo
      if (res.auto_created_kh?.length) {
        for (const kh of res.auto_created_kh) {
          toast.add({ severity: 'info', summary: 'Tự tạo khách hàng mới', detail: `${kh.ma_kh} — ${kh.ten_don_vi}`, life: 5000 });
        }
      }
      if (autoPrint.value && createdId) {
        openPdf(createdId);
      }
      router.push('/bien-nhan');
    }
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu biên nhận');
  } finally {
    saving.value = false;
  }
}

async function saveAndContinue() {
  if (!validate()) return;
  saving.value = true;
  try {
    const { data: res } = await api.post('/bien-nhan', form.value);
    const createdId = res.data?.id || res.id;
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Tạo biên nhận ${previewMaSo.value}`, life: 3000 });
    if (res.auto_created_kh?.length) {
      for (const kh of res.auto_created_kh) {
        toast.add({ severity: 'info', summary: 'Tự tạo khách hàng mới', detail: `${kh.ma_kh} — ${kh.ten_don_vi}`, life: 5000 });
      }
    }
    if (autoPrint.value && createdId) {
      openPdf(createdId);
    }
    // Reset form nhưng giữ tuyến
    const vpGui = form.value.van_phong_gui_id;
    const vpNhan = form.value.van_phong_nhan_id;
    const trangThaiThu = form.value.trang_thai_thu;
    const hinhThucGiao = form.value.hinh_thuc_giao;
    form.value = { ...form.value, don_vi_gui: '', nguoi_gui: '', dien_thoai_gui: '', dia_chi_gui: '', don_vi_nhan: '', nguoi_nhan: '', dien_thoai_nhan: '', dia_chi_nhan: '', so_cccd: '', ten_hang_hoa: '', gia_tri_hang: null, trong_luong: null, thu_ho: 0, gia_cuoc: 0, can_xuat_hddt: false, hang_hu_khong_den: false };
    form.value.van_phong_gui_id = vpGui;
    form.value.van_phong_nhan_id = vpNhan;
    form.value.trang_thai_thu = trangThaiThu;
    form.value.hinh_thuc_giao = hinhThucGiao;
    fetchPreviewMaSo();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu biên nhận');
  } finally {
    saving.value = false;
  }
}

function openPdf(id) {
  window.open(`/pdf/bien-nhan/${id}`, '_blank');
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
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                <Checkbox v-model="form.hang_hu_khong_den" :binary="true" inputId="hkd" />
                <label for="hkd" style="font-weight: 500; cursor: pointer; font-size: 0.85rem;">Hàng hư / bể không đền</label>
              </div>
            </div>
          </div>

          <!-- Action bar -->
          <div class="bn-action-bar">
            <div class="bn-action-left">
              <div class="bn-autoprint-toggle">
                <Checkbox v-model="autoPrint" :binary="true" inputId="autoPrint" />
                <label for="autoPrint" class="autoprint-label">
                  <i class="pi pi-print"></i> Lưu và In
                </label>
              </div>
            </div>
            <div class="bn-action-right">
              <Button
                v-if="isEdit"
                label="In biên nhận"
                icon="pi pi-print"
                class="bn-btn-print"
                outlined
                @click="openPdf(route.params.id)"
              />
              <Button
                :label="isEdit ? 'Cập nhật' : 'Lưu biên nhận'"
                :icon="isEdit ? 'pi pi-check' : 'pi pi-save'"
                class="bn-btn-save"
                :loading="saving"
                @click="save"
              />
              <Button
                v-if="!isEdit"
                label="Lưu & Tạo tiếp"
                icon="pi pi-plus-circle"
                class="bn-btn-continue"
                :loading="saving"
                @click="saveAndContinue"
              />
              <Button
                label="Hủy"
                icon="pi pi-times"
                class="bn-btn-cancel"
                text
                @click="router.push('/bien-nhan')"
              />
            </div>
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

/* ═══════════════════════════════════════════ */
/* Action Bar                                 */
/* ═══════════════════════════════════════════ */
.bn-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.bn-action-left {
  display: flex;
  align-items: center;
}

.bn-action-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Autoprint toggle */
.bn-autoprint-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  background: var(--surface-hover);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.bn-autoprint-toggle:has(input:checked) {
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.08);
  border-color: var(--primary);
}

.autoprint-label {
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  user-select: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.bn-autoprint-toggle:has(input:checked) .autoprint-label {
  color: var(--primary);
}

/* Save button — primary, prominent */
:deep(.bn-btn-save) {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-color: #059669 !important;
  color: #fff !important;
  font-weight: 700 !important;
  padding: 0.5rem 1.25rem !important;
  font-size: 0.85rem !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  transition: all 0.2s;
}

:deep(.bn-btn-save:hover) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  transform: translateY(-1px);
}

/* Save & Continue button — accent blue */
:deep(.bn-btn-continue) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border-color: #2563eb !important;
  color: #fff !important;
  font-weight: 600 !important;
  padding: 0.5rem 1rem !important;
  font-size: 0.85rem !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  transition: all 0.2s;
}

:deep(.bn-btn-continue:hover) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transform: translateY(-1px);
}

/* Print button — outlined teal */
:deep(.bn-btn-print) {
  color: #0891b2 !important;
  border-color: #0891b2 !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  transition: all 0.2s;
}

:deep(.bn-btn-print:hover) {
  background: rgba(8, 145, 178, 0.08) !important;
  border-color: #0e7490 !important;
}

/* Cancel button — subtle */
:deep(.bn-btn-cancel) {
  color: var(--text-muted) !important;
  font-weight: 500 !important;
  font-size: 0.82rem !important;
}

:deep(.bn-btn-cancel:hover) {
  color: var(--danger) !important;
}
</style>
