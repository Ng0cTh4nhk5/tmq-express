<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import StatusStepper from './StatusStepper.vue';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../api/client';

const auth = useAuthStore();

const props = defineProps({
  mode: { type: String, default: 'empty' }, // empty | view | edit | create
  bienNhan: { type: Object, default: null },
  vpGiaoDich: { type: Number, default: null },
  ngayGiaoDich: { type: Date, default: null },
  vanPhongs: { type: Array, default: () => [] },
  chanhs: { type: Array, default: () => [] },
  nvTen: { type: String, default: '' },
});

const emit = defineEmits(['save', 'save-continue', 'delete', 'cancel', 'edit', 'print', 'status-updated']);

// ── Hàng hoá đơn vị cố định ──────────────────────────────────────
const HANG_HOA_UNITS = ['Kiện', 'Bao', 'Thùng', 'Cuộn', 'Pallet', 'Cái', 'Bộ'];

function makeEmptyHangHoa() {
  return HANG_HOA_UNITS.map(don_vi => ({ don_vi, so_luong: null, ghi_chu: '' }));
}

// ── Form data ─────────────────────────────────────────────────────
const form = ref(createEmptyForm());

function createEmptyForm() {
  return {
    ngay_bien_nhan: new Date(),
    gio_tao: new Date().toTimeString().slice(0, 5),
    ma_so_custom: '',
    van_phong_nhan_id: null,
    chanh_id: null,
    gia_cuoc: 0,
    trang_thai_thu: 'da_thu',
    don_vi_gui: '',
    nguoi_gui: '',
    dien_thoai_gui: '',
    dia_chi_gui: '',
    so_cccd_gui: '',
    don_vi_nhan: '',
    nguoi_nhan: '',
    dien_thoai_nhan: '',
    dia_chi_nhan: '',
    so_cccd_nhan: '',
    hang_hoa_json: makeEmptyHangHoa(),
    hang_hoa_khac: '', // ô "Khác" — text tự do
    hang_hu_khong_den: true,  // Mặc định luôn tick
    gia_tri_hang: null,
    trong_luong: null,
    hinh_thuc_giao: null,     // Nhân viên phải chọn thủ công
    thu_ho: 0,
    can_xuat_hddt: false,
  };
}

// ── Chành lọc theo VP nhận ────────────────────────────────────────
const chanhOptions = computed(() => {
  if (!form.value.van_phong_nhan_id) return props.chanhs;
  return props.chanhs.filter(c => c.van_phong_id === form.value.van_phong_nhan_id);
});

// ── VP nhận options (cho phép cùng VP gửi) ──────────────────────────────────
const vpNhanOptions = computed(() => props.vanPhongs);

// Reset chành và tự điền mã mới khi đổi VP nhận
watch(() => form.value.van_phong_nhan_id, () => {
  form.value.chanh_id = null;
  if (props.mode === 'create') fetchNextMaSo();
});

// ── Autocomplete KH ──────────────────────────────────────────────
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
  form.value.don_vi_gui     = kh.ten_don_vi   || '';
  form.value.nguoi_gui      = kh.nguoi_lien_he || '';
  form.value.dien_thoai_gui = kh.dien_thoai   || '';
  form.value.so_cccd_gui    = kh.so_cccd      || '';
  form.value.dia_chi_gui    = kh.dia_chi      || '';
  // Xóa lỗi các trường vừa điền
  delete errors.value.don_vi_gui;
  delete errors.value.dien_thoai_gui;
}

function onSelectNhan(event) {
  const kh = event.value;
  form.value.don_vi_nhan     = kh.ten_don_vi   || '';
  form.value.nguoi_nhan      = kh.nguoi_lien_he || '';
  form.value.dien_thoai_nhan = kh.dien_thoai   || '';
  form.value.so_cccd_nhan    = kh.so_cccd      || '';
  form.value.dia_chi_nhan    = kh.dia_chi      || '';
  delete errors.value.don_vi_nhan;
  delete errors.value.dien_thoai_nhan;
}

