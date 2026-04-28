<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';
import Row from 'primevue/row';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import StatusBadge from '../components/bien-nhan/StatusBadge.vue';
import BienNhanRightPanel from '../components/bien-nhan/BienNhanRightPanel.vue';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();
const auth = useAuthStore();

// ── Data ──────────────────────────────────────────────────────────
const items = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const vanPhongs = ref([]);
const allChanhs = ref([]);
const page = ref(1);
const limit = 20;

// ── Header filters ────────────────────────────────────────────────
const vpGiaoDich = ref(null);
const dateFrom = ref(new Date());
const dateTo = ref(new Date());
const searchText = ref('');
const filterTrangThai = ref(null);
let searchTimeout = null;

const trangThaiOptions = [
  { label: 'Tất cả', value: null },
  { label: 'Chờ vận chuyển', value: 'cho_vc' },
  { label: 'Đang vận chuyển', value: 'dang_vc' },
  { label: 'Đã đến kho', value: 'da_den_kho' },
  { label: 'Đã báo khách', value: 'da_bao_khach' },
  { label: 'Khách đã nhận', value: 'khach_da_nhan' },
];

// ── Right panel state ─────────────────────────────────────────────
const panelMode = ref('empty'); // empty | view | edit | create
const selectedRow = ref(null);
const selectedBienNhan = ref(null); // full detail from API
const saving = ref(false);
const rightPanelRef = ref(null);

// ── Action bar options ─────────────────────────────────────────────
const autoPrint = ref(true);   // Mặc định luôn tick Lưu & In
const autoAddNew = ref(true);  // Mặc định luôn tick Lưu & thêm mới

// ── Sort state ────────────────────────────────────────────────
const sortField = ref('ngay_bien_nhan');
const sortOrder = ref(-1); // -1 = DESC

// ── Delete confirm ────────────────────────────────────────────────
const deleteDialogVisible = ref(false);
const deleting = ref(false);

// ── Batch status update ──────────────────────────────────────────
const batchSelected = ref([]);
const batchDialogVisible = ref(false);
const batchTrangThai = ref(null);
const batchGhiChu = ref('');
const batchUpdating = ref(false);

// ── Receipt logbook dialog ────────────────────────────────────────
const logbookDialogVisible = ref(false);
const logbookDateFrom = ref(new Date());
const logbookDateTo = ref(new Date());
const logbookVpGui = ref(null);
const logbookVpNhan = ref(null);
const logbookLoadingType = ref(null); // 'pdf' | 'excel' | null

// ── Helpers ───────────────────────────────────────────────────────
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCurrency(val) {
  if (!val) return '—';
  return Number(val).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('vi-VN');
}

// ── Load data ─────────────────────────────────────────────────────
async function loadVanPhongs() {
  const { data: res } = await api.get('/van-phong?active=true');
  vanPhongs.value = res.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
}

async function loadChanhs() {
  try {
    const { data: res } = await api.get('/chanh?active=true');
    allChanhs.value = res.data;
  } catch { allChanhs.value = []; }
}

async function loadData() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit,
      search: searchText.value || undefined,
      sortBy: sortField.value,
      sortOrder: sortOrder.value === 1 ? 'asc' : 'desc',
    };
    if (vpGiaoDich.value) params.vp_gui = vpGiaoDich.value;
    if (dateFrom.value) params.from = toLocalDateStr(dateFrom.value);
    if (dateTo.value) params.to = toLocalDateStr(dateTo.value);
    if (filterTrangThai.value) params.trang_thai = filterTrangThai.value;

    const { data: res } = await api.get('/bien-nhan', { params });
    items.value = res.data;
    totalRecords.value = res.pagination.total;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách biên nhận');
  } finally {
    loading.value = false;
  }
}

// ── Load detail for right panel ───────────────────────────────────
async function loadDetail(id) {
  try {
    const { data: res } = await api.get(`/bien-nhan/${id}`);
    selectedBienNhan.value = res.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải chi tiết biên nhận');
  }
}

// ── Events ────────────────────────────────────────────────────────
function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; loadData(); }, 300);
}

