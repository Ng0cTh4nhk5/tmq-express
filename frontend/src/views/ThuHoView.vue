<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store.js';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import DatePicker from 'primevue/datepicker';
// MultiSelect removed — lập phiếu COD giờ dùng checkbox-table (giống CuocNhan)
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { COD_STATUS, COD_STATUS_OPTIONS, HINH_THUC_OPTIONS } from '../constants/cod.js';
import { formatDate, formatNumber, toISODate } from '../utils/format';
import { useThuHoStore } from '../stores/thu-ho.store.js';

// ============================================================================
// MARK: - USER CONTEXT & PERMISSIONS
// ============================================================================
const toast  = useToast();
const auth   = useAuthStore();
const thuHoStore = useThuHoStore();
const userVpId = computed(() => auth.user?.van_phong?.id || null);
const isAdmin  = computed(() => auth.user?.role === 'admin');

// VP permission cho Phiếu chuyển COD
function canActOnPhieu(phieu, action) {
  if (!phieu) return false;
  if (isAdmin.value) return true;
  if (action === 'chuyen') return phieu.van_phong_nhan_id === userVpId.value;
  if (action === 'nhan')   return phieu.van_phong_gui_id  === userVpId.value;
  return false;
}

// ============================================================================
// MARK: - STATE: TAB BIÊN NHẬN
// ============================================================================
// Tab active
const activeView = ref('bn');

// ─── State — Tab BN ───────────────────────────────────────────────────────
const data       = ref([]);
const pagination = ref(null);
const summary    = ref(null);
const tongHop    = ref(null);
const loading    = ref(false);
const page       = ref(1);

const filterTrangThai = ref('');
const filterFrom      = ref(null);
const filterTo        = ref(null);
const search          = ref('');

// Dialog thu-chanh / nhan-tu-chanh
const dialogVisible  = ref(false);
const selectedBN     = ref(null);
const currentAction  = ref('');
const hinhThuc       = ref('tien_mat');
const ghiChu         = ref('');
const nguoiNop       = ref('');
const confirming     = ref(false);

// Dialog trả lô
const traLoVisible    = ref(false);
const selectedForTra  = ref([]);
const hinhThucTra     = ref('tien_mat');
const ghiChuTra       = ref('');
const confirmingTra   = ref(false);

// Multi-select trả lô batch từ table
const selectedDaChuyen = ref([]);

// ============================================================================
// MARK: - STATE: TAB PHIẾU CHUYỂN COD
// ============================================================================
// ─── State — Tab Phiếu ────────────────────────────────────────────────────
const phieuData       = ref([]);
const phieuPagi       = ref(null);
const loadingP        = ref(false);
const phieuPage       = ref(1);
const filterPhieu     = ref('');
const filterPhieuFrom = ref(null);
const filterPhieuTo   = ref(null);

// Lập phiếu — dùng checkbox-table thay MultiSelect
const lapPhieuVisible = ref(false);
const selectedForLap  = ref([]);  // BN rows đã chọn từ table
const vanPhongs       = ref([]);
const vpGuiId         = ref(null);
const vpGuiAutoDetected = ref(false);
const vpGuiOverride   = ref(false);
const hinhThucLap     = ref('tien_mat');
const ghiChuLap       = ref('');
const creating        = ref(false);

// Multi-select gom lô lập phiếu từ table (da_thu)
const selectedDaThu   = ref([]);

// ============================================================================
// MARK: - COMPUTED STATE
// ============================================================================
const tongTienSelected = computed(() =>
  selectedDaThu.value.reduce((s, r) => s + Number(r.thu_ho || 0), 0)
);

const daThuCount = computed(() => data.value.filter(r => r.trang_thai_cod === 'da_thu').length);

const allDaThuSelected = computed(() => {
  const daThu = data.value.filter(r => r.trang_thai_cod === 'da_thu');
  return daThu.length > 0 && selectedDaThu.value.length === daThu.length;
});

// Xác nhận phiếu
const actionDialog = ref(false);
const actionPhieu  = ref(null);
const actionType   = ref('');
const hinhThucAct  = ref('tien_mat');
const confirmingAct = ref(false);

// Chi tiết phiếu
const detailVisible = ref(false);
const detailData    = ref(null);
const loadingDetail = ref(false);

// Badge: phiếu cần VP mình xử lý
const pendingForMe = computed(() => {
  if (!userVpId.value) return 0;
  return phieuData.value.filter(p =>
    (p.trang_thai === 'cho_chuyen' && p.van_phong_nhan_id === userVpId.value) ||
    (p.trang_thai === 'da_chuyen'  && p.van_phong_gui_id  === userVpId.value)
  ).length;
});

// Trạng thái phiếu chuyển COD
const PHIEU_STATUS = {
  cho_chuyen: { label: 'Chờ chuyển', severity: 'warn' },
  da_chuyen:  { label: 'Đã chuyển',  severity: 'info' },
  da_nhan:    { label: 'Đã nhận',    severity: 'success' },
};
const PHIEU_STATUS_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ chuyển', value: 'cho_chuyen' },
  { label: 'Đã chuyển',  value: 'da_chuyen' },
  { label: 'Đã nhận',    value: 'da_nhan' },
];

// ─── State — In BNTH ──────────────────────────────────────────────────────
const printDialogVisible = ref(false);
const printTarget        = ref(null); // { bienNhanId, maBNTH, soTien, nguoiNop }
const printingBNTH       = ref(false);

function openTraLoBatch() {
  if (!selectedDaChuyen.value.length) {
    toast.add({ severity: 'warn', summary: 'Lưu ý', detail: 'Chọn ít nhất 1 biên nhận đã chuyển', life: 3000 });
    return;
  }
  selectedForTra.value = selectedDaChuyen.value;
  hinhThucTra.value = 'tien_mat';
  ghiChuTra.value = '';
  traLoVisible.value = true;
}

// ============================================================================
// MARK: - API: DATA FETCHING
// ============================================================================
// ─── API ──────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 20 };
    if (filterTrangThai.value) params.trang_thai_cod = filterTrangThai.value;
    if (filterFrom.value) params.from = toISODate(filterFrom.value);
    if (filterTo.value)   params.to   = toISODate(filterTo.value);
    if (search.value)     params.search = search.value;

    const res = await api.get('/thu-ho', { params });
    data.value       = res.data.data;
    pagination.value = res.data.pagination;
    summary.value    = res.data.summary;
    // [Store-B6] Đồng bộ badge sidebar
    thuHoStore.setFromSummary(res.data.summary);
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách thu hộ');
  }
  loading.value = false;
}

async function fetchTongHop() {
  try {
    const res = await api.get('/thu-ho/tong-hop');
    tongHop.value = res.data.data;
    // [Store-B6] Cache vào store
    thuHoStore.setTongHop(res.data.data);
  } catch { /* silent */ }
}