// ── Load biên nhận vào form ───────────────────────────────────────
watch(() => props.bienNhan, (bn) => {
  if (!bn) return;
  if (props.mode === 'view' || props.mode === 'edit') {
    form.value = {
      ngay_bien_nhan: bn.ngay_bien_nhan ? new Date(bn.ngay_bien_nhan) : new Date(),
      gio_tao: bn.gio_tao || '',
      ma_so_custom: '',
      van_phong_nhan_id: bn.van_phong_nhan_id,
      chanh_id: bn.chanh_id || null,
      gia_cuoc: Number(bn.gia_cuoc) || 0,
      trang_thai_thu: bn.trang_thai_thu,
      don_vi_gui: bn.don_vi_gui || '',
      nguoi_gui: bn.nguoi_gui || '',
      dien_thoai_gui: bn.dien_thoai_gui || '',
      dia_chi_gui: bn.dia_chi_gui || '',
      so_cccd_gui: bn.so_cccd_gui || '',
      don_vi_nhan: bn.don_vi_nhan || '',
      nguoi_nhan: bn.nguoi_nhan || '',
      dien_thoai_nhan: bn.dien_thoai_nhan || '',
      dia_chi_nhan: bn.dia_chi_nhan || '',
      so_cccd_nhan: bn.so_cccd_nhan || '',
      hang_hoa_json: bn.hang_hoa_json?.length
        ? HANG_HOA_UNITS.map(don_vi => {
            const found = bn.hang_hoa_json.find(i => i.don_vi === don_vi);
            return { don_vi, so_luong: found ? found.so_luong : null, ghi_chu: found?.ghi_chu || '' };
          })
        : makeEmptyHangHoa(),
      hang_hoa_khac: (() => {
        if (!bn.hang_hoa_json) return '';
        const khac = bn.hang_hoa_json.find(i => i.don_vi === 'Khác');
        return khac ? `${khac.so_luong || ''} ${khac.ghi_chu || ''}`.trim() : '';
      })(),
      hang_hu_khong_den: bn.hang_hu_khong_den || false,
      gia_tri_hang: bn.gia_tri_hang ? Number(bn.gia_tri_hang) : null,
      trong_luong: bn.trong_luong ? Number(bn.trong_luong) : null,
      hinh_thuc_giao: bn.hinh_thuc_giao || 'goi_dien',
      thu_ho: Number(bn.thu_ho) || 0,
      can_xuat_hddt: bn.can_xuat_hddt || false,
    };
  }
}, { immediate: true });

// ── Create mode: reset form ───────────────────────────────────────
watch(() => props.mode, (m) => {
  if (m === 'create') {
    form.value = createEmptyForm();
    if (props.ngayGiaoDich) {
      form.value.ngay_bien_nhan = new Date(props.ngayGiaoDich);
    }
    // Auto-fill mã dự kiến
    fetchNextMaSo();
  }
});

// ── Lấy mã biên nhận dự kiến ─────────────────────────────────────
async function fetchNextMaSo() {
  if (!props.vpGiaoDich || !form.value.van_phong_nhan_id) return;
  try {
    const d = form.value.ngay_bien_nhan instanceof Date
      ? form.value.ngay_bien_nhan
      : new Date();
    const ngay = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const { data: res } = await api.get('/bien-nhan/next-ma-so', {
      params: { vp_gui_id: props.vpGiaoDich, vp_nhan_id: form.value.van_phong_nhan_id, ngay },
    });
    form.value.ma_so_custom = res.data || res.ma_so || '';
  } catch {
    form.value.ma_so_custom = '';
  }
}

// ── Computed ──────────────────────────────────────────────────────
const isEditable = computed(() => props.mode === 'edit' || props.mode === 'create');
const displayMaSo = computed(() => {
  if (props.mode === 'view') return props.bienNhan?.ma_so || '';
  // edit: hiện mã hiện tại (không đổi)
  if (props.mode === 'edit') return props.bienNhan?.ma_so || '';
  return form.value.ma_so_custom || '';
});
const displayNV = computed(() => {
  if (props.mode === 'view' || props.mode === 'edit') return props.bienNhan?.nhan_vien_nhap?.ten || '';
  return props.nvTen;
});
const displayDate = computed(() => {
  if (props.mode === 'view' || props.mode === 'edit') {
    const bn = props.bienNhan;
    if (!bn) return '';
    const d = new Date(bn.ngay_bien_nhan);
    return d.toLocaleDateString('vi-VN');
  }
  return form.value.ngay_bien_nhan?.toLocaleDateString('vi-VN') || '';
});
const displayTime = computed(() => {
  if (props.mode === 'view' || props.mode === 'edit') return props.bienNhan?.gio_tao || '';
  return form.value.gio_tao;
});
const displayVpNhan = computed(() => {
  if (props.mode === 'view') {
    return props.bienNhan?.van_phong_nhan?.ten || '';
  }
  return '';
});
const displayChanh = computed(() => {
  if (props.mode === 'view') {
    return props.bienNhan?.chanh?.ten || '—';
  }
  return '';
});

function formatCurrency(v) {
  if (!v) return '—';
  return Number(v).toLocaleString('vi-VN') + 'đ';
}

// ── Build payload cho save ────────────────────────────────────────
function buildPayload() {
  const p = { ...form.value };
  p.van_phong_gui_id = props.vpGiaoDich;
  if (p.ngay_bien_nhan instanceof Date) {
    const y = p.ngay_bien_nhan.getFullYear();
    const m = String(p.ngay_bien_nhan.getMonth() + 1).padStart(2, '0');
    const d = String(p.ngay_bien_nhan.getDate()).padStart(2, '0');
    p.ngay_bien_nhan = `${y}-${m}-${d}`;
  }
  // Merge ô "Khác" vào hang_hoa_json
  let items = (p.hang_hoa_json || []).filter(i => Number(i.so_luong) > 0);
  if (p.hang_hoa_khac?.trim()) {
    items.push({ don_vi: 'Khác', so_luong: 1, ghi_chu: p.hang_hoa_khac.trim() });
  }
  p.hang_hoa_json = items;
  // Giao hàng: địa chỉ giao = địa chỉ người nhận
  p.dia_chi_giao = p.dia_chi_nhan || null;
  delete p.hang_hoa_khac;
  // Giữ ma_so_custom nếu đang tạo mới (người dùng có thể sửa mã)
  if (props.mode !== 'create' || !p.ma_so_custom?.trim()) {
    delete p.ma_so_custom;
  }
  return p;
}

