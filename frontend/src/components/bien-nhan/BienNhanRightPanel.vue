<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast'; // [H-02]
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
import StatusBadge from './StatusBadge.vue';
import CodStepper from './CodStepper.vue';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../api/client';
import { formatCurrency, formatDate, formatDateTime, parseDateSafe, toISODate } from '../../utils/format';
import { formatPhone, applyPhoneFormat, PHONE_REGEX } from '../../utils/phone';
import { usePhoneInput } from '../../composables/usePhoneInput';

const auth = useAuthStore();
const toast = useToast(); // [H-02]

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
const HANG_HOA_UNITS = ['Kiện', 'Bao', 'Thùng', 'Gói', 'Bọc', 'Cuộn'];

function makeEmptyHangHoa() {
  return HANG_HOA_UNITS.map(don_vi => ({ don_vi, so_luong: null, ghi_chu: '' }));
}

// ── Phone input composable ───────────────────────────────────────
const { handlePhoneInput } = usePhoneInput();

// ── Form data & Validation state (khai báo sớm — cần trước watchers immediate) ────────
const errors = ref({});

const form = ref(createEmptyForm());

function createEmptyForm() {
  return {
    ngay_bien_nhan: new Date(),
    gio_tao: new Date().toTimeString().slice(0, 5),
    ma_so_custom: '',
    van_phong_nhan_id: null,
    chanh_id: null,
    gia_cuoc: 0,
    trang_thai_thu: null,  // [Fix #3] Không mặc định — bắt buộc chọn
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
    // [NV-3b] Liên kết KH tùy chọn
    kh_gui_id: null,
    kh_nhan_id: null,
    vai_tro_cong_no: 'nguoi_gui', // mặc định: người gửi nợ cước
  };
}

// ── Chành: hiển thị tất cả (không lọc theo VP — chành là điểm gửi tiếp sau VP nhận)
const chanhOptions = computed(() => props.chanhs);

// ── VP nhận options (cho phép cùng VP gửi) ──────────────────────────────────
const vpNhanOptions = computed(() => props.vanPhongs);

