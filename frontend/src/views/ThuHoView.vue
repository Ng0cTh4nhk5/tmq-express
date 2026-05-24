<script setup>
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
import DatePicker from 'primevue/datepicker';
import MultiSelect from 'primevue/multiselect';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { COD_STATUS, COD_STATUS_OPTIONS, HINH_THUC_OPTIONS } from '../constants/cod.js';
import { formatDate, formatNumber, toISODate } from '../utils/format';

const toast  = useToast();
const auth   = useAuthStore();
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

// ─── State — Tab Phiếu ────────────────────────────────────────────────────
const phieuData       = ref([]);
const phieuPagi       = ref(null);
const loadingP        = ref(false);
const phieuPage       = ref(1);
const filterPhieu     = ref('');
const filterPhieuFrom = ref(null);
const filterPhieuTo   = ref(null);

// Lập phiếu
const lapPhieuVisible = ref(false);
const bnDaThu         = ref([]);
const loadingBN       = ref(false);
const selectedBNIds   = ref([]);
const vanPhongs       = ref([]);
const vpGuiId         = ref(null);
const hinhThucLap     = ref('tien_mat');
const ghiChuLap       = ref('');
const creating        = ref(false);

const soTienTong = computed(() =>
  bnDaThu.value
    .filter(bn => selectedBNIds.value.includes(bn.id))
    .reduce((s, bn) => s + Number(bn.thu_ho || 0), 0)
);

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
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách thu hộ');
  }
  loading.value = false;
}

async function fetchTongHop() {
  try {
    const res = await api.get('/thu-ho/tong-hop');
    tongHop.value = res.data.data;
  } catch { /* silent */ }
}

function onSearch() { page.value = 1; fetchData(); }

// ─── Dialog chành ─────────────────────────────────────────────────────────
// Lưu ý: action 'xac-nhan-thu' (thu trực tiếp thủ công) đã bị bỏ.
// COD được tự động thu khi BN chuyển sang khach_da_nhan.
// Chỉ giữ luồng chành vì tiền COD chưa về VP khi giao qua chành.
const DIALOG_CONFIG = {
  'xac-nhan-thu-chanh':     { title: 'Ghi nhận chành đã thu COD',     showNguoiNop: false },
  'xac-nhan-nhan-tu-chanh': { title: 'VP Nhận xác nhận nhận từ chành', showNguoiNop: true },
};

function getAction(bn) {
  switch (bn.trang_thai_cod) {
    case 'cho_thu':
      // Nếu qua chành: chỉ có nút "Chành đã thu" (tiền đang ở chành)
      // Nếu không qua chành: COD đã được thu tự động → không cần nút
      return bn.chanh_id
        ? [{ label: 'Chành đã thu', action: 'xac-nhan-thu-chanh', severity: 'secondary' }]
        : [];
    case 'da_thu_chanh':
      return [{ label: 'Nhận từ chành', action: 'xac-nhan-nhan-tu-chanh', severity: 'info' }];
    case 'da_thu':
      return [{ label: 'Lập phiếu chuyển', action: 'goto-lap-phieu', severity: 'help' }];
    case 'cho_chuyen_pending':
      return [];
    case 'da_chuyen':
      return [{ label: 'Trả người gửi', action: 'tra-lo', severity: 'warn' }];
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
    toast.add({ severity: 'success', summary: '✅ Thành công', detail: res.data.message, life: 3000 });
    dialogVisible.value = false;
    await Promise.all([fetchData(), fetchTongHop()]);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xác nhận COD');
  }
  confirming.value = false;
}

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
    toast.add({ severity: 'success', summary: '✅ Thành công', detail: res.data.message, life: 3000 });
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

async function loadBNDaThu() {
  loadingBN.value = true;
  try {
    const res = await api.get('/thu-ho', { params: { trang_thai_cod: 'da_thu', limit: 500 } });
    bnDaThu.value = res.data.data;
  } catch { bnDaThu.value = []; }
  loadingBN.value = false;
}

function openLapPhieuFor(bn) {
  selectedBNIds.value = bn ? [bn.id] : [];
  vpGuiId.value       = bn?.van_phong_gui_id || null;
  hinhThucLap.value   = 'tien_mat';
  ghiChuLap.value     = '';
  loadBNDaThu();
  lapPhieuVisible.value = true;
}