// ── Validation ────────────────────────────────────────────────
const errors = ref({});
// Fix 3.1: Regex số điện thoại VN (10 chữ số, bắt đầu bằng 0)
const PHONE_REGEX = /^0[3-9]\d{8}$|^02\d{9}$/;

function validate() {
  const e = {};
  const f = form.value;

  if (!f.van_phong_nhan_id)
    e.van_phong_nhan_id = 'Vui lòng chọn địa điểm đến';

  if (!f.don_vi_gui?.trim() && !f.nguoi_gui?.trim())
    e.don_vi_gui = 'Vui lòng nhập đơn vị hoặc tên người gửi';

  // Fix 3.1: Kiểm tra định dạng số điện thoại
  const dtGui = f.dien_thoai_gui?.trim();
  if (!dtGui)
    e.dien_thoai_gui = 'Số điện thoại người gửi là bắt buộc';
  else if (!PHONE_REGEX.test(dtGui))
    e.dien_thoai_gui = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  if (!f.don_vi_nhan?.trim() && !f.nguoi_nhan?.trim())
    e.don_vi_nhan = 'Vui lòng nhập đơn vị hoặc tên người nhận';

  const dtNhan = f.dien_thoai_nhan?.trim();
  if (!dtNhan)
    e.dien_thoai_nhan = 'Số điện thoại người nhận là bắt buộc';
  else if (!PHONE_REGEX.test(dtNhan))
    e.dien_thoai_nhan = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  const coHang = f.hang_hoa_json?.some(i => Number(i.so_luong) > 0) || f.hang_hoa_khac?.trim();
  if (!coHang)
    e.hang_hoa = 'Vui lòng nhập ít nhất một mặt hàng và số lượng';

  // Fix 3.2: Chỉ bắt buộc hiọm thức giao khi tạo mới — khi sửa BN cũ có thể NULL
  if (props.mode === 'create' && !f.hinh_thuc_giao)
    e.hinh_thuc_giao = 'Vui lòng chọn hình thức giao hàng';

  errors.value = e;

  // Fix 3.3: Auto-scroll đến field lỗi đầu tiên
  if (Object.keys(e).length > 0) {
    nextTick(() => {
      const el = document.querySelector('.panel-scroll .field-error, .panel-scroll .p-invalid');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return Object.keys(e).length === 0;
}

function onSave() {
  if (!validate()) return;
  emit('save', buildPayload());
}
function onSaveContinue() {
  if (!validate()) return;
  emit('save-continue', buildPayload());
}
function onDelete() { emit('delete'); }
function onCancel() { errors.value = {}; emit('cancel'); }
function onEdit()   { emit('edit'); }
function onPrint()  { emit('print'); }

// ── Status transition ─────────────────────────────────────────────
const TRANG_THAI_ORDER = ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'];
const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ vận chuyển', dang_vc: 'Đang vận chuyển', da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách', khach_da_nhan: 'Khách đã nhận',
};
const TRANG_THAI_ICONS = {
  cho_vc: 'pi pi-box', dang_vc: 'pi pi-truck', da_den_kho: 'pi pi-building',
  da_bao_khach: 'pi pi-phone', khach_da_nhan: 'pi pi-check-circle',
};

const statusConfirmVisible = ref(false);
const statusGhiChu = ref('');
const statusUpdating = ref(false);
const lichSu = ref([]);
const lichSuLoading = ref(false);

const canUpdateStatus = computed(() => {
  return auth.hasRole('admin', 'staff') && props.mode === 'view' && props.bienNhan;
});

const nextTrangThai = computed(() => {
  if (!props.bienNhan) return null;
  const idx = TRANG_THAI_ORDER.indexOf(props.bienNhan.trang_thai);
  if (idx < 0 || idx >= TRANG_THAI_ORDER.length - 1) return null;
  return TRANG_THAI_ORDER[idx + 1];
});

const isTerminal = computed(() => props.bienNhan?.trang_thai === 'khach_da_nhan');

function openStatusConfirm() {
  statusGhiChu.value = '';
  statusConfirmVisible.value = true;
}

async function confirmStatusUpdate() {
  if (!nextTrangThai.value || !props.bienNhan) return;
  statusUpdating.value = true;
  try {
    await api.patch(`/bien-nhan/${props.bienNhan.id}/trang-thai`, {
      trang_thai: nextTrangThai.value,
      ghi_chu: statusGhiChu.value || undefined,
      phuong_thuc: 'manual',
    });
    statusConfirmVisible.value = false;
    emit('status-updated');
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Cập nhật thất bại');
  } finally {
    statusUpdating.value = false;
  }
}

async function loadLichSu() {
  if (!props.bienNhan) return;
  lichSuLoading.value = true;
  try {
    const { data: res } = await api.get(`/scan/${props.bienNhan.ma_so}`);
    lichSu.value = res.data?.lich_su || [];
  } catch {
    lichSu.value = [];
  } finally {
    lichSuLoading.value = false;
  }
}

watch(() => props.bienNhan?.id, (id) => {
  if (id && props.mode === 'view') loadLichSu();
}, { immediate: true });

function formatDateTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('vi-VN');
}

defineExpose({ buildPayload, validate });
</script>

<template>
  <div class="right-panel" :class="{ 'mode-empty': mode === 'empty', 'view-mode': !isEditable }">
    <!-- EMPTY STATE -->
    <div v-if="mode === 'empty'" class="empty-state">
      <i class="pi pi-file-edit"></i>
      <p>Chọn biên nhận từ danh sách<br>hoặc bấm <strong>Thêm</strong> để tạo mới</p>
    </div>

    <!-- FORM / VIEW -->
    <div v-else class="panel-scroll">
      <!-- ═══ HEADER INFO ═══ -->
      <div class="header-info">
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Thời gian:</span>
            <span class="field-val" v-if="!isEditable">{{ displayDate }} {{ displayTime }}</span>
            <div v-else class="inline-inputs">
              <DatePicker
                v-model="form.ngay_bien_nhan"
                dateFormat="dd/mm/yy"
                showIcon
                class="dp-compact"
              />
              <InputText v-model="form.gio_tao" placeholder="HH:mm" class="time-input" />
            </div>
          </div>
          <div class="info-field">
            <span class="field-lbl">NV thực hiện:</span>
            <span class="field-val nv-name">{{ displayNV }}</span>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Mã số:</span>
            <span class="field-val ma-so" v-if="!isEditable || mode === 'edit'">{{ displayMaSo }}</span>
            <InputText v-else v-model="form.ma_so_custom" class="ma-so-input" />
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Giá cước:</span>
            <span class="field-val cuoc" v-if="!isEditable">{{ formatCurrency(bienNhan?.gia_cuoc) }}</span>
            <div v-else class="input-addon compact">
              <input type="number" v-model.number="form.gia_cuoc" min="0" step="1000" class="p-inputtext p-component input-addon-field" />
              <span class="input-addon-suffix">đ</span>
            </div>
          </div>
          <div class="info-field radio-group">
            <template v-if="isEditable">
              <RadioButton v-model="form.trang_thai_thu" value="da_thu" inputId="tt_da" />
              <label for="tt_da" class="radio-lbl">Đã thu</label>
              <RadioButton v-model="form.trang_thai_thu" value="chua_thu" inputId="tt_ct" />
              <label for="tt_ct" class="radio-lbl">Chưa thu</label>
              <RadioButton v-model="form.trang_thai_thu" value="cong_no" inputId="tt_cn" />
              <label for="tt_cn" class="radio-lbl">Công nợ</label>
            </template>
            <template v-else>
              <span class="badge" :class="'badge-' + (bienNhan?.trang_thai_thu || 'da_thu')">
                {{ { da_thu: 'Đã thu', chua_thu: 'Chưa thu', cong_no: 'Công nợ' }[bienNhan?.trang_thai_thu] || '' }}
              </span>
            </template>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Địa điểm đến:</span>
            <Select v-if="isEditable" v-model="form.van_phong_nhan_id" :options="vpNhanOptions" optionLabel="label" optionValue="value" placeholder="Chọn VP nhận" class="select-compact" :class="{ 'p-invalid': errors.van_phong_nhan_id }" />
            <span v-if="errors.van_phong_nhan_id" class="error-msg">{{ errors.van_phong_nhan_id }}</span>
            <span v-else-if="!isEditable" class="field-val">{{ displayVpNhan }}</span>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Gửi tới:</span>
            <Select v-if="isEditable" v-model="form.chanh_id" :options="chanhOptions" optionLabel="ten" optionValue="id" placeholder="Chọn chành..." showClear class="select-compact" :disabled="!form.van_phong_nhan_id" />
            <span v-else class="field-val">{{ displayChanh }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ NGƯỜI GỬI ═══ -->
      <div class="group-box sender">
        <div class="group-title">Thông tin người gửi</div>
        <div class="field-full" :class="{ 'field-error': errors.don_vi_gui }">
          <span class="field-lbl lbl-fixed">Đơn vị gửi:</span>
          <template v-if="isEditable">
            <AutoComplete
              v-model="form.don_vi_gui"
              :suggestions="guiSuggestions"
              field="ten_don_vi"
              @complete="(e) => searchKH(e, 'gui')"
              @item-select="onSelectGui"
              @input="delete errors.don_vi_gui"
              placeholder="Gõ tên đơn vị hoặc số điện thoại..."
              class="ac-full"
            >
              <template #option="{ option }">
                <div class="ac-option">
                  <span class="ac-name">{{ option.ten_don_vi }}</span>
                  <span class="ac-sub">{{ option.dien_thoai }}{{ option.nguoi_lien_he ? ' — ' + option.nguoi_lien_he : '' }}</span>
                </div>
              </template>
            </AutoComplete>
            <span v-if="errors.don_vi_gui" class="error-msg">{{ errors.don_vi_gui }}</span>
          </template>
          <span v-else class="field-val">{{ bienNhan?.don_vi_gui || '—' }}</span>
        </div>
        <div class="field-row-3">
          <div class="f-inline f-name">
            <span class="field-lbl lbl-fixed">Người gửi:</span>
            <InputText v-if="isEditable" v-model="form.nguoi_gui" class="input-full" />
            <span v-else class="field-val">{{ bienNhan?.nguoi_gui || '—' }}</span>
          </div>
          <div class="f-inline f-phone" :class="{ 'field-error': errors.dien_thoai_gui }">
            <span class="field-lbl">Điện thoại:</span>
            <template v-if="isEditable">
              <InputText v-model="form.dien_thoai_gui" class="input-full" :class="{ 'p-invalid': errors.dien_thoai_gui }" @input="delete errors.dien_thoai_gui" />
              <span v-if="errors.dien_thoai_gui" class="error-msg">{{ errors.dien_thoai_gui }}</span>
            </template>
            <span v-else class="field-val">{{ bienNhan?.dien_thoai_gui || '—' }}</span>
          </div>
          <div class="f-inline f-cccd">
            <span class="field-lbl">CCCD:</span>
            <InputText v-if="isEditable" v-model="form.so_cccd_gui" class="input-full" />
            <span v-else class="field-val">{{ bienNhan?.so_cccd_gui || '—' }}</span>
          </div>
        </div>
        <div class="field-full">
          <span class="field-lbl lbl-fixed">Địa chỉ:</span>
          <InputText v-if="isEditable" v-model="form.dia_chi_gui" class="input-full" />
          <span v-else class="field-val">{{ bienNhan?.dia_chi_gui || '—' }}</span>
        </div>
      </div>

      <!-- ═══ NGƯỜI NHẬN ═══ -->
      <div class="group-box receiver">
        <div class="group-title">Thông tin người nhận</div>
        <div class="field-full" :class="{ 'field-error': errors.don_vi_nhan }">
          <span class="field-lbl lbl-fixed">Đơn vị nhận:</span>
          <template v-if="isEditable">
            <AutoComplete
              v-model="form.don_vi_nhan"
              :suggestions="nhanSuggestions"
              field="ten_don_vi"
              @complete="(e) => searchKH(e, 'nhan')"
              @item-select="onSelectNhan"
              @input="delete errors.don_vi_nhan"
              placeholder="Gõ tên đơn vị hoặc số điện thoại..."
              class="ac-full"
            >
              <template #option="{ option }">
                <div class="ac-option">
                  <span class="ac-name">{{ option.ten_don_vi }}</span>
                  <span class="ac-sub">{{ option.dien_thoai }}{{ option.nguoi_lien_he ? ' — ' + option.nguoi_lien_he : '' }}</span>
                </div>
              </template>
            </AutoComplete>
            <span v-if="errors.don_vi_nhan" class="error-msg">{{ errors.don_vi_nhan }}</span>
          </template>
          <span v-else class="field-val">{{ bienNhan?.don_vi_nhan || '—' }}</span>
        </div>
        <div class="field-row-3">
          <div class="f-inline f-name">
            <span class="field-lbl lbl-fixed">Người nhận:</span>
            <InputText v-if="isEditable" v-model="form.nguoi_nhan" class="input-full" />
            <span v-else class="field-val">{{ bienNhan?.nguoi_nhan || '—' }}</span>
          </div>
          <div class="f-inline f-phone" :class="{ 'field-error': errors.dien_thoai_nhan }">
            <span class="field-lbl">Điện thoại:</span>
            <template v-if="isEditable">
              <InputText v-model="form.dien_thoai_nhan" class="input-full" :class="{ 'p-invalid': errors.dien_thoai_nhan }" @input="delete errors.dien_thoai_nhan" />
              <span v-if="errors.dien_thoai_nhan" class="error-msg">{{ errors.dien_thoai_nhan }}</span>
            </template>
            <span v-else class="field-val">{{ bienNhan?.dien_thoai_nhan || '—' }}</span>
          </div>
          <div class="f-inline f-cccd">
            <span class="field-lbl">CCCD:</span>
            <InputText v-if="isEditable" v-model="form.so_cccd_nhan" class="input-full" />
            <span v-else class="field-val">{{ bienNhan?.so_cccd_nhan || '—' }}</span>
          </div>
        </div>
        <div class="field-full">
          <span class="field-lbl lbl-fixed">Địa chỉ:</span>
          <InputText v-if="isEditable" v-model="form.dia_chi_nhan" class="input-full" placeholder="Địa chỉ giao hàng..." />
          <span v-else class="field-val">{{ bienNhan?.dia_chi_nhan || '—' }}</span>
        </div>
      </div>

      <!-- ═══ HÀNG HÓA ═══ -->
      <div class="group-box goods">
        <div class="group-title">Thông tin hàng</div>
        <template v-if="isEditable">
          <div class="hh-grid" :class="{ 'field-error': errors.hang_hoa }">
            <div v-for="item in form.hang_hoa_json" :key="item.don_vi" class="hh-item" :class="{ filled: Number(item.so_luong) > 0 }">
              <span class="hh-label">{{ item.don_vi }}</span>
              <InputNumber v-model="item.so_luong" :min="0" :maxFractionDigits="0" showButtons buttonLayout="horizontal" incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" :step="1" class="hh-num" placeholder="0" @update:modelValue="delete errors.hang_hoa" />
              <InputText v-model="item.ghi_chu" class="hh-note" placeholder="Ghi chú..." />
            </div>
            <!-- Ô Khác: text tự do -->
            <div class="hh-item hh-other">
              <span class="hh-label">Khác</span>
              <InputText v-model="form.hang_hoa_khac" class="hh-other-input" placeholder="Nhập nội dung tùy ý..." @input="delete errors.hang_hoa" />
            </div>
          </div>
          <span v-if="errors.hang_hoa" class="error-msg" style="display:block;margin-top:2px;">{{ errors.hang_hoa }}</span>
          <div class="check-row">
            <Checkbox v-model="form.hang_hu_khong_den" :binary="true" inputId="hh_hu" />
            <label for="hh_hu" class="check-lbl">Hàng hư/hỏng/bể không đền</label>
          </div>
        </template>
        <template v-else>
          <div class="field-val goods-summary" style="margin-bottom:0.1rem;">{{ bienNhan?.ten_hang_hoa || '—' }}</div>
          <div v-if="bienNhan?.hang_hu_khong_den" style="margin-bottom:0.2rem;">
            <span class="badge badge-danger" style="display:inline-block;">Hàng hư/hỏng/bể không đền</span>
          </div>
        </template>
        <div class="field-row-2">
          <div class="f-50"><span class="field-lbl">Giá trị hàng:</span>
            <template v-if="isEditable">
              <div class="input-addon compact">
                <input type="number" v-model.number="form.gia_tri_hang" min="0" step="1000" class="p-inputtext p-component input-addon-field" />
                <span class="input-addon-suffix">đ</span>
              </div>
            </template>
            <span v-else class="field-val">{{ formatCurrency(bienNhan?.gia_tri_hang) }}</span>
          </div>
          <div class="f-50"><span class="field-lbl">Trọng lượng:</span>
            <template v-if="isEditable">
              <div class="input-addon compact">
                <input type="number" v-model.number="form.trong_luong" min="0" step="0.1" class="p-inputtext p-component input-addon-field" />
                <span class="input-addon-suffix">Kg</span>
              </div>
            </template>
            <span v-else class="field-val">{{ bienNhan?.trong_luong ? bienNhan.trong_luong + ' Kg' : '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ THANH TOÁN & GIAO HÀNG ═══ -->
      <div class="group-box payment">
        <div class="group-title">Thanh toán & Giao hàng</div>
        <div class="radio-row" v-if="isEditable" :class="{ 'field-error': errors.hinh_thuc_giao }">
          <RadioButton v-model="form.hinh_thuc_giao" value="tan_noi" inputId="ht_tn" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_tn" class="radio-lbl">Giao tận nơi</label>
          <RadioButton v-model="form.hinh_thuc_giao" value="goi_dien" inputId="ht_gd" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_gd" class="radio-lbl">Gọi điện đến nhận</label>
          <RadioButton v-model="form.hinh_thuc_giao" value="tu_toi" inputId="ht_tt" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_tt" class="radio-lbl">Tự đến lấy</label>
        </div>
        <span v-if="isEditable && errors.hinh_thuc_giao" class="error-msg" style="display:block;margin-bottom:4px;">{{ errors.hinh_thuc_giao }}</span>
        <div v-if="!isEditable" class="field-val" style="margin-bottom:0.3rem; display:flex; align-items:baseline; gap:0.35rem;">
          <span class="field-lbl">Hình thức giao hàng:</span> {{ { tan_noi: 'Giao tận nơi', goi_dien: 'Gọi điện', tu_toi: 'Tự đến nhận' }[bienNhan?.hinh_thuc_giao] || '' }}
        </div>
        <div class="field-row-2">
          <div class="f-50"><span class="field-lbl">Thu hộ (COD):</span>
            <template v-if="isEditable">
              <div class="input-addon compact">
                <input type="number" v-model.number="form.thu_ho" min="0" step="1000" class="p-inputtext p-component input-addon-field" />
                <span class="input-addon-suffix">đ</span>
              </div>
            </template>
            <span v-else class="field-val">{{ formatCurrency(bienNhan?.thu_ho) }}</span>
            <!-- Badge TT COD -->
            <span
              v-if="!isEditable && Number(bienNhan?.thu_ho) > 0 && bienNhan?.trang_thai_cod && bienNhan.trang_thai_cod !== 'khong_co'"
              class="badge"
              :class="{
                'badge-warning': bienNhan.trang_thai_cod === 'cho_thu',
                'badge-info': bienNhan.trang_thai_cod === 'da_thu',
                'badge-help': bienNhan.trang_thai_cod === 'da_chuyen',
                'badge-success': bienNhan.trang_thai_cod === 'da_tra',
              }"
              style="margin-left: 0.4rem; font-size: 0.7rem;"
            >
              {{ { cho_thu: 'COD: Chờ thu', da_thu: 'COD: Đã thu', da_chuyen: 'COD: Đã chuyển', da_tra: 'COD: Hoàn tất' }[bienNhan.trang_thai_cod] }}
            </span>
          </div>
          <div class="f-50" v-if="isEditable">
            <div class="check-row">
              <Checkbox v-model="form.can_xuat_hddt" :binary="true" inputId="hddt" />
              <label for="hddt" class="check-lbl">Cần xuất HĐĐT</label>
            </div>
          </div>
          <div v-else-if="bienNhan?.can_xuat_hddt" class="f-50">
            <span class="badge badge-info">Cần xuất HĐĐT</span>
          </div>
        </div>
      </div>

      <!-- ═══ TRẠNG THÁI VẬN CHUYỂN ═══ -->
      <div v-if="mode === 'view' && bienNhan" class="group-box status-section">
        <div class="group-title">Trạng thái vận chuyển</div>
        <StatusStepper :current="bienNhan.trang_thai" style="margin-bottom: 0.75rem;" />

        <!-- Next step button -->
        <div v-if="canUpdateStatus && nextTrangThai" class="status-action">
          <Button
            :label="'Chuyển sang: ' + TRANG_THAI_LABELS[nextTrangThai]"
            :icon="TRANG_THAI_ICONS[nextTrangThai]"
            severity="info"
            size="small"
            class="status-btn"
            @click="openStatusConfirm"
          />
        </div>
        <div v-else-if="isTerminal" class="status-terminal">
          <i class="pi pi-check-circle"></i> Đã hoàn tất giao hàng
        </div>

        <!-- Timeline -->
        <div v-if="lichSu.length" class="status-timeline">
          <div class="timeline-title">Lịch sử</div>
          <div v-for="(item, i) in lichSu" :key="i" class="tl-item">
            <div class="tl-dot" :class="{ current: i === 0 }"></div>
            <div class="tl-content">
              <strong>{{ TRANG_THAI_LABELS[item.trang_thai_moi] || item.trang_thai_moi }}</strong>
              <span class="tl-time">{{ formatDateTime(item.created_at) }}</span>
              <span v-if="item.ghi_chu" class="tl-note">{{ item.ghi_chu }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Status confirm dialog -->
      <Dialog v-model:visible="statusConfirmVisible" header="Xác nhận chuyển trạng thái" :modal="true" :style="{ width: '400px' }">
        <div class="confirm-content">
          <p>Biên nhận: <strong>{{ bienNhan?.ma_so }}</strong></p>
          <p>Trạng thái hiện tại: <strong>{{ TRANG_THAI_LABELS[bienNhan?.trang_thai] }}</strong></p>
          <p>Chuyển sang: <strong style="color: #2563eb;">{{ TRANG_THAI_LABELS[nextTrangThai] }}</strong></p>
          <div style="margin-top: 0.75rem;">
            <label class="form-label" style="font-size:0.78rem;">Ghi chú (tùy chọn):</label>
            <InputText v-model="statusGhiChu" placeholder="Nhập ghi chú..." fluid />
          </div>
        </div>
        <template #footer>
          <Button label="Hủy" severity="secondary" text size="small" @click="statusConfirmVisible = false" />
          <Button label="Xác nhận" icon="pi pi-check" size="small" :loading="statusUpdating" @click="confirmStatusUpdate" />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<style scoped>
/* ── Validation errors ─────────────────────────────────────────── */
.error-msg {
  color: #ef4444;
  font-size: 0.7rem;
  margin-top: 2px;
  display: block;
}

.field-error .p-inputtext,
.field-error .p-autocomplete .p-inputtext {
  border-color: #ef4444 !important;
}

.field-error .hh-grid {
  outline: 1.5px solid #ef4444;
  border-radius: 6px;
}

.field-error .radio-row {
  background: #fff1f1;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  padding: 4px 8px;
}

/* ── Autocomplete option card ───────────────────────────────────── */
.ac-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 0;
}

.ac-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.ac-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.right-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.mode-empty {
  justify-content: center;
  align-items: center;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
}

.empty-state i {
  font-size: 2.5rem;
  opacity: 0.25;
  margin-bottom: 0.75rem;
}

.empty-state p {
  font-size: 0.85rem;
  line-height: 1.6;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Header info ── */
.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.info-row-2 {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.info-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.field-lbl {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.lbl-fixed {
  width: 75px; /* Căn chỉnh thẳng hàng cho cột đầu tiên */
}

.field-val {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

.ma-so {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  letter-spacing: 0.03em;
  color: var(--primary);
}

.nv-name { color: var(--text-secondary); }
.cuoc { color: #dc2626; font-size: 0.9rem; }

.inline-inputs {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex: 1;
}

:deep(.dp-compact) { max-width: 135px; }
:deep(.dp-compact .p-inputtext) { font-size: 0.8rem; padding: 0.2rem 0.4rem; height: 28px; }
.time-input { width: 55px; font-size: 0.8rem !important; padding: 0.2rem 0.4rem !important; height: 28px; text-align: center; }
.ma-so-input { max-width: 140px; font-size: 0.82rem !important; font-family: monospace; padding: 0.2rem 0.4rem !important; height: 28px; }
:deep(.select-compact) { flex: 1; }
:deep(.select-compact .p-select-label) { font-size: 0.82rem; padding: 0.2rem 0.4rem; }

/* ── Radio group ── */
.radio-group, .radio-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.radio-lbl {
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  margin-right: 0.5rem;
  color: var(--text-secondary);
}

/* ── GroupBox ── */
.group-box {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.group-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
}

.sender { border-left: 3px solid #3b82f6; }
.sender .group-title { color: #3b82f6; }
.receiver { border-left: 3px solid #10b981; }
.receiver .group-title { color: #10b981; }
.goods { border-left: 3px solid #f59e0b; }
.goods .group-title { color: #f59e0b; }
.payment { border-left: 3px solid #8b5cf6; }
.payment .group-title { color: #8b5cf6; }

/* ── Field layouts ── */
.field-full {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.field-row-2 {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.field-row-3 {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

/* Fix baseline trong chế độ View Mode */
.view-mode .field-full,
.view-mode .f-inline,
.view-mode .info-field,
.view-mode .info-row-2,
.view-mode .field-row-2,
.view-mode .f-50,
.view-mode .f-40,
.view-mode .f-30 {
  align-items: baseline !important;
}

/* Đóng gói lại các khung hình 50% rộng để ôm sát nội dung (bỏ trống thừa) */
.view-mode .info-field,
.view-mode .f-50,
.view-mode .f-40,
.view-mode .f-30 {
  flex: 0 0 auto !important; /* Mất flex: 1 */
}

/* Đảm bảo cột thứ nhất dãn cố định tạo Line dọc thẳng thớm cho cột thứ hai */
.view-mode .info-row-2 > .info-field:first-child,
.view-mode .field-row-2 > .f-50:first-child {
  flex: 0 0 230px !important; 
}

/* Thiết lập chia cột ngang cho các input đã bị tách dọc từ Sửa form */
.view-mode .f-50,
.view-mode .f-40,
.view-mode .f-30 {
  flex-direction: row !important;
  gap: 0.35rem !important; /* Khe hở giữa nhãn và giá trị */
}

/* Khe hở nhỏ gọn khi đã dùng column width cố định */
.view-mode .info-row-2,
.view-mode .field-row-2 {
  justify-content: flex-start !important;
  gap: 0.5rem !important;
}

.f-40 { flex: 4; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.f-30 { flex: 3; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.f-50 { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }

/* Label + input nằm cùng 1 hàng trong field-row-3 */
.f-inline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;
}

.f-inline .field-lbl {
  white-space: nowrap;
  flex-shrink: 0;
}

.f-inline .input-full {
  flex: 1;
  min-width: 0;
}

.f-inline .field-val {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.f-name { flex: 1; }
.f-phone { flex: 0 0 160px; } /* Thu nhỏ cho vừa 10-11 số */
.f-cccd { flex: 0 0 145px; } /* Thu nhỏ cho vừa 12 số CCCD */

.input-full { width: 100%; font-size: 0.82rem !important; }
:deep(.ac-full) { flex: 1; }
:deep(.ac-full .p-autocomplete-input) { font-size: 0.82rem; width: 100%; }

/* ── Hàng hóa grid ── */
.hh-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hh-item {
  display: grid;
  grid-template-columns: 48px auto 1fr;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  transition: border-color 0.15s;
}

.hh-item.filled {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
}

.hh-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-align: right;
}

.hh-item.filled .hh-label { color: var(--primary); }

:deep(.hh-num .p-inputnumber-input) { text-align: center; font-weight: 600; font-size: 0.82rem; padding: 0.15rem 0.2rem; width: 50px; }
:deep(.hh-num .p-inputnumber-button) { width: 1.4rem; padding: 0; }
:deep(.hh-note) { font-size: 0.75rem !important; padding: 0.15rem 0.4rem !important; border-color: transparent !important; background: transparent !important; font-style: italic; color: var(--text-muted); }
:deep(.hh-note:focus) { border-color: var(--primary) !important; background: white !important; }

.hh-other {
  grid-template-columns: 48px 1fr;
  border-style: dashed;
}

:deep(.hh-other-input) {
  font-size: 0.82rem !important;
  padding: 0.2rem 0.4rem !important;
}

.goods-summary {
  font-size: 0.85rem;
  padding: 0.2rem 0;
}

/* ── Checkboxes ── */
.check-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.check-lbl {
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
}

/* ── Compact input-addon ── */
.input-addon.compact { max-width: 160px; }
.input-addon.compact .input-addon-field { font-size: 0.82rem; padding: 0.2rem 0.4rem; height: 28px; }
.input-addon.compact .input-addon-suffix { font-size: 0.78rem; padding: 0 0.5rem; }

/* ── Badge ── */
.badge-danger { background: #fee2e2; color: #991b1b; display: inline-flex; padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
.badge-info { background: #dbeafe; color: #1e40af; display: inline-flex; padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

/* ── Status Section ── */
.status-section {
  border-color: #2563eb !important;
}
.status-section .group-title {
  color: #2563eb !important;
}

.status-action {
  text-align: center;
  margin-bottom: 0.5rem;
}
.status-btn { width: 100%; }

.status-terminal {
  text-align: center;
  color: #22c55e;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem;
  background: #f0fdf4;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.status-timeline {
  border-top: 1px solid var(--border-light);
  padding-top: 0.5rem;
}
.timeline-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.tl-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.3rem 0;
  position: relative;
}
.tl-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 18px;
  bottom: -4px;
  width: 2px;
  background: #e5e7eb;
}
.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
  margin-top: 3px;
  z-index: 1;
}
.tl-dot.current {
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
.tl-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tl-content strong {
  font-size: 0.76rem;
  color: var(--secondary);
}
.tl-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}
.tl-note {
  font-size: 0.68rem;
  color: var(--text-light);
  font-style: italic;
}

.confirm-content p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
}
</style>