function onFilterChange() {
  page.value = 1;
  loadData();
}

function onSort(event) {
  sortField.value = event.sortField || 'ngay_bien_nhan';
  sortOrder.value = event.sortOrder ?? -1;
  page.value = 1;
  loadData();
}

function onPage(event) {
  page.value = event.page + 1;
  loadData();
}

function onRowSelect(event) {
  // Ignore checkbox clicks
  if (event.originalEvent?.target?.closest('.p-checkbox, .p-selection-column')) return;
  const row = event.data;
  selectedRow.value = row;
  panelMode.value = 'view';
  loadDetail(row.id);
}

// ── Status updated from right panel ────────────────────────────
async function onStatusUpdated() {
  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật trạng thái thành công', life: 3000 });
  await loadData();
  if (selectedBienNhan.value) {
    await loadDetail(selectedBienNhan.value.id);
  }
}

// ── Batch status update ────────────────────────────────────────
function openBatchDialog() {
  batchTrangThai.value = null;
  batchGhiChu.value = '';
  batchDialogVisible.value = true;
}

async function confirmBatchUpdate() {
  if (!batchTrangThai.value || batchSelected.value.length === 0) return;
  batchUpdating.value = true;
  try {
    const ids = batchSelected.value.map(b => b.id);
    await api.patch('/bien-nhan/batch-trang-thai', {
      ids,
      trang_thai: batchTrangThai.value,
      ghi_chu: batchGhiChu.value || `Batch: ${ids.length} biên nhận`,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Đã cập nhật ${ids.length} biên nhận`, life: 3000 });
    batchDialogVisible.value = false;
    batchSelected.value = [];
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật hàng loạt');
  } finally {
    batchUpdating.value = false;
  }
}

// ── Action bar: Thêm ──────────────────────────────────────────────
function onAddNew() {
  selectedRow.value = null;
  selectedBienNhan.value = null;
  panelMode.value = 'create';
}

// ── Action bar: Sửa ──────────────────────────────────────────────
function onEdit() {
  if (!selectedBienNhan.value) return;
  panelMode.value = 'edit';
}

// ── Action bar: Hủy ──────────────────────────────────────────────
function onCancel() {
  if (selectedBienNhan.value) {
    panelMode.value = 'view';
  } else {
    panelMode.value = 'empty';
  }
}

// ── Action bar: Lưu (gọi từ action bar bên ngoài) ────────────────
function handleSaveClick() {
  if (!rightPanelRef.value) return;
  // Validate trước — nếu lỗi thì dừng lại
  if (!rightPanelRef.value.validate()) return;
  const payload = rightPanelRef.value.buildPayload();
  if (autoAddNew.value && panelMode.value === 'create') {
    onSaveContinue(payload);
  } else {
    onSave(payload);
  }
}

// ── Action bar: In ────────────────────────────────────────────────
function onPrint() {
  if (!selectedBienNhan.value) return;
  openPdf(selectedBienNhan.value.id);
}

function openPdf(id) {
  window.open(`/bien-nhan/${id}/xem-pdf`, '_blank');
}

// ── Save ──────────────────────────────────────────────────────────
async function onSave(payload) {
  saving.value = true;
  try {
    if (panelMode.value === 'create') {
      const { data: res } = await api.post('/bien-nhan', payload);
      const createdId = res.data?.id || res.id;
      toast.add({ severity: 'success', summary: 'Thành công', detail: `Tạo biên nhận thành công`, life: 3000 });
      if (res.auto_created_kh?.length) {
        for (const kh of res.auto_created_kh) {
          toast.add({ severity: 'info', summary: 'Tự tạo KH', detail: `${kh.ma_kh} — ${kh.ten_don_vi}`, life: 5000 });
        }
      }
      if (autoPrint.value && createdId) openPdf(createdId);
      await loadData();
      // Select the new row
      if (createdId) {
        panelMode.value = 'view';
        await loadDetail(createdId);
      }
    } else if (panelMode.value === 'edit') {
      await api.put(`/bien-nhan/${selectedBienNhan.value.id}`, payload);
      toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật biên nhận', life: 3000 });
      if (autoPrint.value) openPdf(selectedBienNhan.value.id);
      panelMode.value = 'view';
      await loadData();
      await loadDetail(selectedBienNhan.value.id);
    }
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu biên nhận');
  } finally {
    saving.value = false;
  }
}

async function onSaveContinue(payload) {
  saving.value = true;
  try {
    const { data: res } = await api.post('/bien-nhan', payload);
    const createdId = res.data?.id || res.id;
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Tạo biên nhận thành công', life: 3000 });
    if (res.auto_created_kh?.length) {
      for (const kh of res.auto_created_kh) {
        toast.add({ severity: 'info', summary: 'Tự tạo KH', detail: `${kh.ma_kh} — ${kh.ten_don_vi}`, life: 5000 });
      }
    }
    if (autoPrint.value && createdId) openPdf(createdId);
    await loadData();
    // Reset panel to create mode
    panelMode.value = 'empty';
    setTimeout(() => { panelMode.value = 'create'; }, 50);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu biên nhận');
  } finally {
    saving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────
function onDeleteRequest() {
  if (!selectedBienNhan.value) return;
  deleteDialogVisible.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await api.delete(`/bien-nhan/${selectedBienNhan.value.id}`);
    toast.add({ severity: 'success', summary: 'Đã xóa', detail: `Xóa biên nhận ${selectedBienNhan.value.ma_so}`, life: 3000 });
    deleteDialogVisible.value = false;
    selectedBienNhan.value = null;
    selectedRow.value = null;
    panelMode.value = 'empty';
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xóa biên nhận');
  } finally {
    deleting.value = false;
  }
}

// ── Logbook ───────────────────────────────────────────────────────
function openLogbookDialog() {
  logbookDateFrom.value = dateFrom.value || new Date();
  logbookDateTo.value = dateTo.value || new Date();
  logbookVpGui.value = vpGiaoDich.value || auth.userVanPhong?.id || null;
  logbookVpNhan.value = null;
  logbookPreset.value = null;
  logbookDialogVisible.value = true;
}

const logbookPreset = ref(null);
const presetOptions = [
  { label: 'Hôm nay',   value: 'today' },
  { label: 'Hôm qua',   value: 'yesterday' },
  { label: 'Tuần này',  value: 'week' },
  { label: 'Tháng này', value: 'month' },
  { label: 'Quý này',   value: 'quarter' },
  { label: 'Năm nay',   value: 'year' },
];

function applyPreset(preset) {
  logbookPreset.value = preset;
  const now = new Date();
  let from, to;
  switch (preset) {
    case 'today':
      from = to = new Date(now);
      break;
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      from = to = d;
      break;
    }
    case 'week': {
      const day = now.getDay() || 7; // Mon=1
      from = new Date(now);
      from.setDate(now.getDate() - day + 1);
      to = new Date(now);
      break;
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now);
      break;
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qMonth, 1);
      to = new Date(now);
      break;
    }
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now);
      break;
  }
  logbookDateFrom.value = from;
  logbookDateTo.value = to;
}

function validateLogbookParams() {
  if (!logbookDateFrom.value || !logbookDateTo.value || !logbookVpGui.value || !logbookVpNhan.value) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Chọn ngày, VP gửi và VP nhận', life: 3000 });
    return null;
  }
  const ngayTu = toLocalDateStr(logbookDateFrom.value);
  const ngayDen = toLocalDateStr(logbookDateTo.value);
  if (ngayTu > ngayDen) {
    toast.add({ severity: 'warn', summary: 'Ngày không hợp lệ', detail: 'Ngày bắt đầu phải ≤ ngày kết thúc', life: 3000 });
    return null;
  }
  return {
    ngayTu, ngayDen,
    params: { ngay_tu: ngayTu, ngay_den: ngayDen, vp_gui_id: logbookVpGui.value, vp_nhan_id: logbookVpNhan.value },
  };
}

async function printLogbook() {
  const v = validateLogbookParams();
  if (!v) return;
  logbookLoadingType.value = 'pdf';
  try {
    const { data: res } = await api.get('/bien-nhan/so-bien-nhan-preview', { params: v.params });
    const binary = atob(res.data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    logbookDialogVisible.value = false;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải PDF sổ biên nhận');
  } finally {
    logbookLoadingType.value = null;
  }
}

async function downloadExcel() {
  const v = validateLogbookParams();
  if (!v) return;
  logbookLoadingType.value = 'excel';
  try {
    const { data: res } = await api.get('/bien-nhan/so-bien-nhan-excel-preview', { params: v.params });
    const binary = atob(res.data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so-bien-nhan-${v.ngayTu === v.ngayDen ? v.ngayTu : `${v.ngayTu}_den_${v.ngayDen}`}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    logbookDialogVisible.value = false;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải Excel sổ biên nhận');
  } finally {
    logbookLoadingType.value = null;
  }
}

// ── VP dropdown with "all" option ─────────────────────────────────
const vpOptions = computed(() => [
  { label: 'Tất cả VP', value: null },
  ...vanPhongs.value,
]);
const vpLogbookOptions = computed(() => [
  { label: 'Chọn VP...', value: null },
  ...vanPhongs.value,
]);

// ── Watchers ──────────────────────────────────────────────────────
watch(searchText, onSearch);

// ── Init ──────────────────────────────────────────────────────────
onMounted(async () => {
  await loadVanPhongs();
  await loadChanhs();
  // Default VP = user's VP
  if (auth.userVanPhong) {
    vpGiaoDich.value = auth.userVanPhong.id;
  }
  loadData();
});
</script>

<template>
  <div class="bn-page animate-fade-in">
    <!-- ═══ HEADER ═══ -->
    <div class="bn-header">
      <div class="bn-header-left">
        <i class="pi pi-file-edit header-icon"></i>
        <h1>Biên nhận hàng gửi</h1>
      </div>
      <div class="bn-header-right">
        <div class="header-field">
          <label class="header-lbl">VP giao dịch:</label>
          <Select v-model="vpGiaoDich" :options="vpOptions" optionLabel="label" optionValue="value" @change="onFilterChange" class="header-select" />
        </div>
        <div class="header-field">
          <label class="header-lbl">Từ ngày:</label>
          <DatePicker v-model="dateFrom" dateFormat="dd/mm/yy" showIcon @date-select="onFilterChange" class="header-dp" />
        </div>
        <div class="header-field">
          <label class="header-lbl">Đến ngày:</label>
          <DatePicker v-model="dateTo" dateFormat="dd/mm/yy" showIcon @date-select="onFilterChange" class="header-dp" />
        </div>
        <div class="header-field">
          <label class="header-lbl">Trạng thái:</label>
          <Select v-model="filterTrangThai" :options="trangThaiOptions" optionLabel="label" optionValue="value" @change="onFilterChange" class="header-select" placeholder="Tất cả" />
        </div>
      </div>
    </div>

    <!-- ═══ MAIN SPLIT ═══ -->
    <div class="bn-split">
      <!-- LEFT PANEL -->
      <div class="bn-left">
        <div class="left-search">
          <span class="p-input-icon-left" style="width:100%;">
            <i class="pi pi-search"></i>
            <InputText v-model="searchText" placeholder="Tìm mã, tên, SĐT..." class="search-input" @input="onSearch" />
          </span>
        </div>
        <DataTable
          :value="items"
          :loading="loading"
          :totalRecords="totalRecords"
          :rows="limit"
          :lazy="true"
          paginator
          :first="(page - 1) * limit"
          @page="onPage"
          @row-click="(e) => onRowSelect(e)"
          v-model:selection="batchSelected"
          dataKey="id"
          stripedRows
          size="small"
          scrollable
          scrollDirection="both"
          scrollHeight="flex"
          :rowClass="(data) => data.id === selectedBienNhan?.id ? 'row-active' : ''"
          class="bn-table"
          sortMode="single"
          :sortField="sortField"
          :sortOrder="sortOrder"
          @sort="onSort"
        >
          <!-- Checkbox column for batch-->
          <Column selectionMode="multiple" headerStyle="width: 3rem" v-if="auth.hasRole('admin', 'staff')" />
          <!-- ── Header nhóm 2 tầng ── -->
          <ColumnGroup type="header">
            <Row>
              <Column header="Mã số" field="ma_so" :rowspan="2" :sortable="true" frozen style="background:#eff6ff;color:#1d4ed8;font-weight:700;border-right:2px solid #bfdbfe;vertical-align:middle;min-width:130px;" />
              <Column header="Biên nhận" :colspan="3" style="text-align:center;background:#eff6ff;color:#1d4ed8;font-weight:700;border-right:2px solid #bfdbfe;" />
              <Column header="Người gửi" :colspan="3" style="text-align:center;background:#f0fdf4;color:#166534;font-weight:700;border-right:2px solid #bbf7d0;" />
              <Column header="Người nhận" :colspan="3" style="text-align:center;background:#fefce8;color:#854d0e;font-weight:700;border-right:2px solid #fef08a;" />
              <Column header="Hàng hóa" :colspan="2" style="text-align:center;background:#fdf4ff;color:#6b21a8;font-weight:700;border-right:2px solid #e9d5ff;" />
              <Column header="Thanh toán" :colspan="2" style="text-align:center;background:#fff7ed;color:#9a3412;font-weight:700;" />
            </Row>
            <Row>
              <!-- Biên nhận -->
              <Column header="Ngày" :sortable="true" sortField="ngay_bien_nhan" style="min-width:90px;" />
              <Column header="Giờ" style="min-width:60px;" />
              <Column header="Tuyến" style="min-width:85px;border-right:2px solid #bfdbfe;" />
              <!-- Người gửi -->
              <Column header="Đơn vị" :sortable="true" field="don_vi_gui" style="min-width:140px;" />
              <Column header="Tên" field="nguoi_gui" style="min-width:120px;" />
              <Column header="ĐT" field="dien_thoai_gui" style="min-width:110px;border-right:2px solid #bbf7d0;" />
              <!-- Người nhận -->
              <Column header="Đơn vị" :sortable="true" field="don_vi_nhan" style="min-width:140px;" />
              <Column header="Tên" field="nguoi_nhan" style="min-width:120px;" />
              <Column header="ĐT" field="dien_thoai_nhan" style="min-width:110px;border-right:2px solid #fef08a;" />
              <!-- Hàng hóa -->
              <Column header="Tên hàng" field="ten_hang_hoa" style="min-width:150px;" />
              <Column header="Cước" :sortable="true" sortField="gia_cuoc" style="min-width:90px;text-align:right;border-right:2px solid #e9d5ff;" />
              <!-- Thanh toán -->
              <Column header="TT Thu" style="min-width:85px;" />
              <Column header="Trạng thái" style="min-width:110px;" />
            </Row>
          </ColumnGroup>

          <!-- ── Các cột dữ liệu ── -->
          <Column field="ma_so" frozen style="min-width:130px;font-weight:700;">
            <template #body="{ data }">{{ data.ma_so }}</template>
          </Column>
          <Column sortField="ngay_bien_nhan" style="min-width:90px;">
            <template #body="{ data }">{{ formatDate(data.ngay_bien_nhan) }}</template>
          </Column>
          <Column field="gio_tao" style="min-width:60px;" />
          <Column style="min-width:85px;">
            <template #body="{ data }">{{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}</template>
          </Column>
          <Column field="don_vi_gui" style="min-width:140px;">
            <template #body="{ data }"><span class="text-truncate" style="max-width:140px;display:inline-block;">{{ data.don_vi_gui || '—' }}</span></template>
          </Column>
          <Column field="nguoi_gui" style="min-width:120px;" />
          <Column field="dien_thoai_gui" style="min-width:110px;" />
          <Column field="don_vi_nhan" style="min-width:140px;">
            <template #body="{ data }"><span class="text-truncate" style="max-width:140px;display:inline-block;">{{ data.don_vi_nhan || '—' }}</span></template>
          </Column>
          <Column field="nguoi_nhan" style="min-width:120px;" />
          <Column field="dien_thoai_nhan" style="min-width:110px;" />
          <Column field="ten_hang_hoa" style="min-width:150px;">
            <template #body="{ data }"><span class="text-truncate" style="max-width:150px;display:inline-block;">{{ data.ten_hang_hoa || '—' }}</span></template>
          </Column>
          <Column sortField="gia_cuoc" style="min-width:90px;text-align:right;">
            <template #body="{ data }">{{ formatCurrency(data.gia_cuoc) }}</template>
          </Column>
          <Column style="min-width:85px;">
            <template #body="{ data }"><StatusBadge :value="data.trang_thai_thu" type="thu" /></template>
          </Column>
          <Column style="min-width:110px;">
            <template #body="{ data }"><StatusBadge :value="data.trang_thai" type="trang_thai" /></template>
          </Column>
        </DataTable>
      </div>

      <!-- RIGHT PANEL -->
      <div class="bn-right">
        <BienNhanRightPanel
          ref="rightPanelRef"
          :mode="panelMode"
          :bien-nhan="selectedBienNhan"
          :vp-giao-dich="vpGiaoDich"
          :ngay-giao-dich="dateFrom"
          :van-phongs="vanPhongs"
          :chanhs="allChanhs"
          :nv-ten="auth.user?.ten || ''"
          @save="onSave"
          @save-continue="onSaveContinue"
          @delete="onDeleteRequest"
          @cancel="onCancel"
          @edit="onEdit"
          @print="onPrint"
          @status-updated="onStatusUpdated"
        />
      </div>
    </div>

    <!-- ═══ ACTION BAR ═══ -->
    <div class="bn-action-bar">
      <div class="action-left">
        <div class="action-check" v-if="panelMode === 'create' || panelMode === 'edit'">
          <Checkbox v-model="autoAddNew" :binary="true" inputId="ck_add" />
          <label for="ck_add" class="action-check-lbl">Lưu & thêm mới</label>
        </div>
        <div class="action-check" v-if="panelMode === 'create' || panelMode === 'edit'">
          <Checkbox v-model="autoPrint" :binary="true" inputId="ck_print" />
          <label for="ck_print" class="action-check-lbl"><i class="pi pi-print"></i> Lưu & in</label>
        </div>
      </div>
      <div class="action-right">
        <Button v-if="panelMode === 'view'" icon="pi pi-print" label="In" severity="info" outlined size="small" @click="onPrint" />
        <Button icon="pi pi-plus" label="Thêm" severity="primary" size="small" @click="onAddNew" />
        <Button v-if="panelMode === 'view' && auth.hasRole('admin', 'staff')" icon="pi pi-trash" label="Xóa" severity="danger" outlined size="small" @click="onDeleteRequest" />
        <Button v-if="panelMode === 'view' && auth.hasRole('admin', 'staff')" icon="pi pi-pencil" label="Sửa" severity="warn" size="small" @click="onEdit" />
        <Button v-if="batchSelected.length > 0" icon="pi pi-sync" :label="'Cập nhật TT (' + batchSelected.length + ')'" severity="help" size="small" @click="openBatchDialog" />
        <Button v-if="panelMode === 'edit' || panelMode === 'create'" icon="pi pi-save" label="Lưu" severity="success" size="small" :loading="saving" @click="handleSaveClick" />
        <Button v-if="panelMode === 'edit' || panelMode === 'create'" icon="pi pi-times" label="Hủy" severity="danger" outlined size="small" @click="onCancel" />
        <Button icon="pi pi-book" label="In sổ BN" severity="secondary" outlined size="small" @click="openLogbookDialog" />
      </div>
    </div>

    <!-- ═══ DELETE DIALOG ═══ -->
    <Dialog v-model:visible="deleteDialogVisible" header="Xác nhận xóa" :modal="true" :style="{ width: '380px' }">
      <p style="font-size:0.85rem;">
        Bạn có chắc muốn xóa biên nhận <strong>{{ selectedBienNhan?.ma_so }}</strong>?
      </p>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="deleteDialogVisible = false" />
        <Button label="Xóa" icon="pi pi-trash" severity="danger" size="small" :loading="deleting" @click="confirmDelete" />
      </template>
    </Dialog>

    <!-- ═══ BATCH STATUS DIALOG ═══ -->
    <Dialog v-model:visible="batchDialogVisible" header="Cập nhật trạng thái hàng loạt" :modal="true" :style="{ width: '440px' }">
      <div style="margin-bottom:0.75rem;">
        <p style="font-size:0.85rem; margin-bottom:0.5rem;">Đã chọn <strong>{{ batchSelected.length }}</strong> biên nhận</p>
        <label class="form-label" style="font-size:0.78rem;">Chuyển sang trạng thái:</label>
        <Select v-model="batchTrangThai" :options="trangThaiOptions.filter(o => o.value)" optionLabel="label" optionValue="value" placeholder="Chọn trạng thái..." fluid />
      </div>
      <div style="margin-bottom:0.75rem;">
        <label class="form-label" style="font-size:0.78rem;">Ghi chú (tùy chọn):</label>
        <InputText v-model="batchGhiChu" placeholder="Nhập ghi chú..." fluid />
      </div>
      <div style="max-height:150px; overflow-y:auto; font-size:0.75rem; color:#64748b; border:1px solid var(--border-light); border-radius:8px; padding:0.4rem 0.6rem;">
        <div v-for="bn in batchSelected" :key="bn.id" style="padding:0.15rem 0; border-bottom:1px solid #f1f5f9;">
          <strong>{{ bn.ma_so }}</strong> — {{ bn.don_vi_gui || bn.nguoi_gui || '—' }} → {{ bn.don_vi_nhan || bn.nguoi_nhan || '—' }}
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="batchDialogVisible = false" />
        <Button label="Xác nhận" icon="pi pi-check" size="small" :loading="batchUpdating" :disabled="!batchTrangThai" @click="confirmBatchUpdate" />
      </template>
    </Dialog>

    <!-- ═══ LOGBOOK DIALOG ═══ -->
    <Dialog v-model:visible="logbookDialogVisible" header="In sổ biên nhận hàng gửi" :modal="true" :style="{ width: '440px' }">
      <!-- Preset chips -->
      <div class="logbook-presets">
        <button
          v-for="p in presetOptions" :key="p.value"
          class="preset-chip" :class="{ active: logbookPreset === p.value }"
          @click="applyPreset(p.value)"
        >{{ p.label }}</button>
      </div>
      <div class="form-grid" style="margin-bottom:0.75rem;">
        <div class="form-group">
          <label class="form-label">Từ ngày</label>
          <DatePicker v-model="logbookDateFrom" dateFormat="dd/mm/yy" showIcon fluid placeholder="Từ ngày..." />
        </div>
        <div class="form-group">
          <label class="form-label">Đến ngày</label>
          <DatePicker v-model="logbookDateTo" dateFormat="dd/mm/yy" showIcon fluid placeholder="Đến ngày..." />
        </div>
      </div>
      <div class="form-grid" style="margin-bottom:0.75rem;">
        <div class="form-group">
          <label class="form-label">VP gửi</label>
          <Select v-model="logbookVpGui" :options="vpLogbookOptions" optionLabel="label" optionValue="value" placeholder="Chọn VP gửi" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">VP nhận</label>
          <Select v-model="logbookVpNhan" :options="vpLogbookOptions" optionLabel="label" optionValue="value" placeholder="Chọn VP nhận" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="logbookDialogVisible = false" />
        <Button label="Xuất Excel" icon="pi pi-file-excel" severity="success" outlined size="small"
                :loading="logbookLoadingType === 'excel'"
                :disabled="logbookLoadingType === 'pdf' || (logbookVpGui != null && logbookVpGui === logbookVpNhan)"
                @click="downloadExcel" />
        <Button label="In PDF" icon="pi pi-print" severity="success" size="small"
                :loading="logbookLoadingType === 'pdf'"
                :disabled="logbookLoadingType === 'excel' || (logbookVpGui != null && logbookVpGui === logbookVpNhan)"
                @click="printLogbook" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ═══ Page layout ═══ */
.bn-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - var(--content-padding) * 2);
  gap: 0;
}

/* ═══ Header ═══ */
.bn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bn-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bn-header-left h1 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--secondary);
  margin: 0;
}

.header-icon {
  color: var(--primary);
  font-size: 1rem;
}

.bn-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-field {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.header-lbl {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

:deep(.header-select) { min-width: 160px; }
:deep(.header-select .p-select-label) { font-size: 0.82rem; padding: 0.2rem 0.4rem; }
:deep(.header-dp) { width: 130px; }
:deep(.header-dp .p-inputtext) { font-size: 0.8rem; padding: 0.2rem 0.4rem; height: 28px; }

/* ═══ Split layout ═══ */
.bn-split {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.bn-left {
  flex: 0 0 calc(50% - 0.25rem);
  max-width: calc(50% - 0.25rem);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
}

.bn-right {
  flex: 0 0 calc(50% - 0.25rem);
  max-width: calc(50% - 0.25rem);
  min-height: 0;
}

/* ═══ Left panel ═══ */
.left-search {
  flex-shrink: 0;
}

:deep(.search-input) {
  width: 100%;
  font-size: 0.82rem;
  padding: 0.25rem 0.5rem 0.25rem 2rem;
  height: 30px;
}

:deep(.p-input-icon-left) {
  position: relative;
  display: inline-block;
}

:deep(.p-input-icon-left > .pi) {
  position: absolute;
  font-size: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  left: 0.75rem;
  color: var(--text-muted, #9ca3af);
  pointer-events: none;
}

:deep(.bn-table) {
  flex: 1;
  min-height: 0;
}

:deep(.bn-table .p-datatable-wrapper) {
  flex: 1;
}

:deep(.bn-table .p-datatable-tbody > tr > td),
:deep(.bn-table .p-datatable-thead > tr > th) {
  white-space: nowrap !important;
  vertical-align: middle;
}

:deep(.bn-table .text-truncate) {
  vertical-align: middle;
}

/* Fix CSS nền cho cột ghim (Frozen) để text không bị trong suốt khi cuộn ngang đè lên nhau */
:deep(.bn-table .p-datatable-tbody > tr > td.p-frozen-column) {
  background-color: #ffffff; 
}
:deep(.bn-table .p-datatable-tbody > tr:nth-child(even) > td.p-frozen-column) {
  background-color: #f9fafb; /* Màu nền của dòng sọc striped */
}
:deep(.bn-table .p-datatable-tbody > tr.row-active > td.p-frozen-column) {
  background-color: #ebf3fe !important; /* Màu solid cho row active */
}
:deep(.bn-table .p-datatable-tbody > tr:hover > td.p-frozen-column) {
  background-color: #f3f7fd; /* Màu solid hover */
}

:deep(.bn-table .p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.bn-table .p-datatable-tbody > tr.row-active) {
  background: rgba(59, 130, 246, 0.08) !important;
  outline: 1px solid rgba(59, 130, 246, 0.3);
}

:deep(.bn-table .p-datatable-tbody > tr:hover) {
  background: rgba(59, 130, 246, 0.04);
}

:deep(.bn-table .p-paginator) {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* ═══ Action bar ═══ */
.bn-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  flex-shrink: 0;
  margin-top: 0.35rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.action-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.action-check {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
}

.action-check-lbl {
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

/* ═══ Logbook preset chips ═══ */
.logbook-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.preset-chip {
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 999px;
  background: var(--bg, #fff);
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip:hover {
  border-color: var(--primary, #3b82f6);
  color: var(--primary, #3b82f6);
  background: rgba(59, 130, 246, 0.06);
}

.preset-chip.active {
  border-color: var(--primary, #3b82f6);
  background: var(--primary, #3b82f6);
  color: #fff;
}
</style>
