<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIGS
// ============================================================================
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
import { formatCurrency, formatDate, toISODate, formatPhone } from '../utils/format';
import { downloadBase64File, createBlobUrl } from '../utils/file';

const toast = useToast();
const auth = useAuthStore();

// ============================================================================
// MARK: - COMPONENT STATE
// ============================================================================
// Data
const items = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const vanPhongs = ref([]);
const allChanhs = ref([]);
const page = ref(1);
const limit = 20;

// Header filters
// [H-04] Tách làm 2 filter riêng: VP Gửi và VP Nhận (thay vì 1 vpGiaoDich)
const vpGui = ref(null);
const vpNhan = ref(null);
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
  { label: 'Đang giao hàng', value: 'dang_giao' },
  { label: 'Đã giao Chành', value: 'da_giao_chanh' },
  { label: 'Khách đã nhận', value: 'khach_da_nhan' },
];

// Right panel state
const panelMode = ref('empty'); // empty | view | edit | create
const selectedRow = ref(null);
const selectedBienNhan = ref(null); // full detail from API
const saving = ref(false);
const rightPanelRef = ref(null);

// Action bar options
const autoPrint = ref(true);   // Mặc định luôn tick Lưu & In
const autoAddNew = ref(true);  // Mặc định luôn tick Lưu & thêm mới

// Sort state — mặc định created_at DESC: BN mới tạo luôn nằm đầu
const sortField = ref('created_at');
const sortOrder = ref(-1); // -1 = DESC

// Delete confirm
const deleteDialogVisible = ref(false);
const deleting = ref(false);

// Receipt logbook dialog
const logbookDialogVisible = ref(false);
const logbookDateFrom = ref(new Date());
const logbookDateTo = ref(new Date());
const logbookVpGui = ref(null);
const logbookVpNhan = ref(null);
const logbookLoadingType = ref(null); // 'pdf' | 'excel' | null

// ============================================================================
// MARK: - API & DATA FETCHING
// ============================================================================
async function loadVanPhongs() {
  try {
    const { data: res } = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách văn phòng');
    vanPhongs.value = [];
  }
}

async function loadChanhs() {
  try {
    const { data: res } = await api.get('/chanh?active=true');
    allChanhs.value = res.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách chành — dropdown chành sẽ trống'); // [M-04]
    allChanhs.value = [];
  }
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
    if (vpGui.value)  params.vp_gui  = vpGui.value;  // [H-04] VP Gửi filter
    if (vpNhan.value) params.vp_nhan = vpNhan.value; // [H-04] VP Nhận filter
    if (dateFrom.value) params.from = toISODate(dateFrom.value);
    if (dateTo.value) params.to = toISODate(dateTo.value);
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

async function loadDetail(id) {
  try {
    const { data: res } = await api.get(`/bien-nhan/${id}`);
    selectedBienNhan.value = res.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải chi tiết biên nhận');
  }
}

// ============================================================================
// MARK: - EVENT HANDLERS & USER ACTIONS
// ============================================================================
function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; loadData(); }, 300);
}

function onFilterChange() {
  page.value = 1;
  loadData();
}