async function submitLapPhieu() {
  if (!vpGuiId.value || !selectedBNIds.value.length) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Chọn BN và VP Gửi', life: 3000 });
    return;
  }
  creating.value = true;
  try {
    const res = await api.post('/phieu-chuyen-cod', {
      van_phong_gui_id: vpGuiId.value,
      bien_nhan_ids:    selectedBNIds.value,
      hinh_thuc:        hinhThucLap.value,
      ghi_chu:          ghiChuLap.value || undefined,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    lapPhieuVisible.value = false;
    selectedBNIds.value   = [];
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

onMounted(() => { fetchData(); fetchTongHop(); loadVanPhongs(); fetchPhieu(); });

</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Thu hộ (COD)" icon="pi pi-money-bill" />

    <!-- StatCards -->
    <div class="cod-stats-grid">
      <StatCard icon="pi pi-clock"        label="Chờ thu"        :value="fmt(tongHop?.cho_thu?.total||0)+'đ'"      :subtitle="(tongHop?.cho_thu?.count||0)+' BN'"          variant="warning" />
      <StatCard icon="pi pi-map-marker"   label="Chành đã thu"  :value="fmt(tongHop?.da_thu_chanh?.total||0)+'đ'" :subtitle="(tongHop?.da_thu_chanh?.count||0)+' BN'"    variant="" />
      <StatCard icon="pi pi-check"        label="Đã thu"         :value="fmt(tongHop?.da_thu?.total||0)+'đ'"       :subtitle="(tongHop?.da_thu?.count||0)+' BN'"           variant="info" />
      <StatCard icon="pi pi-hourglass"    label="Chờ chuyển"    :value="fmt(tongHop?.cho_chuyen_pending?.total||0)+'đ'" :subtitle="(tongHop?.cho_chuyen_pending?.count||0)+' BN'" variant="gold" />
      <StatCard icon="pi pi-send"         label="Đã chuyển"      :value="fmt(tongHop?.da_chuyen?.total||0)+'đ'"    :subtitle="(tongHop?.da_chuyen?.count||0)+' BN'"       variant="info" />
      <StatCard icon="pi pi-check-circle" label="Hoàn tất"      :value="fmt(tongHop?.da_tra?.total||0)+'đ'"       :subtitle="(tongHop?.da_tra?.count||0)+' BN'"           variant="success" />
    </div>

    <!-- Info banner -->
    <div class="info-banner-cod">
      <i class="pi pi-info-circle"></i>
      <span>COD được <b>tự động thu</b> khi giao hàng trực tiếp. Với đơn giao qua chành, dùng nút <b>"Chành đã thu"</b> để ghi nhận.</span>
    </div>

    <!-- Tab Switcher -->
    <div class="card view-switcher-card">
      <Button label="Biên nhận COD" icon="pi pi-list"
        :outlined="activeView!=='bn'"
        @click="activeView='bn'; fetchData()" />
      <div style="position:relative;display:inline-block;margin-left:.4rem;">
        <Button label="Phiếu chuyển COD" icon="pi pi-send"
          :outlined="activeView!=='phieu'"
          @click="activeView='phieu'; fetchPhieu()" />
        <span v-if="pendingForMe > 0" class="tab-badge">{{ pendingForMe }}</span>
      </div>
    </div>

    <!-- Batch trả lô bar -->
    <div v-if="activeView==='bn' && selectedDaChuyen.length" class="batch-bar-cod">
      <span><i class="pi pi-check-square"></i> Đã chọn <b>{{ selectedDaChuyen.length }}</b> BN đã chuyển</span>
      <Button label="Trả người gửi (batch)" icon="pi pi-money-bill" severity="warn" size="small" @click="openTraLoBatch" />
      <Button label="Bỏ chọn" severity="secondary" text size="small" @click="selectedDaChuyen=[]" />
    </div>

    <!-- Tab BN — Bộ lọc + Table -->
    <div v-if="activeView==='bn'">
    <!-- Bộ lọc -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="filter-section">
        <label>Trạng thái</label>
        <Select v-model="filterTrangThai" :options="COD_STATUS_OPTIONS" optionLabel="label" optionValue="value" style="width:195px;" @change="onSearch" />
        <label class="filter-spacer">Từ ngày</label>
        <DatePicker v-model="filterFrom" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <label class="filter-spacer">Đến ngày</label>
        <DatePicker v-model="filterTo" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <label class="filter-spacer">Tìm kiếm</label>
        <InputText v-model="search" placeholder="Mã BN, tên..." style="width:200px;" @keyup.enter="onSearch" />
        <Button label="Xem" icon="pi pi-search" style="margin-left:auto;" @click="onSearch" :loading="loading" />
        <Button label="Xóa lọc" icon="pi pi-times" severity="secondary" text
                @click="() => { filterTrangThai=''; filterFrom=null; filterTo=null; search=''; selectedDaChuyen=[]; onSearch(); }" />
      </div>
    </div>

    <!-- DataTable -->
    <div class="card">
      <DataTable :value="data" :loading="loading" stripedRows size="small" responsiveLayout="scroll">
        <template #empty>
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <i class="pi pi-money-bill" style="font-size:1.5rem;opacity:.3;"></i>
            <p style="font-size:0.85rem;margin-top:.5rem;">Không có biên nhận COD nào</p>
          </div>
        </template>

        <Column header="Mã BN" style="width:130px;font-weight:600;">
          <template #body="{ data: row }">{{ row.ma_so }}</template>
        </Column>
        <Column header="Ngày" style="width:90px;">
          <template #body="{ data: row }">{{ fmtDate(row.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="width:110px;">
          <template #body="{ data: row }">
            <span style="font-size:.8rem;font-weight:600;">{{ row.van_phong_gui?.ma_vp }} → {{ row.van_phong_nhan?.ma_vp }}</span>
          </template>
        </Column>
        <Column header="Người gửi">
          <template #body="{ data: row }"><span style="font-size:.82rem;">{{ row.don_vi_gui||row.nguoi_gui||'—' }}</span></template>
        </Column>
        <Column header="Người nhận">
          <template #body="{ data: row }"><span style="font-size:.82rem;">{{ row.don_vi_nhan||row.nguoi_nhan||'—' }}</span></template>
        </Column>
        <Column header="Tiền COD" style="width:130px;">
          <template #body="{ data: row }"><span class="text-danger fw-700">{{ fmt(row.thu_ho) }}đ</span></template>
        </Column>
        <Column header="Trạng thái" style="width:130px;text-align:center;">
          <template #body="{ data: row }">
            <Tag v-if="COD_STATUS[row.trang_thai_cod]" :value="COD_STATUS[row.trang_thai_cod].label" :severity="COD_STATUS[row.trang_thai_cod].severity" />
          </template>
        </Column>
        <Column header="Chành" style="width:100px;">
          <template #body="{ data: row }"><span class="text-muted" style="font-size:.78rem;">{{ row.chanh?.ten || '—' }}</span></template>
        </Column>
        <Column header="Biên nhận TH" style="width:130px;text-align:center;">
          <template #body="{ data: row }">
            <span v-if="row.bien_nhan_thu_ho?.length"
              class="bnth-badge">
              <i class="pi pi-file-check"></i> {{ row.bien_nhan_thu_ho[0].ma_bnth }}
              <button class="bnth-print-btn" title="In phiếu thu hộ" @click.stop="openPrintDialog(row)">
                <i class="pi pi-print"></i>
              </button>
            </span>
            <span v-else class="text-muted" style="font-size:.75rem;">—</span>
          </template>
        </Column>
        <Column header="Thao tác" style="width:220px;">
          <template #body="{ data: row }">
            <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center;">
              <template v-if="row.trang_thai_cod === 'da_tra'">
                <Tag value="Hoàn tất" severity="success" />
              </template>
              <template v-else-if="row.trang_thai_cod === 'cho_chuyen_pending'">
                <Tag value="Đang trong phiếu" severity="help" />
              </template>
              <template v-else-if="row.trang_thai_cod === 'cho_thu' && !row.chanh_id">
                <span class="waiting-cod-label"><i class="pi pi-truck"></i> Chờ giao hàng</span>
              </template>
              <template v-else-if="row.trang_thai_cod === 'da_chuyen'">
                <input type="checkbox" style="margin-right:.4rem;"
                  :checked="selectedDaChuyen.some(r=>r.id===row.id)"
                  @change="e=>{ if(e.target.checked) selectedDaChuyen.push(row); else selectedDaChuyen=selectedDaChuyen.filter(r=>r.id!==row.id); }" />
                <Button label="Trả người gửi" severity="warn" size="small" @click="openDialog(row,'tra-lo')" />
              </template>
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
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total > 20"
        style="display:flex;justify-content:space-between;align-items:center;margin-top:.75rem;font-size:.82rem;color:#64748b;">
        <span>Tổng {{ pagination.total }} biên nhận</span>
        <div style="display:flex;gap:.5rem;">
          <Button icon="pi pi-chevron-left" text rounded size="small" :disabled="page<=1" @click="page--;fetchData()" />
          <span style="line-height:2rem;">Trang {{ page }}/{{ pagination.totalPages }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="page>=pagination.totalPages" @click="page++;fetchData()" />
        </div>
      </div>

      <!-- Footer tổng -->
      <div v-if="summary" class="summary-footer">
        <span>{{ summary.count }} biên nhận</span>
        <span class="text-danger">Tổng COD: {{ fmt(summary.total_thu_ho) }}đ</span>
      </div>
    </div>
    </div><!-- /activeView bn -->

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
        <p style="font-weight:700;margin-bottom:.4rem;color:#1e40af;">📄 Phiếu sẽ tự động tạo:</p>
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

    <!-- Dialog trả lô -->
    <Dialog v-model:visible="traLoVisible" header="💸 Trả COD cho người gửi" :style="{width:'460px'}" modal>
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

    <!-- Dialog lập phiếu chuyển COD -->
    <Dialog v-model:visible="lapPhieuVisible" header="Lập phiếu chuyển COD" :style="{width:'680px'}" modal>
      <div style="margin-bottom:1rem;">
        <label class="bk-label" style="margin-bottom:.4rem;display:block;">Chọn biên nhận đã thu COD</label>
        <MultiSelect v-model="selectedBNIds" :options="bnDaThu" optionLabel="ma_so" optionValue="id"
          :loading="loadingBN" filter placeholder="Tìm và chọn biên nhận..."
          style="width:100%;" display="chip"
          :maxSelectedLabels="5" />
        <div v-if="selectedBNIds.length" style="margin-top:.5rem;font-size:.82rem;color:#64748b;">
          Đã chọn {{ selectedBNIds.length }} BN · Tổng COD: <b class="text-danger">{{ fmt(soTienTong) }}đ</b>
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
.cod-stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
@media (max-width: 1400px) { .cod-stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .cod-stats-grid { grid-template-columns: repeat(2, 1fr); } }

.summary-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  background: var(--bg-sunken);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.info-banner-cod {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .6rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: .83rem;
  color: #1e40af;
  margin-bottom: .75rem;
}
.info-banner-cod .pi { flex-shrink: 0; }

.batch-bar-cod {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem .75rem;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: .83rem;
  color: #9a3412;
  margin-bottom: .5rem;
}
.batch-bar-cod > span { flex: 1; }

.bnth-badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-size: .75rem;
  font-weight: 600;
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.waiting-cod-label {
  font-size: .78rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: .3rem;
}

/* ── Tab Switcher ── */
.view-switcher-card {
  padding: .5rem .75rem !important;
  margin-bottom: .75rem;
  display: flex;
  align-items: center;
}

/* Badge đỏ trên tab "Phiếu chuyển COD" */
.tab-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  font-size: .65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(239,68,68,.4);
}

/* "Bạn gửi / Bạn nhận" label */
.my-turn-label {
  font-size: .7rem;
  color: #7c3aed;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: .2rem;
}

/* Nút in nhỏ trong badge BNTH */
.bnth-print-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: .3rem;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e40af;
  cursor: pointer;
  font-size: .72rem;
  transition: background .15s, color .15s;
}
.bnth-print-btn:hover {
  background: #1e40af;
  color: #fff;
}

/* Phiếu detail header */
.phieu-detail-header {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: .4rem;
}
.phieu-detail-row {
  display: flex;
  align-items: center;
  gap: .4rem;
  font-size: .83rem;
}
.phieu-detail-label {
  font-weight: 600;
  color: var(--text-muted);
  min-width: 80px;
}

/* Route pills trong dialog chi tiết */
.route-pill {
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 999px;
  padding: .15rem .55rem;
  font-size: .75rem;
  font-weight: 700;
  font-family: var(--font-mono);
}
.route-pill--dest {
  background: #d1fae5;
  color: #065f46;
}
</style>