function onSearch() { page.value = 1; fetchData(); }

async function manualRefresh() {
  selectedDaChuyen.value = [];
  await Promise.all([fetchData(), fetchTongHop()]);
}

// ============================================================================
// MARK: - ACTIONS: CHÀNH
// ============================================================================
// ─── Dialog chành ─────────────────────────────────────────────────────────
// Đối với BN giao trực tiếp: COD được tự động thu khi BN chuyển sang khach_da_nhan.
// Nếu auto-thu fail, dùng nút "Thu COD" thủ công (xem thuCODThuCong bên dưới).
// Giữ luồng chành vì tiền COD chưa về VP khi giao qua chành.
const DIALOG_CONFIG = {
  'xac-nhan-thu-chanh':     { title: 'Ghi nhận chành đã thu COD',     showNguoiNop: false },
  'xac-nhan-nhan-tu-chanh': { title: 'VP Nhận xác nhận nhận từ chành', showNguoiNop: true },
};

function getAction(bn) {
  switch (bn.trang_thai_cod) {
    case 'cho_thu':
      // Nếu qua chành: chỉ hiện nút "Chành đã thu" khi BN đã thực sự giao cho chành
      // (trang_thai = da_giao_chanh). Trước đó hiển thị nhãn passive trong template.
      if (bn.chanh_id && bn.trang_thai === 'da_giao_chanh') {
        return [{ label: 'Chành đã thu', action: 'xac-nhan-thu-chanh', severity: 'secondary' }];
      }
      return [];
    case 'da_thu_chanh':
      return [{ label: 'Nhận từ chành', action: 'xac-nhan-nhan-tu-chanh', severity: 'info' }];
    // da_thu, cho_chuyen_pending, da_chuyen, da_tra: handled trực tiếp trong template
    default:
      return [];
  }
}

function openDialog(bn, action) {
  if (action === 'goto-lap-phieu') {
    // Chuyển sang tab Phiếu và mở dialog lập phiếu
    activeView.value = 'phieu';
    openLapPhieuFor(bn);
    return;
  }
  if (action === 'tra-lo') {
    selectedForTra.value = [bn];
    hinhThucTra.value = 'tien_mat';
    ghiChuTra.value = '';
    traLoVisible.value = true;
    return;
  }
  selectedBN.value    = bn;
  currentAction.value = action;
  hinhThuc.value      = 'tien_mat';
  ghiChu.value        = '';
  nguoiNop.value      = bn.don_vi_nhan || bn.nguoi_nhan || '';
  dialogVisible.value = true;
}

async function xacNhan() {
  confirming.value = true;
  try {
    const body = { hinh_thuc: hinhThuc.value, ghi_chu: ghiChu.value || undefined };
    if (DIALOG_CONFIG[currentAction.value]?.showNguoiNop && nguoiNop.value) {
      body.nguoi_nop = nguoiNop.value;
    }
    const res = await api.post(`/thu-ho/${selectedBN.value.id}/${currentAction.value}`, body);
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    dialogVisible.value = false;
    await Promise.all([fetchData(), fetchTongHop()]);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xác nhận COD');
  }
  confirming.value = false;
}