// Reset chành và tự điền mã mới khi đổi VP nhận
// Bug 5 fixed: chỉ gọi fetchNextMaSo khi có giá trị (tránh gọi thừa khi clear = null)
watch(() => form.value.van_phong_nhan_id, (newVal) => {
  form.value.chanh_id = null;
  if (props.mode === 'create' && newVal) fetchNextMaSo();
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
  form.value.dien_thoai_gui = applyPhoneFormat(kh.dien_thoai);
  form.value.so_cccd_gui    = kh.so_cccd      || '';
  form.value.dia_chi_gui    = kh.dia_chi      || '';
  form.value.kh_gui_id      = kh.id           || null;  // [NV-3b]
  // Xóa lỗi các trường vừa điền
  delete errors.value.don_vi_gui;
  delete errors.value.dien_thoai_gui;
}

function onSelectNhan(event) {
  const kh = event.value;
  form.value.don_vi_nhan     = kh.ten_don_vi   || '';
  form.value.nguoi_nhan      = kh.nguoi_lien_he || '';
  form.value.dien_thoai_nhan = applyPhoneFormat(kh.dien_thoai);
  form.value.so_cccd_nhan    = kh.so_cccd      || '';
  form.value.dia_chi_nhan    = kh.dia_chi      || '';
  form.value.kh_nhan_id      = kh.id           || null;  // [NV-3b]
  delete errors.value.don_vi_nhan;
  delete errors.value.dien_thoai_nhan;
}

// ── Load biên nhận vào form ───────────────────────────────────────
// Bug 2 fixed: reset errors mỗi khi chuyển bản ghi để tránh hiển thị lỗi cũ
watch(() => props.bienNhan, (bn) => {
  errors.value = {};
  if (!bn) return;
  if (props.mode === 'view' || props.mode === 'edit') {
    form.value = {
      // Bug 8 fixed: parse date an toàn với timezone — dùng UTC parts để tránh lệch ngày
      ngay_bien_nhan: bn.ngay_bien_nhan ? parseDateSafe(bn.ngay_bien_nhan) : new Date(),
      gio_tao: bn.gio_tao || '',
      ma_so_custom: '',
      van_phong_nhan_id: bn.van_phong_nhan_id,
      chanh_id: bn.chanh_id || null,
      gia_cuoc: Number(bn.gia_cuoc) || 0,
      trang_thai_thu: bn.trang_thai_thu,
      don_vi_gui: bn.don_vi_gui || '',
      nguoi_gui: bn.nguoi_gui || '',
      dien_thoai_gui: applyPhoneFormat(bn.dien_thoai_gui),
      dia_chi_gui: bn.dia_chi_gui || '',
      so_cccd_gui: bn.so_cccd_gui || '',
      don_vi_nhan: bn.don_vi_nhan || '',
      nguoi_nhan: bn.nguoi_nhan || '',
      dien_thoai_nhan: applyPhoneFormat(bn.dien_thoai_nhan),
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
        return khac ? (khac.ghi_chu || '').trim() : ''; // [M-01] so_luong luôn = 1, chỉ cần ghi_chu
      })(),
      hang_hu_khong_den: bn.hang_hu_khong_den || false,
      gia_tri_hang: bn.gia_tri_hang ? Number(bn.gia_tri_hang) : null,
      trong_luong: bn.trong_luong ? Number(bn.trong_luong) : null,
      hinh_thuc_giao: bn.hinh_thuc_giao || 'goi_dien',
      thu_ho: Number(bn.thu_ho) || 0,
      can_xuat_hddt: bn.can_xuat_hddt || false,
      // [NV-3b] Load liên kết KH
      kh_gui_id: bn.kh_gui_id || null,
      kh_nhan_id: bn.kh_nhan_id || null,
      vai_tro_cong_no: 'nguoi_gui',
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

// parseDateSafe — đã chuyển vào utils/format.js

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

// [NT-01] Đơn nội thành: VP gửi = VP nhận
// - Create mode: form.van_phong_nhan_id vs props.vpGiaoDich (VP gửi của nhân viên)
// - View/Edit mode: van_phong_gui_id vs van_phong_nhan_id từ bienNhan
const isNoiThanh = computed(() => {
  if (props.mode === 'create') {
    return !!(props.vpGiaoDich && form.value.van_phong_nhan_id &&
      Number(props.vpGiaoDich) === Number(form.value.van_phong_nhan_id));
  }
  if (props.bienNhan) {
    return props.bienNhan.van_phong_gui_id === props.bienNhan.van_phong_nhan_id;
  }
  return false;
});

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
    return formatDate(bn.ngay_bien_nhan); // parseDateSafe bên trong formatDate
  }
  return formatDate(form.value.ngay_bien_nhan) || '';
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

// formatCurrency, formatPhone, applyPhoneFormat — đã chuyển vào utils/
// onPhoneInput → handlePhoneInput từ composables/usePhoneInput

// ── Build payload cho save ────────────────────────────────────────
function buildPayload() {
  const p = { ...form.value };
  p.van_phong_gui_id = props.vpGiaoDich;
  // Dùng toISODate từ utils/format để tránh timezone shift
  if (p.ngay_bien_nhan instanceof Date) {
    p.ngay_bien_nhan = toISODate(p.ngay_bien_nhan);
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
  // Strip khoảng trắng trong SĐT trước khi gửi lên server
  if (p.dien_thoai_gui) p.dien_thoai_gui = p.dien_thoai_gui.replace(/\s/g, '');
  if (p.dien_thoai_nhan) p.dien_thoai_nhan = p.dien_thoai_nhan.replace(/\s/g, '');
  // [NV-3b] Gửi liên kết KH + vai trò nợ
  if (!p.kh_gui_id)  delete p.kh_gui_id;   // Bỏ null để tránh Prisma error
  if (!p.kh_nhan_id) delete p.kh_nhan_id;
  // Chỉ gửi vai_tro_cong_no khi chọn công nợ
  if (p.trang_thai_thu !== 'cong_no') delete p.vai_tro_cong_no;
  // Giữ ma_so_custom nếu đang tạo mới (người dùng có thể sửa mã)
  if (props.mode !== 'create' || !p.ma_so_custom?.trim()) {
    delete p.ma_so_custom;
  }
  return p;
}

// ── Validation ────────────────────────────────────────────────
function validate() {
  const e = {};
  const f = form.value;

  if (!f.van_phong_nhan_id)
    e.van_phong_nhan_id = 'Vui lòng chọn địa điểm đến';

  if (!f.don_vi_gui?.trim() && !f.nguoi_gui?.trim())
    e.don_vi_gui = 'Vui lòng nhập đơn vị hoặc tên người gửi';

  // Fix 3.1: Kiểm tra định dạng số điện thoại (strip spaces trước khi test)
  const dtGui = f.dien_thoai_gui?.trim().replace(/\s/g, '');
  if (!dtGui)
    e.dien_thoai_gui = 'Số điện thoại người gửi là bắt buộc';
  else if (!PHONE_REGEX.test(dtGui))
    e.dien_thoai_gui = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  if (!f.don_vi_nhan?.trim() && !f.nguoi_nhan?.trim())
    e.don_vi_nhan = 'Vui lòng nhập đơn vị hoặc tên người nhận';

  const dtNhan = f.dien_thoai_nhan?.trim().replace(/\s/g, '');
  if (!dtNhan)
    e.dien_thoai_nhan = 'Số điện thoại người nhận là bắt buộc';
  else if (!PHONE_REGEX.test(dtNhan))
    e.dien_thoai_nhan = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  const coHang = f.hang_hoa_json?.some(i => Number(i.so_luong) > 0) || f.hang_hoa_khac?.trim();
  if (!coHang)
    e.hang_hoa = 'Vui lòng nhập ít nhất một mặt hàng và số lượng';

  // [Fix #3] Bắt buộc chọn trạng thái thu khi tạo mới
  if (props.mode === 'create' && !f.trang_thai_thu)
    e.trang_thai_thu = 'Vui lòng chọn trạng thái thu (Đã thu / Chưa thu / Công nợ)';

  // Fix 3.2: Chỉ bắt buộc hình thức giao khi tạo mới — khi sửa BN cũ có thể NULL
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
const TRANG_THAI_ORDER = ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'dang_giao', 'da_giao_chanh', 'khach_da_nhan'];
const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ vận chuyển', dang_vc: 'Đang vận chuyển', da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách', dang_giao: 'Đang giao hàng',
  da_giao_chanh: 'Đã giao Chành', khach_da_nhan: 'Khách đã nhận',
};
const TRANG_THAI_ICONS = {
  cho_vc: 'pi pi-box', dang_vc: 'pi pi-truck', da_den_kho: 'pi pi-building',
  da_bao_khach: 'pi pi-phone', dang_giao: 'pi pi-car',
  da_giao_chanh: 'pi pi-send', khach_da_nhan: 'pi pi-check-circle',
};

const statusConfirmVisible = ref(false);
const statusGhiChu = ref('');
const statusUpdating = ref(false);
const lichSu = ref([]);

const canUpdateStatus = computed(() => {
  return auth.hasRole('admin', 'staff') && props.mode === 'view' && props.bienNhan;
});

// Context-aware nextTrangThai: phân nhánh theo chanh_id & hinh_thuc_giao
const nextTrangThai = computed(() => {
  if (!props.bienNhan) return null;
  const tt = props.bienNhan.trang_thai;
  const hasChanh = !!props.bienNhan.chanh_id;
  const htGiao = props.bienNhan.hinh_thuc_giao;

  if (tt === 'da_den_kho') {
    if (hasChanh) return 'da_giao_chanh';
    if (htGiao === 'tu_toi')  return 'khach_da_nhan';
    if (htGiao === 'tan_noi') return 'dang_giao';
    return 'da_bao_khach'; // goi_dien (default)
  }
  // Các bước còn lại: tuyến tính
  const linear = { cho_vc: 'dang_vc', dang_vc: 'da_den_kho', da_bao_khach: 'khach_da_nhan', dang_giao: 'khach_da_nhan' };
  return linear[tt] ?? null;
});

const isTerminal = computed(() =>
  ['khach_da_nhan', 'da_giao_chanh'].includes(props.bienNhan?.trang_thai)
);


function openStatusConfirm() {
  statusGhiChu.value = '';
  statusConfirmVisible.value = true;
}

async function confirmStatusUpdate() {
  if (!nextTrangThai.value || !props.bienNhan) return;
  statusUpdating.value = true;

  // Pre-fill ghi chú cho bàn giao chành
  let ghiChu = statusGhiChu.value || null;
  if (nextTrangThai.value === 'da_giao_chanh' && !statusGhiChu.value && props.bienNhan.chanh) {
    const c = props.bienNhan.chanh;
    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    ghiChu = `Giao cho Chành "${c.ten}" lúc ${now}${c.dien_thoai ? ` — ĐT: ${c.dien_thoai}` : ''}${c.dia_chi ? ` — ĐC: ${c.dia_chi}` : ''}`;
  }

  try {
    await api.patch(`/bien-nhan/${props.bienNhan.id}/trang-thai`, {
      trang_thai: nextTrangThai.value,
      ghi_chu: ghiChu || undefined,
      phuong_thuc: 'manual',
    });
    lichSu.value = [
      {
        trang_thai_moi: nextTrangThai.value,
        created_at: new Date().toISOString(),
        ghi_chu: ghiChu || null,
        phuong_thuc: 'manual',
        nhan_vien: { ten: auth.user?.ten || '' },
      },
      ...lichSu.value,
    ];
    statusConfirmVisible.value = false;
    emit('status-updated');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Lỗi cập nhật trạng thái',
      detail: err.response?.data?.error?.message || 'Cập nhật thất bại',
      life: 5000,
    });
    statusConfirmVisible.value = false;
  } finally {
    statusUpdating.value = false;
  }
}