function onSort(event) {
  sortField.value = event.sortField || 'created_at';
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

async function onStatusUpdated() {
  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật trạng thái thành công', life: 3000 });
  await loadData();
  if (selectedBienNhan.value) {
    await loadDetail(selectedBienNhan.value.id);
  }
}

function onAddNew() {
  selectedRow.value = null;
  selectedBienNhan.value = null;
  panelMode.value = 'create';
}

function onEdit() {
  if (!selectedBienNhan.value) return;
  panelMode.value = 'edit';
}

function onCancel() {
  if (selectedBienNhan.value) {
    panelMode.value = 'view';
  } else {
    panelMode.value = 'empty';
  }
}

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

function onPrint() {
  if (!selectedBienNhan.value) return;
  openPdf(selectedBienNhan.value.id);
}

function openPdf(id) {
  window.open(`/bien-nhan/${id}/xem-pdf`, '_blank');
}

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

// ============================================================================
// MARK: - RECEIPT LOGBOOK DIALOG LOGIC
// ============================================================================
function openLogbookDialog() {
  logbookDateFrom.value = dateFrom.value || new Date();
  logbookDateTo.value = dateTo.value || new Date();
  logbookVpGui.value = vpGui.value || auth.userVanPhong?.id || null;
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

function toLocalDateStr(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    const blobUrl = createBlobUrl(res.data.base64, 'application/pdf');
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
    const filename = `so-bien-nhan-${v.ngayTu === v.ngayDen ? v.ngayTu : `${v.ngayTu}_den_${v.ngayDen}`}.xlsx`;
    downloadBase64File(res.data.base64, filename);
    logbookDialogVisible.value = false;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải Excel sổ biên nhận');
  } finally {
    logbookLoadingType.value = null;
  }
}

// ============================================================================
// MARK: - COMPUTED PROPERTIES & WATCHERS
// ============================================================================
// [H-03] canDelete: admin luôn xóa được; staff chỉ xóa BN mình tạo
const canDelete = computed(() => {
  if (!selectedBienNhan.value) return false;
  if (auth.isAdmin) return true;
  if (auth.isStaff) return selectedBienNhan.value.nhan_vien_nhap_id === auth.user?.id;
  return false;
});

const vpOptions = computed(() => [
  { label: 'Tất cả VP', value: null },
  ...vanPhongs.value,
]);
const vpLogbookOptions = computed(() => [
  { label: 'Chọn VP...', value: null },
  ...vanPhongs.value,
]);

watch(searchText, onSearch);

// ============================================================================
// MARK: - COMPONENT INITIALIZATION (LIFECYCLE)
// ============================================================================
onMounted(async () => {
  await loadVanPhongs();
  await loadChanhs();
  // Default VP Gửi = VP của NV đăng nhập [H-04]
  // VP Nhận luôn để Tất cả VP (null) theo mặc định
  if (auth.userVanPhong) {
    vpGui.value = auth.userVanPhong.id;
  }
  loadData();
});
</script>

<template>
  <div class="bn-page animate-fade-in">
    <!-- ===================================================================== -->
    <!-- MARK: - HEADER & FILTER SECTION                                       -->
    <!-- ===================================================================== -->
    <div class="bn-header">
      <div class="bn-header-left">
        <i class="pi pi-file-edit header-icon"></i>
        <h1>Biên nhận hàng gửi</h1>
      </div>
      <div class="bn-header-right">
        <div class="header-field">
          <label class="header-lbl">VP gửi:</label>
          <Select v-model="vpGui" :options="vpOptions" optionLabel="label" optionValue="value" @change="onFilterChange" class="header-select" /> <!-- [H-04] -->
        </div>
        <div class="header-field">
          <label class="header-lbl">VP nhận:</label>
          <Select v-model="vpNhan" :options="vpOptions" optionLabel="label" optionValue="value" @change="onFilterChange" class="header-select" /> <!-- [H-04] -->
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

    <!-- ===================================================================== -->
    <!-- MARK: - MAIN SPLIT LAYOUT                                             -->
    <!-- ===================================================================== -->
    <div class="bn-split">
      <!-- ── LEFT PANEL: SEARCH & DATATABLE ── -->
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
          <!-- Header nhóm 2 tầng -->
          <ColumnGroup type="header">
            <Row>
              <Column header="Mã số" field="ma_so" :rowspan="2" :sortable="true" frozen class="col-hdr-bn" style="vertical-align:middle;min-width:130px;" />
              <Column header="Biên nhận" :colspan="3" class="col-hdr-bn" style="text-align:center;" />
              <Column header="Người gửi" :colspan="3" class="col-hdr-gui" style="text-align:center;" />
              <Column header="Người nhận" :colspan="3" class="col-hdr-nhan" style="text-align:center;" />
              <Column header="Hàng hóa" :colspan="2" class="col-hdr-hang" style="text-align:center;" />
              <Column header="Thanh toán" :colspan="2" class="col-hdr-tt" style="text-align:center;" />
            </Row>
            <Row>
              <!-- Biên nhận -->
              <Column header="Ngày" :sortable="true" sortField="ngay_bien_nhan" style="min-width:90px;" />
              <Column header="Giờ" style="min-width:60px;" />
              <Column header="Tuyến" class="col-border-bn" style="min-width:85px;" />
              <!-- Người gửi -->
              <Column header="Đơn vị" :sortable="true" field="don_vi_gui" style="min-width:140px;" />
              <Column header="Tên" field="nguoi_gui" style="min-width:120px;" />
              <Column header="ĐT" field="dien_thoai_gui" class="col-border-gui" style="min-width:110px;" />
              <!-- Người nhận -->
              <Column header="Đơn vị" :sortable="true" field="don_vi_nhan" style="min-width:140px;" />
              <Column header="Tên" field="nguoi_nhan" style="min-width:120px;" />
              <Column header="ĐT" field="dien_thoai_nhan" class="col-border-nhan" style="min-width:110px;" />
              <!-- Hàng hóa -->
              <Column header="Tên hàng" field="ten_hang_hoa" style="min-width:150px;" />
              <Column header="Cước" :sortable="true" sortField="gia_cuoc" class="col-border-hang" style="min-width:90px;text-align:right;" />
              <!-- Thanh toán -->
              <Column header="TT Thu" style="min-width:85px;" />
              <Column header="Trạng thái" style="min-width:110px;" />
            </Row>
          </ColumnGroup>

          <!-- Các cột dữ liệu -->
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
          <Column style="min-width:110px;">
            <template #body="{ data }">{{ formatPhone(data.dien_thoai_gui) }}</template>
          </Column>
          <Column field="don_vi_nhan" style="min-width:140px;">
            <template #body="{ data }"><span class="text-truncate" style="max-width:140px;display:inline-block;">{{ data.don_vi_nhan || '—' }}</span></template>
          </Column>
          <Column field="nguoi_nhan" style="min-width:120px;" />
          <Column style="min-width:110px;">
            <template #body="{ data }">{{ formatPhone(data.dien_thoai_nhan) }}</template>
          </Column>
          <Column field="ten_hang_hoa" style="min-width:150px;">
            <template #body="{ data }">
              <span class="text-truncate" style="max-width:140px;display:inline-block;">{{ data.ten_hang_hoa || '—' }}</span>
              <i v-if="data.hang_hu_khong_den" class="pi pi-exclamation-triangle" style="color:#dc2626;margin-left:4px;font-size:0.75rem;" title="Hàng hư/hỏng/bể không đền" /> <!-- [L-01] -->
            </template>
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

      <!-- ── RIGHT PANEL: DETAILS & EDITING ── -->
      <div class="bn-right">
        <BienNhanRightPanel
          ref="rightPanelRef"
          :mode="panelMode"
          :bien-nhan="selectedBienNhan"
          :vp-giao-dich="vpGui"
          :ngay-giao-dich="dateFrom"
          :van-phongs="vanPhongs"
          :chanhs="allChanhs"
          :nv-ten="auth.user?.ten || ''"
          @delete="onDeleteRequest"
          @cancel="onCancel"
          @edit="onEdit"
          @print="onPrint"
          @status-updated="onStatusUpdated"
        />
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - BOTTOM ACTION BAR                                             -->
    <!-- ===================================================================== -->
    <div class="bn-action-bar">
      <div class="action-left">
        <div class="action-check" v-if="panelMode === 'create'"> <!-- [H-05] chỉ hiện khi create -->
          <Checkbox v-model="autoAddNew" :binary="true" inputId="ck_add" />
          <label for="ck_add" class="action-check-lbl">Lưu &amp; thêm mới</label>
        </div>
        <div class="action-check" v-if="panelMode === 'create' || panelMode === 'edit'">
          <Checkbox v-model="autoPrint" :binary="true" inputId="ck_print" />
          <label for="ck_print" class="action-check-lbl"><i class="pi pi-print"></i> Lưu &amp; in</label>
        </div>
      </div>
      <div class="action-right">
        <Button v-if="panelMode === 'view'" icon="pi pi-print" label="In" severity="info" outlined size="small" @click="onPrint" />
        <Button icon="pi pi-plus" label="Thêm" severity="primary" size="small" @click="onAddNew" />
        <Button v-if="panelMode === 'view' && canDelete" icon="pi pi-trash" label="Xóa" severity="danger" outlined size="small" @click="onDeleteRequest" /> <!-- [H-03] -->
        <Button v-if="panelMode === 'view' && auth.hasRole('admin', 'staff')" icon="pi pi-pencil" label="Sửa" severity="warn" size="small" @click="onEdit" />
        <Button v-if="panelMode === 'edit' || panelMode === 'create'" icon="pi pi-save" label="Lưu" severity="success" size="small" :loading="saving" @click="handleSaveClick" />
        <Button v-if="panelMode === 'edit' || panelMode === 'create'" icon="pi pi-times" label="Hủy" severity="danger" outlined size="small" @click="onCancel" />
        <Button icon="pi pi-book" label="In sổ BN" severity="secondary" outlined size="small" @click="openLogbookDialog" />
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - CONFIRM DELETE DIALOG                                         -->
    <!-- ===================================================================== -->
    <Dialog v-model:visible="deleteDialogVisible" header="Xác nhận xóa" :modal="true" :style="{ width: '420px' }">
      <p style="font-size:0.85rem;">
        Bạn có chắc muốn xóa biên nhận <strong>{{ selectedBienNhan?.ma_so }}</strong>?
      </p>
      <!-- [Fix #5] Cảnh báo COD chưa thu -->
      <div v-if="selectedBienNhan && Number(selectedBienNhan.thu_ho) > 0 && selectedBienNhan.trang_thai_cod !== 'da_tra'"
        style="display:flex;align-items:flex-start;gap:0.5rem;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:0.6rem 0.75rem;margin:0.75rem 0;font-size:0.82rem;color:#991b1b;">
        <i class="pi pi-exclamation-triangle" style="flex-shrink:0;margin-top:1px;"></i>
        <div>
          <strong>Cảnh báo:</strong> Biên nhận này có COD <strong>{{ formatCurrency(selectedBienNhan.thu_ho) }}</strong>
          chưa hoàn tất (trạng thái: {{ selectedBienNhan.trang_thai_cod }}).
          Xóa sẽ mất dữ liệu thu hộ liên quan.
        </div>
      </div>
      <!-- [Fix #5] Cảnh báo cước chưa thu -->
      <div v-if="selectedBienNhan && selectedBienNhan.trang_thai_cuoc_nhan === 'cho_thu'"
        style="display:flex;align-items:flex-start;gap:0.5rem;background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:0.6rem 0.75rem;margin:0.75rem 0;font-size:0.82rem;color:#92400e;">
        <i class="pi pi-exclamation-circle" style="flex-shrink:0;margin-top:1px;"></i>
        <div>
          <strong>Lưu ý:</strong> Biên nhận này có cước nhận <strong>{{ formatCurrency(selectedBienNhan.gia_cuoc) }}</strong>
          chưa được thu. Xóa sẽ mất dữ liệu cước nhận liên quan.
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="deleteDialogVisible = false" />
        <Button label="Xóa" icon="pi pi-trash" severity="danger" size="small" :loading="deleting" @click="confirmDelete" />
      </template>
    </Dialog>


    <!-- ===================================================================== -->
    <!-- MARK: - IN SỔ BIÊN NHẬN (LOGBOOK) DIALOG                              -->
    <!-- ===================================================================== -->
    <Dialog v-model:visible="logbookDialogVisible" :modal="true" :style="{ width: '460px' }" :pt="{ header: { class: 'logbook-dlg-header' } }">
      <template #header>
        <div class="logbook-header-custom">
          <div class="logbook-header-icon">
            <i class="pi pi-book"></i>
          </div>
          <div>
            <div class="logbook-header-title">In sổ biên nhận hàng gửi</div>
            <div class="logbook-header-sub">Chọn khoảng thời gian và văn phòng để xuất báo cáo</div>
          </div>
        </div>
      </template>

      <!-- ── Khoảng thời gian ── -->
      <div class="logbook-section">
        <div class="logbook-section-title">
          <i class="pi pi-calendar"></i>
          <span>Khoảng thời gian</span>
        </div>
        <!-- Preset chips -->
        <div class="logbook-presets">
          <button
            v-for="p in presetOptions" :key="p.value"
            class="preset-chip" :class="{ active: logbookPreset === p.value }"
            @click="applyPreset(p.value)"
          >{{ p.label }}</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label"><i class="pi pi-calendar-plus" style="font-size:0.7rem;margin-right:0.3rem;"></i>Từ ngày</label>
            <DatePicker v-model="logbookDateFrom" dateFormat="dd/mm/yy" showIcon fluid placeholder="Từ ngày..." />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="pi pi-calendar-minus" style="font-size:0.7rem;margin-right:0.3rem;"></i>Đến ngày</label>
            <DatePicker v-model="logbookDateTo" dateFormat="dd/mm/yy" showIcon fluid placeholder="Đến ngày..." />
          </div>
        </div>
      </div>

      <!-- ── Văn phòng ── -->
      <div class="logbook-section">
        <div class="logbook-section-title">
          <i class="pi pi-building"></i>
          <span>Văn phòng</span>
        </div>
        <div class="form-group logbook-vp-row">
          <label class="form-label">
            <span class="vp-badge vp-gui">GỬI</span>
            Văn phòng gửi
          </label>
          <Select v-model="logbookVpGui" :options="vpLogbookOptions" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng gửi..." fluid />
        </div>
        <div class="logbook-vp-arrow">
          <i class="pi pi-arrow-down"></i>
        </div>
        <div class="form-group logbook-vp-row">
          <label class="form-label">
            <span class="vp-badge vp-nhan">NHẬN</span>
            Văn phòng nhận
          </label>
          <Select v-model="logbookVpNhan" :options="vpLogbookOptions" optionLabel="label" optionValue="value" placeholder="Chọn văn phòng nhận..." fluid />
        </div>
      </div>

      <template #footer>
        <div class="logbook-footer">
          <Button label="Hủy" severity="secondary" text size="small" @click="logbookDialogVisible = false" />
          <div class="logbook-footer-actions">
            <Button label="Xuất Excel" icon="pi pi-file-excel" severity="success" outlined size="small"
                    :loading="logbookLoadingType === 'excel'"
                    :disabled="logbookLoadingType === 'pdf'"
                    @click="downloadExcel" />
            <Button label="In PDF" icon="pi pi-print" severity="primary" size="small"
                    :loading="logbookLoadingType === 'pdf'"
                    :disabled="logbookLoadingType === 'excel'"
                    @click="printLogbook" />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - PAGE LAYOUT & HEADERS
   ============================================================================ */
/* Column Header Groups (brand-aligned) */
:deep(.col-hdr-bn)  { background: var(--navy-50) !important; color: var(--navy-500) !important; font-weight: 700 !important; border-right: 2px solid var(--navy-100) !important; }
:deep(.col-hdr-gui)  { background: var(--success-light) !important; color: #166534 !important; font-weight: 700 !important; border-right: 2px solid var(--success-border) !important; }
:deep(.col-hdr-nhan) { background: var(--gold-50) !important; color: var(--gold-600) !important; font-weight: 700 !important; border-right: 2px solid var(--gold-200) !important; }
:deep(.col-hdr-hang) { background: #f5f3ff !important; color: #6b21a8 !important; font-weight: 700 !important; border-right: 2px solid #ddd6fe !important; }
:deep(.col-hdr-tt)   { background: var(--warning-light) !important; color: #9a3412 !important; font-weight: 700 !important; }

/* Sub-row border separators */
:deep(.col-border-bn)   { border-right: 2px solid var(--navy-100) !important; }
:deep(.col-border-gui)  { border-right: 2px solid var(--success-border) !important; }
:deep(.col-border-nhan) { border-right: 2px solid var(--gold-200) !important; }
:deep(.col-border-hang) { border-right: 2px solid #ddd6fe !important; }

.bn-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - var(--content-padding) * 2);
  gap: 0;
}

/* Header */
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

/* ============================================================================
   MARK: - MAIN SPLIT LAYOUT STYLES
   ============================================================================ */
/* Split layout */
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
  display: flex;
  flex-direction: column;
}

/* ============================================================================
   MARK: - LEFT TABLE PANEL STYLES
   ============================================================================ */
/* Left panel */
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

/* ============================================================================
   MARK: - ACTION BAR STYLES
   ============================================================================ */
/* Action bar */
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

/* ============================================================================
   MARK: - LOGBOOK DIALOG STYLES
   ============================================================================ */
/* Logbook Dialog — Custom Header */
.logbook-header-custom {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.1rem 0;
}

.logbook-header-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.logbook-header-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--secondary);
  line-height: 1.3;
}

.logbook-header-sub {
  font-size: 0.74rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

/* Logbook Dialog — Sections */
.logbook-section {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem;
  margin-bottom: 0.65rem;
}

.logbook-section-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.7rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-light);
}

.logbook-section-title .pi {
  font-size: 0.82rem;
}

/* Logbook preset chips */
.logbook-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.7rem;
}

.preset-chip {
  padding: 0.22rem 0.6rem;
  font-size: 0.76rem;
  font-weight: 600;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 999px;
  background: var(--bg-card, #fff);
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

/* Logbook VP rows */
.logbook-vp-row {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
}

.logbook-vp-row .form-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.vp-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.45rem;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.vp-badge.vp-gui {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
}

.vp-badge.vp-nhan {
  background: linear-gradient(135deg, #10b981, #065f46);
  color: #fff;
}

.logbook-vp-arrow {
  display: flex;
  justify-content: center;
  padding: 0.2rem 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Logbook footer */
.logbook-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.logbook-footer-actions {
  display: flex;
  gap: 0.4rem;
}
</style>