// ============================================================================
// MARK: - ACTIONS: TRẢ LÔ
// ============================================================================
// ─── Dialog trả lô ────────────────────────────────────────────────────────
async function traLo() {
  if (!selectedForTra.value.length) return;
  confirmingTra.value = true;
  try {
    const res = await api.post('/thu-ho/tra-lo', {
      bien_nhan_ids: selectedForTra.value.map(bn => bn.id),
      hinh_thuc: hinhThucTra.value,
      ghi_chu: ghiChuTra.value || undefined,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    traLoVisible.value = false;
    selectedForTra.value = [];
    await Promise.all([fetchData(), fetchTongHop()]);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi trả COD');
  }
  confirmingTra.value = false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt     = formatNumber;
const fmtDate = formatDate;

// ============================================================================
// MARK: - ACTIONS: THU COD THỦ CÔNG
// ============================================================================
// Khi auto-thu COD đã fail (BN kẹt cho_thu sau khi giao hàng)
async function thuCODThuCong(row) {
  try {
    const res = await api.post(`/thu-ho/${row.id}/xac-nhan-thu`, { hinh_thuc: 'tien_mat' });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    await Promise.all([fetchData(), fetchTongHop()]);
  } catch (err) { handleApiError(err, toast, 'Lỗi thu COD'); }
}

// ============================================================================
// MARK: - API & HELPERS: TAB PHIẾU
// ============================================================================
// ─── API — Tab Phiếu ──────────────────────────────────────────────────────
async function fetchPhieu() {
  loadingP.value = true;
  try {
    const p = { page: phieuPage.value, limit: 20 };
    if (filterPhieu.value)     p.trang_thai = filterPhieu.value;
    if (filterPhieuFrom.value) p.from = toISODate(filterPhieuFrom.value);
    if (filterPhieuTo.value)   p.to   = toISODate(filterPhieuTo.value);
    const res = await api.get('/phieu-chuyen-cod', { params: p });
    phieuData.value = res.data.data;
    phieuPagi.value = res.data.pagination;
  } catch (err) { handleApiError(err, toast, 'Không thể tải phiếu'); }
  loadingP.value = false;
}

async function loadVanPhongs() {
  try {
    const res = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
  } catch { vanPhongs.value = []; }
}

// [UX-1] Loại trừ VP của nhân viên (VP Nhận) — không thể chuyển COD về chính mình
const vanPhongsGui = computed(() =>
  vanPhongs.value.filter(v => v.value !== userVpId.value)
);

function openLapPhieu(bns) {
  selectedForLap.value = Array.isArray(bns) ? bns : [bns];
  hinhThucLap.value    = 'tien_mat';
  ghiChuLap.value      = '';

  // Auto-detect VP Gửi từ BN đầu tiên
  const firstBN = selectedForLap.value[0];
  const guiId   = firstBN?.van_phong_gui_id ?? null;
  if (guiId && guiId !== userVpId.value) {
    vpGuiId.value          = guiId;
    vpGuiAutoDetected.value = true;
    vpGuiOverride.value    = false;
  } else {
    vpGuiId.value          = null;
    vpGuiAutoDetected.value = false;
    vpGuiOverride.value    = false;
  }

  lapPhieuVisible.value = true;
}

function openLapPhieuBatch() {
  const daThu = selectedDaThu.value.filter(r => r.trang_thai_cod === 'da_thu');
  if (!daThu.length) {
    toast.add({ severity: 'warn', summary: 'Lưu ý', detail: 'Chọn ít nhất 1 biên nhận đã thu COD', life: 3000 });
    return;
  }
  openLapPhieu(daThu);
}

function selectAllDaThu() {
  const daThu = data.value.filter(r => r.trang_thai_cod === 'da_thu');
  if (selectedDaThu.value.length === daThu.length) {
    selectedDaThu.value = [];
  } else {
    selectedDaThu.value = daThu;
  }
}

function openLapPhieuFor(bn) {
  if (bn) {
    openLapPhieu(bn);
  } else {
    // Từ tab Phiếu nhấn "Lập phiếu mới" → chuyển về tab BN
    activeView.value = 'bn';
    toast.add({ severity: 'info', summary: 'Gợi ý', detail: 'Tick ☑ biên nhận đã thu COD trong bảng để lập phiếu chuyển', life: 4000 });
  }
}

async function submitLapPhieu() {
  if (!vpGuiId.value) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn VP Gửi', life: 3000 });
    return;
  }
  if (!selectedForLap.value.length) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Chưa chọn biên nhận nào', life: 3000 });
    return;
  }
  creating.value = true;
  try {
    const res = await api.post('/phieu-chuyen-cod', {
      van_phong_gui_id: vpGuiId.value,
      bien_nhan_ids:    selectedForLap.value.map(b => b.id),
      hinh_thuc:        hinhThucLap.value,
      ghi_chu:          ghiChuLap.value || undefined,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    lapPhieuVisible.value = false;
    selectedForLap.value  = [];
    selectedDaThu.value   = [];
    await Promise.all([fetchData(), fetchTongHop(), fetchPhieu()]);
  } catch (err) { handleApiError(err, toast, 'Lỗi lập phiếu'); }
  creating.value = false;
}

function openAction(phieu, type) {
  actionPhieu.value   = phieu;
  actionType.value    = type;
  hinhThucAct.value   = 'tien_mat';
  actionDialog.value  = true;
}

async function submitAction() {
  confirmingAct.value = true;
  const ep = actionType.value === 'chuyen'
    ? `/phieu-chuyen-cod/${actionPhieu.value.id}/xac-nhan-chuyen`
    : `/phieu-chuyen-cod/${actionPhieu.value.id}/xac-nhan-nhan`;
  try {
    const body = actionType.value === 'nhan' ? { hinh_thuc: hinhThucAct.value } : {};
    const res  = await api.patch(ep, body);
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    actionDialog.value = false;
    await Promise.all([fetchPhieu(), fetchData(), fetchTongHop()]);
  } catch (err) { handleApiError(err, toast, 'Lỗi xác nhận phiếu'); }
  confirmingAct.value = false;
}

async function openDetail(phieu) {
  detailData.value    = null;
  detailVisible.value = true;
  loadingDetail.value = true;
  try {
    const res = await api.get(`/phieu-chuyen-cod/${phieu.id}`);
    detailData.value = res.data.data;
  } catch (err) { handleApiError(err, toast, 'Lỗi tải chi tiết phiếu'); }
  loadingDetail.value = false;
}

// ============================================================================
// MARK: - ACTIONS: IN PHIẾU THU HỘ (BNTH)
// ============================================================================
// ─── In phiếu thu hộ BNTH ─────────────────────────────────────────────────
function openPrintDialog(row) {
  printTarget.value = {
    bienNhanId: row.id,
    maBNTH:     row.bien_nhan_thu_ho?.ma_bnth || '',
    soTien:     row.thu_ho,
    nguoiNop:   row.bien_nhan_thu_ho?.nguoi_nop || row.don_vi_nhan || row.nguoi_nhan || '',
  };
  printDialogVisible.value = true;
}

async function printBNTH(bienNhanId) {
  printingBNTH.value = true;
  try {
    const res  = await api.get(`/bien-nhan-thu-ho/${bienNhanId}/pdf-preview`);
    const b64  = res.data.data.base64;
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
    printDialogVisible.value = false;
  } catch (err) { handleApiError(err, toast, 'Lỗi tải PDF phiếu thu hộ'); }
  printingBNTH.value = false;
}

// ============================================================================
// MARK: - LIFECYCLE
// ============================================================================
onMounted(() => { fetchData(); fetchTongHop(); loadVanPhongs(); fetchPhieu(); });

</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & STATISTICS                                           -->
  <!-- ===================================================================== -->
  <div class="th-page animate-fade-in">

    <!-- ═══ HEADER ═══ -->
    <div class="th-header">
      <div class="th-header-left">
        <i class="pi pi-money-bill header-icon"></i>
        <h1>Thu hộ (COD)</h1>
        <div class="vp-badge">
          <i class="pi pi-building"></i>
          {{ auth.userVanPhong?.ten || auth.userVanPhong?.ma_vp || 'VP' }}
        </div>
      </div>
      <div class="th-header-right">
        <Button icon="pi pi-refresh" v-tooltip.bottom="'Làm mới'" severity="secondary"
          text rounded size="small" :loading="loading" @click="manualRefresh" />
      </div>
    </div>

    <!-- ═══ STATS CARDS ═══ -->
    <div class="stats-row">
      <div class="stat-card stat-warning">
        <div class="stat-icon"><i class="pi pi-clock"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.cho_thu?.total||0) }}đ</span>
          <span class="stat-label">Chờ thu · {{ tongHop?.cho_thu?.count||0 }} BN</span>
        </div>
      </div>
      <div class="stat-card stat-neutral">
        <div class="stat-icon"><i class="pi pi-map-marker"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.da_thu_chanh?.total||0) }}đ</span>
          <span class="stat-label">Chành đã thu · {{ tongHop?.da_thu_chanh?.count||0 }} BN</span>
        </div>
      </div>
      <div class="stat-card stat-info">
        <div class="stat-icon"><i class="pi pi-check"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.da_thu?.total||0) }}đ</span>
          <span class="stat-label">Đã thu · {{ tongHop?.da_thu?.count||0 }} BN</span>
        </div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i class="pi pi-hourglass"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.cho_chuyen_pending?.total||0) }}đ</span>
          <span class="stat-label">Chờ chuyển · {{ tongHop?.cho_chuyen_pending?.count||0 }} BN</span>
        </div>
      </div>
      <div class="stat-card stat-send">
        <div class="stat-icon"><i class="pi pi-send"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.da_chuyen?.total||0) }}đ</span>
          <span class="stat-label">Đã chuyển · {{ tongHop?.da_chuyen?.count||0 }} BN</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-icon"><i class="pi pi-check-circle"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ fmt(tongHop?.da_tra?.total||0) }}đ</span>
          <span class="stat-label">Hoàn tất · {{ tongHop?.da_tra?.count||0 }} BN</span>
        </div>
      </div>
    </div>

    <!-- ═══ INFO BANNER ═══ -->
    <div class="info-banner-cod">
      <i class="pi pi-info-circle"></i>
      <span>COD được <b>tự động thu</b> khi giao hàng trực tiếp. Với đơn giao qua chành, dùng nút <b>"Chành đã thu"</b> để ghi nhận.</span>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB SWITCHER                                                  -->
    <!-- ===================================================================== -->
    <!-- ═══ TAB BAR ═══ -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeView === 'bn' }"
        @click="activeView='bn'; fetchData()">
        <i class="pi pi-list"></i>
        <span>Biên nhận COD</span>
      </button>
      <button class="tab-btn" :class="{ active: activeView === 'phieu' }"
        @click="activeView='phieu'; fetchPhieu()">
        <i class="pi pi-send"></i>
        <span>Phiếu chuyển COD</span>
        <span v-if="pendingForMe > 0" class="tab-badge">{{ pendingForMe }}</span>
      </button>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB BIÊN NHẬN: FILTERS & TABLE                                -->
    <!-- ===================================================================== -->
    <!-- Tab BN -->
    <template v-if="activeView==='bn'">
      <!-- ═══ TOOLBAR ═══ -->
      <div class="th-toolbar">
        <div class="toolbar-row">
          <IconField class="search-wrap">
            <InputIcon class="pi pi-search" />
            <InputText v-model="search" placeholder="Tìm mã BN, tên..." class="search-input" @keyup.enter="onSearch" />
          </IconField>
          <Select v-model="filterTrangThai" :options="COD_STATUS_OPTIONS" optionLabel="label" optionValue="value"
            class="filter-select" placeholder="Trạng thái..." @change="onSearch" />
          <DatePicker v-model="filterFrom" dateFormat="dd/mm/yy" showIcon placeholder="Từ ngày" class="filter-date" />
          <DatePicker v-model="filterTo" dateFormat="dd/mm/yy" showIcon placeholder="Đến ngày" class="filter-date" />
          <Button icon="pi pi-search" label="Xem" size="small" @click="onSearch" :loading="loading" />
          <Button icon="pi pi-times" label="Xóa lọc" severity="secondary" text size="small"
            @click="filterTrangThai=''; filterFrom=null; filterTo=null; search=''; selectedDaChuyen=[]; onSearch()" />
        </div>
        <div v-if="filterTrangThai || filterFrom || filterTo || search" class="filter-active-hint">
          <i class="pi pi-filter-fill"></i>
          <span v-if="filterTrangThai">{{ COD_STATUS_OPTIONS.find(o=>o.value===filterTrangThai)?.label }}</span>
          <span v-if="search"> · Tìm: <strong>{{ search }}</strong></span>
          — {{ pagination?.total || 0 }} kết quả
          <button class="clear-filter" @click="filterTrangThai=''; filterFrom=null; filterTo=null; search=''; selectedDaChuyen=[]; onSearch()">✕ Bỏ lọc</button>
        </div>
      </div>

      <!-- Batch trả lô bar -->
      <div v-if="selectedDaChuyen.length" class="batch-bar-cod">
        <span><i class="pi pi-check-square"></i> Đã chọn <b>{{ selectedDaChuyen.length }}</b> BN đã chuyển</span>
        <Button label="Trả người gửi (batch)" icon="pi pi-money-bill" severity="warn" size="small" @click="openTraLoBatch" />
        <Button label="Bỏ chọn" severity="secondary" text size="small" @click="selectedDaChuyen=[]" />
      </div>

      <!-- Batch gom lô lập phiếu bar -->
      <div v-if="selectedDaThu.length" class="batch-bar-cod" style="border-color:var(--info-border);background:var(--info-light);">
        <span><i class="pi pi-check-square"></i> Đã chọn <b>{{ selectedDaThu.length }}</b> BN đã thu · Tổng: <b class="text-danger">{{ fmt(tongTienSelected) }}đ</b></span>
        <Button label="Lập phiếu chuyển (gom lô)" icon="pi pi-send" severity="help" size="small" @click="openLapPhieuBatch" />
        <Button label="Bỏ chọn" severity="secondary" text size="small" @click="selectedDaThu=[]" />
      </div>

      <!-- ═══ TABLE ═══ -->
      <DataTable :value="data" :loading="loading" stripedRows size="small" scrollable scrollHeight="flex"
        :rowClass="(d) => Number(d.thu_ho) > 0 ? 'row-has-cod' : ''" class="th-table">
        <template #empty>
          <div class="table-empty">
            <i class="pi pi-money-bill" style="font-size:2rem;color:#94a3b8;"></i>
            <p>Không có biên nhận COD nào</p>
          </div>
        </template>

        <Column header="Mã BN" field="ma_so" frozen style="min-width:130px;">
          <template #body="{ data: row }"><span class="ma-so-cell">{{ row.ma_so }}</span></template>
        </Column>
        <Column header="Ngày" style="min-width:85px;">
          <template #body="{ data: row }">{{ fmtDate(row.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="min-width:110px;">
          <template #body="{ data: row }">
            <span class="vp-tag vp-gui">{{ row.van_phong_gui?.ma_vp }}</span>
            <span style="margin:0 2px;color:var(--text-light);">→</span>
            <span class="vp-tag vp-nhan">{{ row.van_phong_nhan?.ma_vp }}</span>
          </template>
        </Column>
        <Column header="Người gửi" style="min-width:140px;">
          <template #body="{ data: row }">
            <div class="person-cell">
              <span class="name">{{ row.don_vi_gui || row.nguoi_gui || '—' }}</span>
              <span v-if="row.don_vi_gui && row.nguoi_gui" class="sub">{{ row.nguoi_gui }}</span>
            </div>
          </template>
        </Column>
        <Column header="Người nhận" style="min-width:140px;">
          <template #body="{ data: row }">
            <div class="person-cell">
              <span class="name">{{ row.don_vi_nhan || row.nguoi_nhan || '—' }}</span>
              <span v-if="row.don_vi_nhan && row.nguoi_nhan" class="sub">{{ row.nguoi_nhan }}</span>
            </div>
          </template>
        </Column>
        <Column header="Tiền COD" style="min-width:110px;text-align:right;">
          <template #body="{ data: row }">
            <span class="cod-badge">
              <i class="pi pi-exclamation-circle" style="font-size:0.65rem;"></i>
              {{ fmt(row.thu_ho) }}đ
            </span>
          </template>
        </Column>
        <Column header="Trạng thái" style="min-width:130px;text-align:center;">
          <template #body="{ data: row }">
            <Tag v-if="COD_STATUS[row.trang_thai_cod]" :value="COD_STATUS[row.trang_thai_cod].label" :severity="COD_STATUS[row.trang_thai_cod].severity" />
          </template>
        </Column>
        <Column header="Chành" style="min-width:100px;">
          <template #body="{ data: row }">
            <span v-if="row.chanh" class="chanh-tag">{{ row.chanh.ten }}</span>
            <span v-else class="no-val">—</span>
          </template>
        </Column>
        <Column header="BN Thu hộ" style="min-width:120px;text-align:center;">
          <template #body="{ data: row }">
            <span v-if="row.bien_nhan_thu_ho?.length" class="bnth-badge">
              <i class="pi pi-file-check"></i> {{ row.bien_nhan_thu_ho[0].ma_bnth }}
              <button class="bnth-print-btn" title="In phiếu thu hộ" @click.stop="openPrintDialog(row)">
                <i class="pi pi-print"></i>
              </button>
            </span>
            <span v-else class="no-val">—</span>
          </template>
        </Column>
        <Column frozen alignFrozen="right" style="min-width:180px;text-align:center;">
          <template #header><span style="font-size:0.75rem;">Thao tác</span></template>
          <template #body="{ data: row }">
            <div class="action-cell">
              <template v-if="row.trang_thai_cod === 'da_tra'">
                <Tag value="Hoàn tất" severity="success" />
              </template>
              <template v-else-if="row.trang_thai_cod === 'da_thu'">
                <!-- Chỉ VP Nhận (chành nhận) mới lập phiếu chuyển COD -->
                <template v-if="isAdmin || row.van_phong_nhan_id === userVpId">
                  <input type="checkbox" class="batch-checkbox"
                    :checked="selectedDaThu.some(r=>r.id===row.id)"
                    @change="e=>{ if(e.target.checked) selectedDaThu.push(row); else selectedDaThu=selectedDaThu.filter(r=>r.id!==row.id); }" />
                  <Button label="Lập phiếu" severity="help" size="small" @click="openLapPhieuFor(row)" />
                </template>
                <span v-else class="waiting-cod-label"><i class="pi pi-clock"></i> Chờ VP Nhận xử lý</span>
              </template>
              <template v-else-if="row.trang_thai_cod === 'cho_chuyen_pending'">
                <Tag value="Đang trong phiếu" severity="help" />
              </template>
              <template v-else-if="row.trang_thai_cod === 'cho_thu' && !row.chanh_id">
                <template v-if="row.trang_thai === 'khach_da_nhan'">
                  <Button label="Thu COD" icon="pi pi-dollar" size="small" severity="warn"
                    @click="thuCODThuCong(row)" />
                </template>
                <template v-else>
                  <span class="waiting-cod-label"><i class="pi pi-truck"></i> Chờ giao hàng</span>
                </template>
              </template>
              <template v-else-if="row.trang_thai_cod === 'da_chuyen'">
                <!-- Chỉ VP Gửi (chành gửi) mới có thể trả COD cho người gửi -->
                <template v-if="isAdmin || row.van_phong_gui_id === userVpId">
                  <input type="checkbox" class="batch-checkbox"
                    :checked="selectedDaChuyen.some(r=>r.id===row.id)"
                    @change="e=>{ if(e.target.checked) selectedDaChuyen.push(row); else selectedDaChuyen=selectedDaChuyen.filter(r=>r.id!==row.id); }" />
                  <Button label="Trả người gửi" severity="warn" size="small" @click="openDialog(row,'tra-lo')" />
                </template>
                <span v-else class="waiting-cod-label">
                  <i class="pi pi-check-circle"></i> Đã gửi tiền đi
                </span>
              </template>
              <template v-else>
                <!-- cho_thu + chanh_id + chưa da_giao_chanh: hiện nhãn passive -->
                <span
                  v-if="row.trang_thai_cod === 'cho_thu' && row.chanh_id && row.trang_thai !== 'da_giao_chanh'"
                  class="waiting-cod-label"
                ><i class="pi pi-send"></i> Chờ giao chành</span>
                <!-- các trường hợp còn lại: render nút từ getAction() -->
                <template v-else>
                  <Button
                    v-for="btn in getAction(row)"
                    :key="btn.action"
                    :label="btn.label"
                    :severity="btn.severity"
                    size="small"
                    @click="openDialog(row, btn.action)"
                  />
                </template>
              </template>
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total > 20" class="th-pagination">
        <span>Tổng {{ pagination.total }} biên nhận</span>
        <div class="pagi-controls">
          <Button icon="pi pi-chevron-left" text rounded size="small" :disabled="page<=1" @click="page--;fetchData()" />
          <span>{{ page }}/{{ pagination.totalPages }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="page>=pagination.totalPages" @click="page++;fetchData()" />
        </div>
      </div>

      <!-- Footer tổng -->
      <div v-if="summary" class="summary-footer">
        <span>{{ summary.count }} biên nhận</span>
        <span class="cod-total">Tổng COD: {{ fmt(summary.total_thu_ho) }}đ</span>
      </div>
    </template><!-- /activeView bn -->

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: XÁC NHẬN THU/CHÀNH                                    -->
    <!-- ===================================================================== -->
    <!-- Dialog xác nhận thu / thu-chanh / nhan-tu-chanh -->
    <Dialog v-model:visible="dialogVisible" :header="DIALOG_CONFIG[currentAction]?.title" :style="{width:'480px'}" modal>
      <div style="margin-bottom:1rem;padding:.75rem;background:#f8fafc;border-radius:8px;font-size:.85rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;">
          <span><b>Mã BN:</b></span><span style="font-weight:700;">{{ selectedBN?.ma_so }}</span>
          <span><b>Tuyến:</b></span><span>{{ selectedBN?.van_phong_gui?.ma_vp }} → {{ selectedBN?.van_phong_nhan?.ma_vp }}</span>
          <span><b>Người gửi:</b></span><span>{{ selectedBN?.don_vi_gui||selectedBN?.nguoi_gui||'—' }}</span>
          <span><b>Người nhận:</b></span><span>{{ selectedBN?.don_vi_nhan||selectedBN?.nguoi_nhan||'—' }}</span>
          <span><b>Tiền COD:</b></span><span style="font-weight:700;color:#dc2626;font-size:1rem;">{{ fmt(selectedBN?.thu_ho) }}đ</span>
          <span v-if="selectedBN?.chanh"><b>Chành:</b></span><span v-if="selectedBN?.chanh">{{ selectedBN.chanh.ten }}</span>
        </div>
      </div>

      <div style="background:#f1f5f9;padding:.75rem;border-radius:8px;font-size:.82rem;margin-bottom:1rem;border-left:3px solid #2563eb;">
        <p style="font-weight:700;margin-bottom:.4rem;color:#1e40af;"><i class="pi pi-file-check" style="margin-right:.35rem;"></i>Phiếu sẽ tự động tạo:</p>
        <p v-if="currentAction==='xac-nhan-thu'" style="margin:0;color:#475569;">• Phiếu <b>thu</b> tại VP <b>{{ selectedBN?.van_phong_nhan?.ten }}</b> + Biên nhận thu hộ</p>
        <p v-if="currentAction==='xac-nhan-thu-chanh'" style="margin:0;color:#475569;">• Chỉ cập nhật trạng thái — <b>chưa</b> tạo phiếu thu (tiền đang ở chành)</p>
        <p v-if="currentAction==='xac-nhan-nhan-tu-chanh'" style="margin:0;color:#475569;">• Phiếu <b>thu</b> tại VP <b>{{ selectedBN?.van_phong_nhan?.ten }}</b> + Biên nhận thu hộ (qua chành)</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div v-if="currentAction !== 'xac-nhan-thu-chanh'">
          <label class="bk-label">Hình thức thanh toán</label>
          <Select v-model="hinhThuc" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value" style="width:100%;margin-top:.25rem;" />
        </div>
        <div v-if="DIALOG_CONFIG[currentAction]?.showNguoiNop">
          <label class="bk-label">Tên người nộp tiền</label>
          <InputText v-model="nguoiNop" style="width:100%;margin-top:.25rem;" placeholder="Tên người nộp..." />
        </div>
        <div>
          <label class="bk-label">Ghi chú (tùy chọn)</label>
          <InputText v-model="ghiChu" style="width:100%;margin-top:.25rem;" placeholder="Ghi chú..." />
        </div>
      </div>

      <template #footer>
        <div style="display:flex;gap:.75rem;justify-content:flex-end;">
          <Button label="Hủy" severity="secondary" @click="dialogVisible=false" />
          <Button label="Xác nhận" :loading="confirming" @click="xacNhan" />
        </div>
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: TRẢ LÔ COD                                            -->
    <!-- ===================================================================== -->
    <!-- Dialog trả lô -->
    <Dialog v-model:visible="traLoVisible" header="Trả COD cho người gửi" :style="{width:'460px'}" modal>
      <div style="margin-bottom:1rem;font-size:.85rem;">
        <p style="color:#475569;margin-bottom:.75rem;">Xác nhận trả <b>{{ selectedForTra.length }}</b> biên nhận cho người gửi:</p>
        <ul style="margin:0;padding-left:1.2rem;color:#334155;">
          <li v-for="bn in selectedForTra" :key="bn.id">{{ bn.ma_so }} — <b class="text-danger">{{ fmt(bn.thu_ho) }}đ</b></li>
        </ul>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div>
          <label class="bk-label">Hình thức</label>
          <Select v-model="hinhThucTra" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value" style="width:100%;margin-top:.25rem;" />
        </div>
        <div>
          <label class="bk-label">Ghi chú (tùy chọn)</label>
          <InputText v-model="ghiChuTra" style="width:100%;margin-top:.25rem;" placeholder="Ghi chú..." />
        </div>
      </div>
      <template #footer>
        <div style="display:flex;gap:.75rem;justify-content:flex-end;">
          <Button label="Hủy" severity="secondary" @click="traLoVisible=false" />
          <Button label="Xác nhận trả" severity="warn" :loading="confirmingTra" @click="traLo" />
        </div>
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB PHIẾU CHUYỂN COD: FILTERS & TABLE                         -->
    <!-- ===================================================================== -->
    <!-- ═══ TAB PHIẾU CHUYỂN COD ═══ -->
    <div v-if="activeView==='phieu'" class="card">
      <div class="filter-section" style="margin-bottom:.75rem;">
        <label>Trạng thái</label>
        <Select v-model="filterPhieu" :options="PHIEU_STATUS_OPTIONS" optionLabel="label" optionValue="value"
          style="width:160px;" @change="phieuPage=1;fetchPhieu()" />
        <label class="filter-spacer">Từ ngày</label>
        <DatePicker v-model="filterPhieuFrom" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <label class="filter-spacer">Đến ngày</label>
        <DatePicker v-model="filterPhieuTo" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <Button label="Xem" icon="pi pi-search" style="margin-left:auto;" @click="phieuPage=1;fetchPhieu()" :loading="loadingP" />
        <Button label="Lập phiếu mới" icon="pi pi-plus" severity="help"
          @click="openLapPhieuFor(null)" />
        <Button label="Xóa lọc" icon="pi pi-times" severity="secondary" text
          @click="filterPhieu='';filterPhieuFrom=null;filterPhieuTo=null;phieuPage=1;fetchPhieu()" />
      </div>

      <DataTable :value="phieuData" :loading="loadingP" stripedRows size="small">
        <template #empty>
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <i class="pi pi-send" style="font-size:1.5rem;opacity:.3;"></i>
            <p style="font-size:.85rem;margin-top:.5rem;">Không có phiếu chuyển COD nào</p>
          </div>
        </template>
        <Column header="Mã phiếu" style="width:145px;font-weight:600;">
          <template #body="{ data: row }">{{ row.ma_phieu }}</template>
        </Column>
        <Column header="Ngày lập" style="width:90px;">
          <template #body="{ data: row }">{{ fmtDate(row.ngay_lap) }}</template>
        </Column>
        <Column header="VP Nhận → VP Gửi">
          <template #body="{ data: row }">
            <span style="font-size:.82rem;font-weight:600;">
              {{ row.van_phong_nhan?.ma_vp }} → {{ row.van_phong_gui?.ma_vp }}
            </span>
            <div style="font-size:.75rem;color:var(--text-muted);">{{ row.nhan_vien_lap?.ten }}</div>
          </template>
        </Column>
        <Column header="Tổng tiền" style="width:115px;text-align:right;">
          <template #body="{ data: row }"><span class="text-danger fw-700">{{ fmt(row.so_tien_tong) }}đ</span></template>
        </Column>
        <Column header="Số BN" style="width:60px;text-align:center;">
          <template #body="{ data: row }">{{ row._count?.chi_tiet||0 }}</template>
        </Column>
        <Column header="Tiến trình" style="width:140px;text-align:center;">
          <template #body="{ data: row }">
            <div style="display:flex;flex-direction:column;align-items:center;gap:.2rem;">
              <Tag :value="PHIEU_STATUS[row.trang_thai]?.label" :severity="PHIEU_STATUS[row.trang_thai]?.severity" />
              <span v-if="canActOnPhieu(row,'chuyen') && row.trang_thai==='cho_chuyen'" class="my-turn-label">
                <i class="pi pi-user"></i> Bạn gửi
              </span>
              <span v-else-if="canActOnPhieu(row,'nhan') && row.trang_thai==='da_chuyen'" class="my-turn-label">
                <i class="pi pi-user"></i> Bạn nhận
              </span>
            </div>
          </template>
        </Column>
        <Column header="Thao tác" style="width:210px;">
          <template #body="{ data: row }">
            <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center;">
              <Button icon="pi pi-eye" label="Chi tiết" size="small" severity="secondary" text @click="openDetail(row)" />
              <Button v-if="row.trang_thai==='cho_chuyen' && canActOnPhieu(row,'chuyen')"
                label="Đã gửi tiền" size="small" severity="warn" @click="openAction(row,'chuyen')" />
              <Button v-if="row.trang_thai==='da_chuyen' && canActOnPhieu(row,'nhan')"
                label="Đã nhận tiền" size="small" severity="success" @click="openAction(row,'nhan')" />
              <span v-if="(row.trang_thai==='cho_chuyen' && !canActOnPhieu(row,'chuyen')) ||
                          (row.trang_thai==='da_chuyen'  && !canActOnPhieu(row,'nhan'))"
                class="waiting-cod-label"><i class="pi pi-lock"></i> Chờ VP khác</span>
            </div>
          </template>
        </Column>
      </DataTable>

      <div v-if="phieuPagi && phieuPagi.total > 20"
        style="display:flex;justify-content:space-between;align-items:center;margin-top:.75rem;font-size:.82rem;color:#64748b;">
        <span>Tổng {{ phieuPagi.total }} phiếu</span>
        <div style="display:flex;gap:.5rem;">
          <Button icon="pi pi-chevron-left" text rounded size="small" :disabled="phieuPage<=1" @click="phieuPage--;fetchPhieu()" />
          <span style="line-height:2rem;">Trang {{ phieuPage }}/{{ phieuPagi.totalPages }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="phieuPage>=phieuPagi.totalPages" @click="phieuPage++;fetchPhieu()" />
        </div>
      </div>
    </div><!-- /activeView phieu -->

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: LẬP PHIẾU CHUYỂN                                      -->
    <!-- ===================================================================== -->
    <!-- Dialog lập phiếu chuyển COD -->
    <Dialog v-model:visible="lapPhieuVisible" header="Lập phiếu chuyển COD" :style="{width:'680px'}" modal>
      <!-- Preview table — danh sách BN đã chọn từ bảng -->
      <div style="margin-bottom:1rem;">
        <label class="bk-label" style="margin-bottom:.4rem;display:block;">
          Biên nhận đã chọn ({{ selectedForLap.length }})
        </label>
        <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
            <thead>
              <tr style="background:var(--bg-sunken);">
                <th style="padding:4px 8px;text-align:left;">Mã BN</th>
                <th style="padding:4px 8px;text-align:left;">Người gửi</th>
                <th style="padding:4px 8px;text-align:left;">Tuyến</th>
                <th style="padding:4px 8px;text-align:right;">COD</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bn in selectedForLap" :key="bn.id" style="border-top:1px solid var(--border-light);">
                <td style="padding:4px 8px;font-family:monospace;">{{ bn.ma_so }}</td>
                <td style="padding:4px 8px;">{{ bn.don_vi_gui || bn.nguoi_gui || '—' }}</td>
                <td style="padding:4px 8px;">
                  <span class="vp-tag vp-gui">{{ bn.van_phong_gui?.ma_vp }}</span>
                  <span style="margin:0 2px;">→</span>
                  <span class="vp-tag vp-nhan">{{ bn.van_phong_nhan?.ma_vp }}</span>
                </td>
                <td style="padding:4px 8px;text-align:right;font-weight:600;color:var(--danger);">{{ fmt(bn.thu_ho) }}đ</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-sunken);border-top:1px solid var(--border);font-weight:700;">
                <td colspan="3" style="padding:4px 8px;text-align:right;">Tổng cộng:</td>
                <td style="padding:4px 8px;text-align:right;color:var(--danger);">{{ fmt(selectedForLap.reduce((s,b) => s + Number(b.thu_ho||0), 0)) }}đ</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div>
          <label class="bk-label">VP Gửi (nhận tiền về)</label>
          <Select v-model="vpGuiId" :options="vanPhongs" optionLabel="label" optionValue="value"
            style="width:100%;margin-top:.25rem;" placeholder="Chọn VP Gửi..." />
        </div>
        <div>
          <label class="bk-label">Hình thức chuyển tiền</label>
          <Select v-model="hinhThucLap" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value"
            style="width:100%;margin-top:.25rem;" />
        </div>
        <div>
          <label class="bk-label">Ghi chú (tùy chọn)</label>
          <InputText v-model="ghiChuLap" style="width:100%;margin-top:.25rem;" placeholder="Ghi chú..." />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" @click="lapPhieuVisible=false" />
        <Button label="Lập phiếu chuyển" severity="help" :loading="creating" @click="submitLapPhieu" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: XÁC NHẬN GỬI/NHẬN                                     -->
    <!-- ===================================================================== -->
    <!-- Dialog xác nhận gửi/nhận phiếu -->
    <Dialog v-model:visible="actionDialog"
      :header="actionType==='chuyen' ? 'Xác nhận đã gửi tiền đi' : 'Xác nhận đã nhận tiền'"
      :style="{width:'420px'}" modal>
      <div v-if="actionPhieu" style="margin-bottom:1rem;font-size:.85rem;">
        <p>Phiếu: <b>{{ actionPhieu.ma_phieu }}</b></p>
        <p>Số tiền: <b class="text-danger">{{ fmt(actionPhieu.so_tien_tong) }}đ</b></p>
        <p v-if="actionType==='chuyen'">
          VP <b>{{ actionPhieu.van_phong_nhan?.ten }}</b> xác nhận đã gửi tiền COD về VP <b>{{ actionPhieu.van_phong_gui?.ten }}</b>
        </p>
        <p v-else>
          VP <b>{{ actionPhieu.van_phong_gui?.ten }}</b> xác nhận đã nhận tiền COD từ VP <b>{{ actionPhieu.van_phong_nhan?.ten }}</b>
        </p>
      </div>
      <div v-if="actionType==='nhan'">
        <label class="bk-label">Hình thức nhận</label>
        <Select v-model="hinhThucAct" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value"
          style="width:100%;margin-top:.25rem;" />
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" @click="actionDialog=false" />
        <Button :label="actionType==='chuyen' ? 'Xác nhận đã gửi' : 'Xác nhận đã nhận'"
          :severity="actionType==='chuyen' ? 'warn' : 'success'"
          :loading="confirmingAct" @click="submitAction" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: CHI TIẾT PHIẾU CHUYỂN                                 -->
    <!-- ===================================================================== -->
    <!-- Dialog chi tiết phiếu -->
    <Dialog v-model:visible="detailVisible" header="Chi tiết phiếu chuyển COD" :style="{width:'700px'}" modal :maximizable="true">
      <div v-if="loadingDetail" style="text-align:center;padding:2rem;">
        <i class="pi pi-spin pi-spinner" style="font-size:1.5rem;color:var(--text-muted);"></i>
      </div>
      <div v-else-if="detailData">
        <div class="phieu-detail-header">
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Mã phiếu</span>
            <span style="font-weight:700;font-family:var(--font-mono);">{{ detailData.ma_phieu }}</span>
            <Tag :value="PHIEU_STATUS[detailData.trang_thai]?.label" :severity="PHIEU_STATUS[detailData.trang_thai]?.severity" style="margin-left:.5rem;" />
          </div>
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Tuyến</span>
            <span class="route-pill">{{ detailData.van_phong_nhan?.ma_vp }}</span>
            <i class="pi pi-arrow-right" style="font-size:.8rem;color:var(--text-muted);margin:0 .3rem;"></i>
            <span class="route-pill route-pill--dest">{{ detailData.van_phong_gui?.ma_vp }}</span>
          </div>
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Tổng tiền</span>
            <span class="text-danger fw-700" style="font-size:1rem;">{{ fmt(detailData.so_tien_tong) }}đ</span>
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-top:.75rem;">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
            <thead>
              <tr style="background:var(--bg-sunken);">
                <th style="padding:.4rem .6rem;text-align:left;">Mã BN</th>
                <th style="padding:.4rem .6rem;text-align:left;">Người nhận</th>
                <th style="padding:.4rem .6rem;text-align:right;">Tiền COD</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ct in detailData.chi_tiet" :key="ct.id" style="border-top:1px solid var(--border-light);">
                <td style="padding:.4rem .6rem;font-weight:700;font-family:var(--font-mono);">{{ ct.bien_nhan?.ma_so }}</td>
                <td style="padding:.4rem .6rem;">{{ ct.bien_nhan?.don_vi_nhan||ct.bien_nhan?.nguoi_nhan||'—' }}</td>
                <td style="padding:.4rem .6rem;text-align:right;" class="text-danger">{{ fmt(ct.so_tien) }}đ</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-sunken);border-top:2px solid var(--border);font-weight:700;">
                <td colspan="2" style="padding:.4rem .6rem;">Tổng cộng ({{ detailData.chi_tiet?.length }} BN)</td>
                <td style="padding:.4rem .6rem;text-align:right;" class="text-danger">{{ fmt(detailData.so_tien_tong) }}đ</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <template #footer>
        <Button label="Đóng" severity="secondary" @click="detailVisible=false" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: IN PHIẾU THU HỘ (BNTH)                                -->
    <!-- ===================================================================== -->
    <!-- Dialog in phiếu thu hộ BNTH -->
    <Dialog v-model:visible="printDialogVisible" header="In phiếu thu hộ" :style="{width:'380px'}" modal>
      <div v-if="printTarget" style="text-align:center;padding:.5rem 0;">
        <i class="pi pi-print" style="font-size:2.5rem;color:#1e40af;margin-bottom:.75rem;display:block;"></i>
        <div style="font-size:.9rem;margin-bottom:.4rem;">
          Mã phiếu: <b>{{ printTarget.maBNTH || '—' }}</b>
        </div>
        <div style="font-size:1.2rem;font-weight:700;color:#dc2626;margin-bottom:.4rem;">
          {{ fmt(printTarget.soTien) }}đ
        </div>
        <div style="font-size:.85rem;color:#64748b;">Người nộp: {{ printTarget.nguoiNop || '—' }}</div>
      </div>
      <template #footer>
        <Button label="Bỏ qua" severity="secondary" text @click="printDialogVisible=false" />
        <Button label="In phiếu" icon="pi pi-print" :loading="printingBNTH"
          @click="printBNTH(printTarget.bienNhanId)" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES (ThuHo-specific — chỉ giữ lại styles không có trong base.css)
   Các class global (page-shell, stats-row, stat-card, tab-bar, tab-btn,
   page-toolbar, batch-bar-cod, confirm-info, ma-so-cell, cod-badge, v.v.)
   đã được định nghĩa trong assets/styles/base.css.
   ============================================================================ */