// Bug 6 fixed: backend getBienNhan() đã eager-load lich_su_trang_thai.
// Không cần gọi thêm API riêng — watch props.bienNhan để đọc trực tiếp.
watch(() => props.bienNhan, (bn) => {
  lichSu.value = bn?.lich_su_trang_thai || [];
}, { immediate: true, deep: true });


// formatDateTime — đã chuyển vào utils/format.js

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
          <div class="info-field info-field-ma-so">
            <span class="field-lbl">Mã số:</span>
            <div class="ma-so-with-badge">
              <span class="field-val ma-so" v-if="!isEditable || mode === 'edit'">{{ displayMaSo }}</span>
              <InputText v-else v-model="form.ma_so_custom" class="ma-so-input" />
              <!-- [NT-01] Badge nội thành — hiện khi VP gửi = VP nhận -->
              <span
                v-if="isNoiThanh"
                class="noi-thanh-badge"
                v-tooltip.right="'Đơn nội thành: hàng tiếp nhận và giao trong cùng một văn phòng, không qua xe liên tỉnh'"
              >
                <i class="pi pi-map-marker"></i>
                Nội thành
              </span>
            </div>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Giá cước:</span>
            <span class="field-val cuoc" v-if="!isEditable">{{ formatCurrency(bienNhan?.gia_cuoc) }}</span>
            <div v-else class="input-addon compact-money">
              <InputNumber
                v-model="form.gia_cuoc"
                :useGrouping="true"
                locale="vi-VN"
                :minFractionDigits="0"
                :maxFractionDigits="0"
                :min="0"
                class="input-addon-num"
              />
              <span class="input-addon-suffix">đ</span>
            </div>
          </div>
          <div class="info-field radio-group" :class="{ 'field-error': errors.trang_thai_thu }">
            <template v-if="isEditable">
              <RadioButton v-model="form.trang_thai_thu" value="da_thu" inputId="tt_da" @change="delete errors.trang_thai_thu" />
              <label for="tt_da" class="radio-lbl">Đã thu</label>
              <RadioButton v-model="form.trang_thai_thu" value="chua_thu" inputId="tt_ct" @change="delete errors.trang_thai_thu" />
              <label for="tt_ct" class="radio-lbl">Chưa thu</label>
              <RadioButton v-model="form.trang_thai_thu" value="cong_no" inputId="tt_cn" @change="delete errors.trang_thai_thu" />
              <label for="tt_cn" class="radio-lbl">Công nợ</label>
              <span v-if="errors.trang_thai_thu" class="error-msg" style="display:block;width:100%;margin-top:2px;">{{ errors.trang_thai_thu }}</span>
            </template>
            <!-- [NV-3b] Nợ bên nào — chỉ hiện khi chọn Công nợ -->
            <template v-if="isEditable && form.trang_thai_thu === 'cong_no'">
              <div class="radio-row vai-tro-row" style="margin-top:4px; background:#fef3c7; border:1px solid #fcd34d; border-radius:6px; padding:4px 8px; width:100%; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span class="field-lbl" style="font-size:0.75rem; color:#92400e; white-space:nowrap;">Nợ bên:</span>
                <RadioButton v-model="form.vai_tro_cong_no" value="nguoi_gui" inputId="vt_gui" />
                <label for="vt_gui" class="radio-lbl" style="color:#78350f;">Người gửi</label>
                <RadioButton v-model="form.vai_tro_cong_no" value="nguoi_nhan" inputId="vt_nhan" />
                <label for="vt_nhan" class="radio-lbl" style="color:#78350f;">Người nhận</label>
              </div>
            </template>
            <template v-else>
              <StatusBadge :value="bienNhan?.trang_thai_thu" type="thu" />
              <!-- [View] Công nợ tính vào bên nào — chỉ hiện khi trang_thai_thu = cong_no -->
              <template v-if="bienNhan?.trang_thai_thu === 'cong_no' && bienNhan?.cong_no?.[0]">
                <div class="cong-no-info">
                  <i class="pi pi-user"></i>
                  <span class="cong-no-label">Nợ bên:</span>
                  <span class="cong-no-party">
                    {{ bienNhan.cong_no[0].vai_tro === 'nguoi_nhan' ? 'Người nhận' : 'Người gửi' }}
                    <span class="cong-no-name">
                      ({{ bienNhan.cong_no[0].doi_tuong || '—' }})
                    </span>
                  </span>
                  <span
                    class="cong-no-status"
                    :class="bienNhan.cong_no[0].trang_thai === 'da_thu' ? 'cn-paid' : 'cn-unpaid'"
                  >
                    {{ bienNhan.cong_no[0].trang_thai === 'da_thu' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán' }}
                  </span>
                </div>
              </template>

            </template>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <!-- [NT-01] Hint (= VP Gửi) khi nội thành -->
            <span class="field-lbl">
              Địa điểm đến:
              <span v-if="isNoiThanh && isEditable" class="lbl-noi-thanh-hint">(= VP Gửi)</span>
            </span>
            <Select v-if="isEditable" v-model="form.van_phong_nhan_id" :options="vpNhanOptions" optionLabel="label" optionValue="value" placeholder="Chọn VP nhận" class="select-compact" :class="{ 'p-invalid': errors.van_phong_nhan_id }" />
            <span v-if="errors.van_phong_nhan_id" class="error-msg">{{ errors.van_phong_nhan_id }}</span>
            <span v-else-if="!isEditable" class="field-val">{{ displayVpNhan }}</span>
          </div>
        </div>
        <div class="info-row-2">
          <div class="info-field">
            <span class="field-lbl">Gửi tới Chành:</span>
            <Select v-if="isEditable" v-model="form.chanh_id" :options="chanhOptions" optionLabel="ten" optionValue="id" placeholder="Chọn chành..." showClear class="select-compact" :disabled="!form.van_phong_nhan_id" />
            <span v-else class="field-val">{{ displayChanh }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ NGƯỜI GỬI ═══ -->
      <div class="group-box sender">
        <div class="group-title"><i class="pi pi-send"></i> Thông tin người gửi</div>
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
              <InputText
                v-model="form.dien_thoai_gui"
                class="input-full"
                :class="{ 'p-invalid': errors.dien_thoai_gui }"
                @input="handlePhoneInput(form, 'dien_thoai_gui', $event); delete errors.dien_thoai_gui"
                placeholder=""
                maxlength="13"
              />
              <span v-if="errors.dien_thoai_gui" class="error-msg">{{ errors.dien_thoai_gui }}</span>
            </template>
            <span v-else class="field-val">{{ formatPhone(bienNhan?.dien_thoai_gui) }}</span>
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
        <div class="group-title"><i class="pi pi-map-marker"></i> Thông tin người nhận</div>
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
              <InputText
                v-model="form.dien_thoai_nhan"
                class="input-full"
                :class="{ 'p-invalid': errors.dien_thoai_nhan }"
                @input="handlePhoneInput(form, 'dien_thoai_nhan', $event); delete errors.dien_thoai_nhan"
                placeholder=""
                maxlength="13"
              />
              <span v-if="errors.dien_thoai_nhan" class="error-msg">{{ errors.dien_thoai_nhan }}</span>
            </template>
            <span v-else class="field-val">{{ formatPhone(bienNhan?.dien_thoai_nhan) }}</span>
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
        <div class="group-title"><i class="pi pi-box"></i> Thông tin hàng</div>
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
          <div class="field-val goods-summary">{{ bienNhan?.ten_hang_hoa || '—' }}</div>
          <div v-if="bienNhan?.hang_hu_khong_den">
            <span class="badge badge-danger" style="display:inline-block;">Hàng hư/hỏng/bể không đền</span>
          </div>
        </template>
        <div class="field-row-2">
          <div class="f-50"><span class="field-lbl">Giá trị hàng:</span>
            <template v-if="isEditable">
              <div class="input-addon compact-money">
                <InputNumber
                  v-model="form.gia_tri_hang"
                  :useGrouping="true"
                  locale="vi-VN"
                  :minFractionDigits="0"
                  :maxFractionDigits="0"
                  :min="0"
                  class="input-addon-num"
                />
                <span class="input-addon-suffix">đ</span>
              </div>
            </template>
            <span v-else class="field-val">{{ formatCurrency(bienNhan?.gia_tri_hang) }}</span>
          </div>
          <div class="f-50"><span class="field-lbl">Trọng lượng:</span>
            <template v-if="isEditable">
              <div class="input-addon compact-weight">
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
        <div class="group-title"><i class="pi pi-wallet"></i> Thanh toán & Giao hàng</div>
        <div class="radio-row" v-if="isEditable" :class="{ 'field-error': errors.hinh_thuc_giao }">
          <RadioButton v-model="form.hinh_thuc_giao" value="tan_noi" inputId="ht_tn" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_tn" class="radio-lbl">Giao tận nơi</label>
          <RadioButton v-model="form.hinh_thuc_giao" value="goi_dien" inputId="ht_gd" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_gd" class="radio-lbl">Gọi điện đến nhận</label>
          <RadioButton v-model="form.hinh_thuc_giao" value="tu_toi" inputId="ht_tt" @change="delete errors.hinh_thuc_giao" />
          <label for="ht_tt" class="radio-lbl">Tự đến lấy</label>
        </div>
        <span v-if="isEditable && errors.hinh_thuc_giao" class="error-msg" style="display:block;margin-bottom:4px;">{{ errors.hinh_thuc_giao }}</span>
        <div v-if="!isEditable" class="field-val" style="display:flex; align-items:baseline; gap:0.35rem;">
          <span class="field-lbl">Hình thức giao hàng:</span> {{ { tan_noi: 'Giao tận nơi', goi_dien: 'Gọi điện', tu_toi: 'Tự đến nhận' }[bienNhan?.hinh_thuc_giao] || '' }}
        </div>
        <div class="field-row-2">
          <div class="f-50"><span class="field-lbl">Thu hộ (COD):</span>
            <template v-if="isEditable">
              <div class="input-addon compact-money">
                <InputNumber
                  v-model="form.thu_ho"
                  :useGrouping="true"
                  locale="vi-VN"
                  :minFractionDigits="0"
                  :maxFractionDigits="0"
                  :min="0"
                  class="input-addon-num"
                />
                <span class="input-addon-suffix">đ</span>
              </div>
            </template>
            <span v-else class="field-val">{{ formatCurrency(bienNhan?.thu_ho) }}</span>
            <!-- Badge TT COD -->
            <StatusBadge
              v-if="!isEditable && Number(bienNhan?.thu_ho) > 0"
              :value="bienNhan?.trang_thai_cod"
              type="cod"
              style="margin-left: 0.4rem; font-size: 0.7rem;"
            />
          </div>
          <!-- COD mini-stepper — chỉ show ở view mode khi có thu_ho -->
          <div
            v-if="!isEditable && Number(bienNhan?.thu_ho) > 0"
            class="cod-stepper-wrap"
          >
            <div class="cod-stepper-label">
              <i class="pi pi-send" />
              Tiến trình thu hộ (COD)
            </div>
            <CodStepper :current="bienNhan.trang_thai_cod" />
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
        <div class="group-title"><i class="pi pi-truck"></i> Trạng thái vận chuyển</div>
        <StatusStepper
          :current="bienNhan.trang_thai"
          :hinhThucGiao="bienNhan.hinh_thuc_giao"
          :hasChanh="!!bienNhan.chanh_id"
          style="margin-top: 0.5rem; margin-bottom: 0.75rem;"
        />

        <!-- Panel Chành nổi bật khi da_giao_chanh -->
        <div v-if="bienNhan.trang_thai === 'da_giao_chanh' && bienNhan.chanh" class="chanh-handover-panel">
          <i class="pi pi-send"></i>
          <div>
            <div class="chanh-title">Đã bàn giao cho Chành</div>
            <strong>{{ bienNhan.chanh.ten }}</strong>
            <span v-if="bienNhan.chanh.dien_thoai"> — {{ bienNhan.chanh.dien_thoai }}</span>
            <div v-if="bienNhan.chanh.dia_chi" class="chanh-sub">{{ bienNhan.chanh.dia_chi }}</div>
            <div v-if="bienNhan.chanh.nguoi_lien_he" class="chanh-sub">NLH: {{ bienNhan.chanh.nguoi_lien_he }}</div>
          </div>
        </div>

        <!-- Next step button — REMOVED (chuyển trạng thái qua scan/hang-den) -->
        <div v-if="isTerminal" class="status-terminal">
          <i :class="bienNhan.trang_thai === 'da_giao_chanh' ? 'pi pi-send' : 'pi pi-check-circle'"></i>
          {{ bienNhan.trang_thai === 'da_giao_chanh' ? 'Đã bàn giao Chành — kết thúc trách nhiệm TMQ' : 'Đã hoàn tất giao hàng' }}
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


    </div>
  </div>
</template>

<style scoped>
/* ── Chành handover panel (status section) ─────────────────────── */
.chanh-handover-panel {
  display: flex; align-items: flex-start; gap: 0.6rem;
  background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 8px;
  padding: 0.6rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.82rem; color: #4c1d95;
}
.chanh-handover-panel i { font-size: 1.1rem; margin-top: 2px; flex-shrink: 0; }
.chanh-handover-panel .chanh-title { font-size: 0.72rem; font-weight: 700; color: #7c3aed; margin-bottom: 2px; }
.chanh-handover-panel .chanh-sub { font-size: 0.75rem; color: #5b21b6; margin-top: 2px; }

/* ── Chành info box inside confirm dialog ───────────────────────── */
.chanh-confirm-info {
  display: flex; align-items: flex-start; gap: 0.5rem;
  background: #f3e8ff; border: 1px solid #d8b4fe; border-radius: 6px;
  padding: 0.5rem 0.6rem; margin: 0.4rem 0; font-size: 0.82rem; color: #6b21a8;
}
.chanh-confirm-info i { font-size: 0.9rem; margin-top: 2px; flex-shrink: 0; }

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
  flex: 1;          /* fill toàn bộ bn-right thay vì dùng height:100% */
  min-height: 0;    /* cho phép shrink trong flex container */
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
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
  min-height: 0;    /* KEY: thiếu cái này → overflow-y:auto không bao giờ hoạt động */
  overflow-y: auto;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* ── Header info ── */
.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem 0.65rem;
  border-bottom: 2px solid var(--border);
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  border-radius: 10px 10px 0 0;
  margin: -0.75rem -0.85rem 0;
}

.info-row-2 {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.info-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.field-lbl {
  font-size: 0.83rem;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
  flex-shrink: 0;
}

.lbl-fixed {
  min-width: 82px;
}

.field-val {
  font-size: 0.84rem;
  font-weight: 400;
  color: var(--text);
}

.ma-so {
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  color: var(--primary);
  font-weight: 800;
}

.nv-name { color: #6366f1; font-weight: 700; }
.cuoc { color: #dc2626; font-size: 0.95rem; font-weight: 800; }

.inline-inputs {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex: 1;
}

:deep(.dp-compact) { max-width: 138px; }
:deep(.dp-compact .p-inputtext) { font-size: 0.82rem; padding: 0.25rem 0.5rem; height: 30px; }
.time-input { width: 58px; font-size: 0.82rem !important; padding: 0.25rem 0.4rem !important; height: 30px; text-align: center; }
.ma-so-input { max-width: 145px; font-size: 0.84rem !important; font-family: monospace; font-weight: 700; padding: 0.25rem 0.5rem !important; height: 30px; }
:deep(.select-compact) { flex: 1; }
:deep(.select-compact .p-select-label) { font-size: 0.84rem; padding: 0.25rem 0.5rem; }

/* ── Radio group ── */
.radio-group, .radio-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.3rem 0.1rem;
}
.radio-lbl {
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  margin-right: 0.55rem;
  color: #475569;
}

/* ── GroupBox ── */
.group-box {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow: visible;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s;
}
.group-box:focus-within {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.group-title {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.35rem 0.7rem;
  margin-bottom: 0.1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Nội dung bên trong group-box có padding */
.group-box > :not(.group-title) {
  padding-left: 0.7rem;
  padding-right: 0.7rem;
}

.sender {
  border-top: 3px solid #3b82f6;
}
.sender .group-title {
  color: #1d4ed8;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}
.receiver {
  border-top: 3px solid #10b981;
}
.receiver .group-title {
  color: #065f46;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}
.goods {
  border-top: 3px solid #f59e0b;
}
.goods .group-title {
  color: #92400e;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}
.payment {
  border-top: 3px solid #8b5cf6;
}
.payment .group-title {
  color: #5b21b6;
  background: linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%);
}

/* ── Field layouts ── */
.field-full {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.field-row-2 {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
}

.field-row-3 {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
  flex-wrap: wrap;
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

/* Nếu chỉ có 1 field duy nhất trong hàng → cho stretch toàn bộ chiều rộng */
.view-mode .info-row-2 > .info-field:only-child {
  flex: 1 1 auto !important;
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

/* ══ View-mode spacing overrides ══════════════════════════════════
   Trong view mode, mỗi dòng chỉ cao ~20px (text) so với ~30px (input)
   trong edit mode. Các giá trị gap/padding phải thu hẹp lại để
   khoảng trống giữa các dòng đồng đều và nhỏ gọn hơn.
   ═════════════════════════════════════════════════════════════════ */

/* Giảm khoảng giữa các group-box */
.view-mode .panel-scroll {
  gap: 0.4rem;
}

/* Tighten header-info */
.view-mode .header-info {
  gap: 0.28rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Bỏ padding thừa của radio-group khi chỉ hiển thị badge (view mode) */
.view-mode .header-info .radio-group {
  padding: 0;
}

/* Tighten group-box: less bottom padding, tighter row gap */
.view-mode .group-box {
  gap: 0.2rem;
  padding-bottom: 0.55rem;
}

/* Group title: bớt padding dọc, bỏ margin-bottom thừa */
.view-mode .group-title {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  margin-bottom: 0;
}

/* goods-summary: bỏ padding dọc thừa, khép line-height để gap trên/dưới badge đều nhau */
.view-mode .goods-summary {
  padding-top: 0.25;
  padding-bottom: 0;
  line-height: 0.75;
}

.f-40 { flex: 4; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.f-30 { flex: 3; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.f-50 { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }

/* Label + input nằm cùng 1 hàng trong field-row-3 */
.f-inline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
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

.f-name { flex: 2; min-width: 140px; }
.f-phone { flex: 1; min-width: 140px; }
.f-cccd { flex: 1; min-width: 120px; }

.input-full { width: 100%; font-size: 0.84rem !important; height: 30px; }
:deep(.ac-full) { flex: 1; }
:deep(.ac-full .p-autocomplete-input) { font-size: 0.84rem; width: 100%; height: 30px; }

/* ── Hàng hóa grid ── */
.hh-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hh-item {
  display: grid;
  grid-template-columns: 52px auto 1fr;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafbfd;
  transition: border-color 0.15s, background 0.15s;
}

.hh-item:hover {
  border-color: #cbd5e1;
  background: #f8faff;
}

.hh-item.filled {
  border-color: #93c5fd;
  background: rgba(59, 130, 246, 0.05);
}

.hh-label {
  font-size: 0.78rem;
  font-weight: 800;
  color: #94a3b8;
  text-align: right;
  letter-spacing: -0.01em;
}

.hh-item.filled .hh-label { color: #2563eb; }

:deep(.hh-num .p-inputnumber-input) { text-align: center; font-weight: 700; font-size: 0.84rem; padding: 0.2rem 0.25rem; width: 52px; }
:deep(.hh-num .p-inputnumber-button) { width: 1.5rem; padding: 0; }
:deep(.hh-note) { font-size: 0.78rem !important; padding: 0.2rem 0.5rem !important; border-color: transparent !important; background: transparent !important; font-style: italic; color: #94a3b8; }
:deep(.hh-note:focus) { border-color: #93c5fd !important; background: white !important; }

.hh-other {
  grid-template-columns: 52px 1fr;
  border-style: dashed;
  border-color: #cbd5e1;
}

:deep(.hh-other-input) {
  font-size: 0.84rem !important;
  padding: 0.25rem 0.5rem !important;
}

/* ── Checkboxes ── */
.check-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.check-lbl {
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.goods-summary {
  font-size: 0.87rem;
  font-weight: 500;
  padding: 0.2rem 0;
}

/* ── Compact input-addon ── */
.input-addon {
  display: flex;
  align-items: stretch;
}
.input-addon.compact { max-width: 160px; }
.input-addon.compact-money { max-width: 160px; }
.input-addon.compact-weight { max-width: 110px; }

/* Suffix addon — trông như input-group chuẩn */
.input-addon-suffix {
  display: flex;
  align-items: center;
  padding: 0 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-left: none;
  border-radius: 0 6px 6px 0;
  white-space: nowrap;
  user-select: none;
}

/* Native input bên trong compact-weight */
.input-addon.compact-weight .input-addon-field {
  font-size: 0.84rem;
  padding: 0.25rem 0.5rem;
  height: 30px;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

/* InputNumber bên trong compact-money — cần :deep() để style inner input */
:deep(.input-addon-num.p-inputnumber) { flex: 1; min-width: 0; }
:deep(.input-addon-num .p-inputnumber-input) {
  width: 100%;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  height: 30px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

/* ── Badge đặc biệt (hàng hư, HĐĐT — không liên quan trạng thái) ── */
.badge-danger { background: #fee2e2; color: #991b1b; display: inline-flex; padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
.badge-info { background: #dbeafe; color: #1e40af; display: inline-flex; padding: 0.1rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

/* ── Status Section ── */
.status-section {
  border-top-color: #2563eb !important;
}
.status-section .group-title {
  color: #1d4ed8 !important;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
}

.status-action {
  text-align: center;
  margin-bottom: 0.5rem;
  padding: 0 0.7rem;
}
.status-btn { width: 100%; font-weight: 600; }

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

/* ── COD mini-stepper wrapper ── */
.cod-stepper-wrap {
  margin-top: 0.5rem;
  padding: 0.45rem 0.65rem;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.cod-stepper-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ── [NT-01] Đơn Nội Thành ────────────────────────────────────── */

/* Wrapper mã số + badge cùng hàng */
.ma-so-with-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/*
 * Badge "Nội thành" — semantic green (Layer 3: Semantic Communication)
 * Dùng màu success chuẩn hệ thống: không loè loẹt, mang nghĩa trạng thái.
 * Font nhỏ, pill shape để không át mã biên nhận.
 */
.noi-thanh-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #15803d;
  background: #dcfce7;
  border: 1px solid #86efac;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  cursor: default;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.noi-thanh-badge i {
  font-size: 0.65rem;
}
.noi-thanh-badge:hover {
  background: #bbf7d0;
  border-color: #4ade80;
}

/*
 * Hint label nhỏ "(= VP Gửi)" khi đơn nội thành ở edit/create mode.
 * Màu muted để không cạnh tranh với label chính.
 */
.lbl-noi-thanh-hint {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--text-muted, #6b7280);
  margin-left: 0.25rem;
}
/*
 * Chip hiển thị thông tin công nợ trong view mode.
 * Nền vàng amber để nổi bật, tách biệt với badge trạng thái thu.
 */
.cong-no-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.3rem;
  padding: 0.3rem 0.6rem;
  background: #fef9c3;
  border: 1px solid #fde047;
  border-radius: 6px;
  font-size: 0.78rem;
  width: 100%;
}
.cong-no-info .pi {
  font-size: 0.75rem;
  color: #a16207;
}
.cong-no-label {
  font-weight: 600;
  color: #92400e;
  white-space: nowrap;
}
.cong-no-party {
  font-weight: 700;
  color: #78350f;
}
.cong-no-name {
  font-weight: 400;
  color: #a16207;
}
.cong-no-status {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  white-space: nowrap;
}
.cong-no-status.cn-paid {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}
.cong-no-status.cn-unpaid {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fcd34d;
}
</style>