/* ─── Page + Table alias (th-prefix cho backward compat) ────────── */
.th-page   { display: flex; flex-direction: column; height: calc(100vh - var(--header-height) - var(--content-padding) * 2); gap: 0.5rem; }
.th-table  { flex: 1; overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.th-toolbar { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
.th-header  { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; flex-wrap: wrap; gap: 0.5rem; padding: 0.25rem 0; }
.th-header-left  { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.th-header-left h1 { font-size: 1.1rem; font-weight: 700; color: var(--secondary); margin: 0; }
.th-header-right { display: flex; align-items: center; gap: 0.5rem; }
.th-pagination  { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: #64748b; flex-shrink: 0; padding: 0.25rem 0; }

/* ─── Tab bar active variant (ThuHo dùng nền đậm hơn) ───────────── */
.tab-btn.active { background: var(--primary); color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
.tab-btn.active .tab-badge { background: rgba(255,255,255,0.3); color: white; }

/* ─── Info banner COD ───────────────────────────────────────────── */
.info-banner-cod { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.85rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); font-size: 0.78rem; color: #1e40af; flex-shrink: 0; }
.info-banner-cod .pi { flex-shrink: 0; }

/* ─── Batch bar COD (warn tone, ThuHo specific layout) ─────────── */
.batch-checkbox { margin-right: 0.3rem; cursor: pointer; }
.batch-bar-cod > span { flex: 1; }

/* ─── Waiting COD label ─────────────────────────────────────────── */
.waiting-cod-label { font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 0.3rem; }

/* ─── BNTH badge ────────────────────────────────────────────────── */
.bnth-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 600; color: #166534; background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 2px 6px; white-space: nowrap; }
.bnth-print-btn { display: inline-flex; align-items: center; justify-content: center; margin-left: 0.3rem; padding: 2px 4px; border-radius: 4px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e40af; cursor: pointer; font-size: 0.72rem; transition: background 0.15s, color 0.15s; }
.bnth-print-btn:hover { background: #1e40af; color: #fff; }

/* ─── My turn label (tab Phiếu) ─────────────────────────────────── */
.my-turn-label { font-size: 0.7rem; color: #7c3aed; font-weight: 600; display: flex; align-items: center; gap: 0.2rem; }

/* ─── Phiếu detail dialog ───────────────────────────────────────── */
.phieu-detail-header { background: var(--bg-base); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
.phieu-detail-row { display: flex; align-items: center; gap: 0.4rem; font-size: 0.83rem; }
.phieu-detail-label { font-weight: 600; color: var(--text-muted); min-width: 80px; }
.route-pill { background: #e0e7ff; color: #3730a3; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.75rem; font-weight: 700; font-family: var(--font-mono); }
.route-pill--dest { background: #d1fae5; color: #065f46; }

/* ─── Row highlight ─────────────────────────────────────────────── */
:deep(.row-has-cod) { background: #fffbeb !important; border-left: 2px solid #f59e0b; }
:deep(.row-has-cod:hover td) { background: #fef3c7 !important; }
</style>