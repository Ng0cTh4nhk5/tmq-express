<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, computed, onMounted, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import AutoComplete from 'primevue/autocomplete';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatDate, formatNumber, truocThue, toISODate } from '../utils/format';

// ── Helper: xác định tên người trả cước để hiển thị ──────────────
function getPayerDisplay(bn) {
  if (bn.trang_thai_thu === 'chua_thu') {
    return {
      ten:     bn.don_vi_nhan || bn.nguoi_nhan || '—',
      label:   'Người nhận',
      severity: 'warn',
    };
  }
  if (bn.trang_thai_thu === 'cong_no') {
    // Với công nợ, hiện tên người gửi (backend sẽ kiểm tra vai_tro CongNo khi xuất)
    return {
      ten:     bn.don_vi_gui || bn.nguoi_gui || '—',
      label:   'Công nợ',
      severity: 'danger',
    };
  }
  // da_thu — người gửi trả
  return {
    ten:     bn.don_vi_gui || bn.nguoi_gui || '—',
    label:   'Người gửi',
    severity: 'success',
  };
}
import { downloadBase64File } from '../utils/file';

const toast = useToast();

// ============================================================================
// MARK: - STATE & CONSTANTS
// ============================================================================
// ── Đơn vị hàng hoá ──────────────────────────────────────────
const UNITS = ['Kiện', 'Bao', 'Thùng', 'Gói', 'Bọc', 'Cuộn', 'Cái', 'Bộ', 'Khác'];

// ── State chính ───────────────────────────────────────────────
const tab = ref('pending');
const selectedDate = ref(new Date());
const bienSoXe = ref('');
const loading = ref(false);
const exporting = ref(false);

// ============================================================================
// MARK: - STATE: BN EDITS (PENDING TAB)
// ============================================================================
// ── Case A: BN chờ từ DB ──────────────────────────────────────
const pendingList = ref([]);   // Danh sách BN chờ từ API
const selectedBNs = ref([]);   // BN được checkbox

// Mỗi BN cần lưu kèm danh sách hàng hoá để NV chỉnh
// Dùng Map: bien_nhan_id → [{ so_luong, don_vi }, ...]
const bnEdits = ref({});

function initBNEdits(bns) {
  const edits = {};
  for (const bn of bns) {
    if (Array.isArray(bn.hang_hoa_json) && bn.hang_hoa_json.length > 0) {
      // Lấy TẤT CẢ items từ hang_hoa_json
      edits[bn.id] = bn.hang_hoa_json.map(i => ({
        so_luong: Number(i.so_luong) || 1,
        don_vi: i.don_vi || 'Kiện',
      }));
    } else {
      // Fallback: 1 item mặc định
      edits[bn.id] = [{ so_luong: 1, don_vi: 'Kiện' }];
    }
  }
  bnEdits.value = edits;
}

function addBNItem(bnId) {
  bnEdits.value[bnId].push({ so_luong: 1, don_vi: 'Kiện' });
}

function removeBNItem(bnId, idx) {
  if (bnEdits.value[bnId].length > 1) {
    bnEdits.value[bnId].splice(idx, 1);
  }
}

// ============================================================================
// MARK: - STATE & API: OFFICES ( tuyến tự kê )
// ============================================================================
// ── Văn phòng (dùng cho dropdown tuyến tự kê) ────────────────
const vanPhongs = ref([]);
async function loadVanPhongs() {
  try {
    const res = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id, ma: v.ma_vp }));
  } catch { vanPhongs.value = []; }
}

// ============================================================================
// MARK: - STATE: MANUAL INPUT ROWS
// ============================================================================
// ── Case B: Dòng tự kê ───────────────────────────────────────
const manualRows = ref([]);
const manualDialogVisible = ref(false);
const manualEditing = ref(null); // null = thêm mới, { idx, data } = sửa
const manualForm = ref(createEmptyManual());



function createEmptyManual() {
  return {
    ngay: selectedDate.value || new Date(),
    vp_gui_id: null,
    vp_nhan_id: null,
    // Người gửi
    don_vi_gui: '',
    dia_chi_gui: '',
    // Hàng hoá (text tự do)
    hang_hoa: '',
    gia_cuoc: 0,
  };
}

// Label tuyến tính từ vp_gui_id / vp_nhan_id
function getTuyenLabel(row) {
  const gui = vanPhongs.value.find(v => v.value === row.vp_gui_id)?.ma || '?';
  const nhan = vanPhongs.value.find(v => v.value === row.vp_nhan_id)?.ma || '?';
  return `${gui}→${nhan}`;
}

function openManualDialog(row = null, idx = null) {
  if (row) {
    manualEditing.value = { idx };
    manualForm.value = { ...row };
  } else {
    manualEditing.value = null;
    manualForm.value = createEmptyManual();
  }
  manualDialogVisible.value = true;
}

function saveManualRow() {
  if (!manualForm.value.don_vi_gui?.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin người gửi', detail: 'Nhập tên đơn vị gửi', life: 2500 });
    return;
  }
  if (!manualForm.value.gia_cuoc || manualForm.value.gia_cuoc <= 0) {
    toast.add({ severity: 'warn', summary: 'Cần nhập giá cước', life: 2000 });
    return;
  }
  const saved = { ...manualForm.value };
  if (manualEditing.value !== null) {
    manualRows.value[manualEditing.value.idx] = saved;
  } else {
    manualRows.value.push(saved);
  }
  manualDialogVisible.value = false;
}

function removeManualRow(idx) {
  manualRows.value.splice(idx, 1);
}

// ============================================================================
// MARK: - CUSTOMER AUTOCOMPLETE SUGGESTIONS
// ============================================================================
// ── Autocomplete Khách hàng ────────────────────────────────────
const guiSuggestions = ref([]);

async function searchKH(event) {
  const q = event.query;
  if (!q || q.length < 2) return;
  try {
    const { data: res } = await api.get('/khach-hang/autocomplete', { params: { q } });
    guiSuggestions.value = res.data;
  } catch {
    guiSuggestions.value = [];
  }
}

function onSelectGui(event) {
  const kh = event.value;
  nextTick(() => {
    manualForm.value.don_vi_gui = kh.ten_don_vi || '';
  });
  manualForm.value.dia_chi_gui = kh.dia_chi || '';
}


// ============================================================================
// MARK: - COMPUTED STATE
// ============================================================================
// ── Computed: tổng cộng ───────────────────────────────────────
const tongSauThue = computed(() => {
  let total = 0;
  for (const bn of selectedBNs.value) total += Number(bn.gia_cuoc);
  for (const row of manualRows.value) total += Number(row.gia_cuoc || 0);
  return total;
});
const tongTruocThue = computed(() => {
  let sum = 0;
  for (const bn of selectedBNs.value) sum += Math.round(Number(bn.gia_cuoc) / 1.08);
  for (const row of manualRows.value) sum += Math.round(Number(row.gia_cuoc || 0) / 1.08);
  return sum;
});
const totalItems = computed(() => selectedBNs.value.length + manualRows.value.length);

// ============================================================================
// MARK: - API: LOADS & PENDING ITEMS
// ============================================================================
// ── Lấy BN chờ HĐĐT theo ngày ─────────────────────────────────
async function loadPending() {
  loading.value = true;
  selectedBNs.value = [];
  try {
    const ngay = toISODate(selectedDate.value);
    const res = await api.get('/bang-ke/bien-nhan-cho', { params: { ngay } });
    pendingList.value = res.data.data;
    initBNEdits(pendingList.value);
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách BN chờ');
  }
  loading.value = false;
}

// ── Lịch sử ──────────────────────────────────────────────────
const historyList = ref([]);

async function fetchHistory() {
  try {
    const res = await api.get('/bang-ke?limit=50');
    historyList.value = res.data.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải lịch sử');
  }
}

// ============================================================================
// MARK: - API: EXPORT BANG KE TO EXCEL
// ============================================================================
// ── Xuất Excel ───────────────────────────────────────────────
async function exportBangKe() {
  if (totalItems.value === 0) {
    toast.add({ severity: 'warn', summary: 'Chưa có dữ liệu', detail: 'Chọn BN hoặc thêm dòng tự kê', life: 2500 });
    return;
  }
  exporting.value = true;
  try {
    const items = [];

    // Case A
    for (const bn of selectedBNs.value) {
      const editItems = bnEdits.value[bn.id] || [];
      const hangHoa = editItems.length
        ? editItems.map(i => `${i.so_luong} ${i.don_vi}`).join(', ')
        : (bn.ten_hang_hoa || '');
      items.push({
        bien_nhan_id: bn.id,
        hang_hoa: hangHoa,
        gia_cuoc: Number(bn.gia_cuoc),
      });
    }

    // Case B
    for (const row of manualRows.value) {
      const vpGui = vanPhongs.value.find(v => v.value === row.vp_gui_id);
      const vpNhan = vanPhongs.value.find(v => v.value === row.vp_nhan_id);
      const tuyen = (vpGui && vpNhan) ? `${vpGui.ma}→${vpNhan.ma}` : '';
      items.push({
        bien_nhan_id: null,
        ngay: toISODate(row.ngay || selectedDate.value),
        tuyen,
        nguoi_gui: row.don_vi_gui || '',
        dia_chi_gui: row.dia_chi_gui || '',
        hang_hoa: row.hang_hoa || '',
        gia_cuoc: Number(row.gia_cuoc || 0),
      });
    }


    const payload = { items };
    if (bienSoXe.value?.trim()) payload.bien_so_xe = bienSoXe.value.trim();

    const res = await api.post('/bang-ke', payload);
    const { bang_ke, file } = res.data.data;

    downloadBase64File(file.base64, file.name);
    toast.add({
      severity: 'success',
      summary: `Đã xuất ${bang_ke.ma_bang_ke}`,
      detail: `${bang_ke.so_bien_nhan} dòng`,
      life: 4000,
    });

    // Reset
    selectedBNs.value = [];
    manualRows.value = [];
    bienSoXe.value = '';
    await loadPending();
    await fetchHistory();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xuất bảng kê');
  }
  exporting.value = false;
}

async function redownload(bk) {
  try {
    const res = await api.get(`/bang-ke/${bk.id}/download`);
    const { file } = res.data.data;
    downloadBase64File(file.base64, file.name);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi tải file excel');
  }
}

// ============================================================================
// MARK: - E-INVOICE BUSINESS MANAGEMENT (HDDT)
// ============================================================================
// ── Quản lý Doanh nghiệp HĐĐT ────────────────────────────────
const dnDialogVisible = ref(false);
const doanhNghieps = ref([]);
const dnFormMode = ref('add'); // add | edit
const dnEditId = ref(null);
const dnForm = ref({ ten: '', ma_so_thue: '', dia_chi: '' });
const dnSaving = ref(false);

async function loadDN() {
  try {
    const res = await api.get('/doanh-nghiep-hddt');
    doanhNghieps.value = res.data.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải doanh nghiệp');
  }
}

function openAddDN() {
  dnFormMode.value = 'add';
  dnEditId.value = null;
  dnForm.value = { ten: '', ma_so_thue: '', dia_chi: '' };
}

function openEditDN(dn) {
  dnFormMode.value = 'edit';
  dnEditId.value = dn.id;
  dnForm.value = { ten: dn.ten, ma_so_thue: dn.ma_so_thue || '', dia_chi: dn.dia_chi || '' };
}

async function saveDN() {
  if (!dnForm.value.ten?.trim()) {
    toast.add({ severity: 'warn', summary: 'Nhập tên doanh nghiệp', life: 2000 });
    return;
  }
  dnSaving.value = true;
  try {
    if (dnFormMode.value === 'add') {
      await api.post('/doanh-nghiep-hddt', dnForm.value);
    } else {
      await api.put(`/doanh-nghiep-hddt/${dnEditId.value}`, dnForm.value);
    }
    toast.add({ severity: 'success', summary: 'Đã lưu', life: 2000 });
    openAddDN();
    await loadDN();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi lưu doanh nghiệp');
  }
  dnSaving.value = false;
}

async function toggleDN(dn) {
  try {
    await api.patch(`/doanh-nghiep-hddt/${dn.id}/active`, { active: !dn.active });
    await loadDN();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật trạng thái');
  }
}

// ============================================================================
// MARK: - LIFECYCLE & SHORTENED HELPERS
// ============================================================================
// ── Helpers — alias ngắn gọn từ utils ─────────────────────────
// downloadBase64File → từ utils/file (đã import ở đầu file)
// toISODate          → từ utils/format (đã import ở đầu file)
const fmt     = (n) => formatNumber(n);           // dùng trong template
const fmtDate = formatDate;                        // dùng trong template
function fmtTruocThue(n) {
  return truocThue(n).toLocaleString('vi-VN');     // tính trước thuế rồi format
}

onMounted(async () => {
  // Chạy độc lập — lỗi riêng không làm treo trang
  loadPending().catch(() => {});
  fetchHistory().catch(() => {});
  loadDN().catch(() => {});
  loadVanPhongs().catch(() => {});
});
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & EXCEL ACTIONS                                        -->
  <!-- ===================================================================== -->
  <div class="animate-fade-in">
    <PageHeader title="Bảng kê hóa đơn điện tử" icon="pi pi-file-excel">
      <template #actions>
        <Button label="Quản lý DN" icon="pi pi-cog" severity="secondary" text size="small"
          @click="dnDialogVisible = true; loadDN()" />
        <Button v-if="totalItems > 0"
          :label="`Xuất Excel (${totalItems} dòng)`"
          icon="pi pi-download" severity="success" size="small"
          :loading="exporting" @click="exportBangKe" />
      </template>
    </PageHeader>

    <!-- ===================================================================== -->
    <!-- MARK: - FILTERS TOOLBAR                                               -->
    <!-- ===================================================================== -->
    <!-- ── Toolbar ── -->
    <div class="bk-toolbar card" style="margin-bottom: 0.75rem;">
      <div class="toolbar-row">
        <div class="toolbar-group">
          <label class="toolbar-lbl">Ngày:</label>
          <DatePicker v-model="selectedDate" dateFormat="dd/mm/yy" showIcon
            @update:modelValue="loadPending" style="width: 155px;" />
        </div>
        <div class="toolbar-group">
          <label class="toolbar-lbl">Biển số xe:</label>
          <InputText v-model="bienSoXe" placeholder="VD: 51C-12345" style="width: 155px;" />
        </div>
        <Button label="Thêm dòng tự kê" icon="pi pi-plus" outlined size="small"
          @click="openManualDialog()" />
      </div>

      <!-- Tổng cộng nếu có dữ liệu -->
      <div v-if="totalItems > 0" class="toolbar-summary">
        <span class="summary-label">Tổng cộng ({{ totalItems }} dòng):</span>
        <span class="summary-truoc">{{ fmt(tongTruocThue) }}đ <small>trước thuế</small></span>
        <span class="summary-sep">/</span>
        <span class="summary-sau">{{ fmt(tongSauThue) }}đ <small>sau thuế</small></span>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TABS SWITCHER                                                 -->
    <!-- ===================================================================== -->
    <!-- ── Tabs ── -->
    <div class="tab-bar" style="margin-bottom: 0.75rem;">
      <Button :label="`Biên nhận chờ (${pendingList.length})`" size="small"
        :severity="tab === 'pending' ? undefined : 'secondary'"
        :outlined="tab !== 'pending'" @click="tab = 'pending'" />
      <Button :label="`Dòng tự kê (${manualRows.length})`" size="small"
        :severity="tab === 'manual' ? undefined : 'secondary'"
        :outlined="tab !== 'manual'" @click="tab = 'manual'" />
      <Button :label="`Lịch sử (${historyList.length})`" size="small"
        :severity="tab === 'history' ? undefined : 'secondary'"
        :outlined="tab !== 'history'" @click="tab = 'history'" />
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB: PENDING ITEMS                                            -->
    <!-- ===================================================================== -->
    <!-- ══ TAB: BN Chờ (Case A) ══ -->
    <div class="card" v-if="tab === 'pending'">
      <DataTable :value="pendingList" :loading="loading"
        v-model:selection="selectedBNs"
        stripedRows size="small" responsiveLayout="scroll" dataKey="id">

        <template #empty>
          <div class="empty-msg">
            <i class="pi pi-inbox" style="font-size:1.5rem; opacity:.3;"></i>
            <p>Không có biên nhận chờ HĐĐT cho ngày này</p>
          </div>
        </template>

        <Column selectionMode="multiple" style="width: 36px;" />
        <Column header="STT" style="width: 42px; text-align:center;">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>
        <Column field="ma_so" header="Mã BN" style="width: 110px; font-weight:700;" />
        <Column header="Ngày" style="width: 78px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="width: 74px;">
          <template #body="{ data }">{{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}</template>
        </Column>
        <Column header="Người trả cước" style="min-width: 160px;">
          <template #body="{ data }">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <div style="display:flex; align-items:center; gap:5px;">
                <Tag :value="getPayerDisplay(data).label"
                  :severity="getPayerDisplay(data).severity"
                  style="font-size:0.68rem; padding:1px 5px; line-height:1.4;"
                />
                <span class="text-truncate" style="max-width:115px; display:inline-block; font-size:0.82rem;">
                  {{ getPayerDisplay(data).ten }}
                </span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Hàng hoá" style="min-width: 220px;">
          <template #body="{ data }">
            <div class="hh-items">
              <div v-for="(item, idx) in bnEdits[data.id]" :key="idx" class="hh-edit">
                <InputNumber
                  v-model="item.so_luong"
                  :min="1" :max="9999"
                  showButtons buttonLayout="horizontal"
                  incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus"
                  class="hh-num"
                />
                <Select
                  v-model="item.don_vi"
                  :options="UNITS"
                  class="hh-unit"
                />
                <Button v-if="bnEdits[data.id].length > 1"
                  icon="pi pi-times" text rounded size="small" severity="danger"
                  style="width:22px; height:22px; padding:0;"
                  @click="removeBNItem(data.id, idx)" />
              </div>
              <Button icon="pi pi-plus" text size="small" class="hh-add"
                label="Thêm" @click="addBNItem(data.id)" />
            </div>
          </template>
        </Column>

        <Column header="Trước thuế" style="width: 90px; text-align:right;">
          <template #body="{ data }">
            <span class="cuoc-before">{{ fmtTruocThue(data.gia_cuoc) }}</span>
          </template>
        </Column>
        <Column header="Sau thuế" style="width: 88px; text-align:right;">
          <template #body="{ data }">
            <span class="cuoc-after">{{ fmt(data.gia_cuoc) }}</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB: MANUAL ENTRIES                                           -->
    <!-- ===================================================================== -->
    <!-- ══ TAB: Dòng tự kê (Case B) ══ -->
    <div class="card" v-if="tab === 'manual'">
      <div v-if="!manualRows.length" class="empty-msg">
        <i class="pi pi-pencil" style="font-size:1.5rem; opacity:.3;"></i>
        <p>Chưa có dòng tự kê. Bấm "Thêm dòng tự kê" để bắt đầu.</p>
      </div>
      <DataTable v-else :value="manualRows" stripedRows size="small" responsiveLayout="scroll">
        <Column header="STT" style="width: 42px; text-align:center;">
          <template #body="{ index }">{{ index + 1 }}</template>
        </Column>
        <Column header="Ngày" style="width: 78px;">
          <template #body="{ data }">{{ fmtDate(data.ngay) }}</template>
        </Column>
        <Column header="Tuyến" style="width: 80px;">
          <template #body="{ data }">
            <span class="tuyen-badge">{{ getTuyenLabel(data) }}</span>
          </template>
        </Column>
        <Column header="Người gửi" style="min-width: 120px;">
          <template #body="{ data }">
            <div class="cell-main">{{ data.don_vi_gui || data.nguoi_gui || '—' }}</div>
            <div class="cell-sub" v-if="data.don_vi_gui && data.nguoi_gui">{{ data.nguoi_gui }}</div>
          </template>
        </Column>
        <Column header="Người nhận" style="min-width: 120px;">
          <template #body="{ data }">
            <div class="cell-main">{{ data.don_vi_nhan || data.nguoi_nhan || '—' }}</div>
            <div class="cell-sub" v-if="data.don_vi_nhan && data.nguoi_nhan">{{ data.nguoi_nhan }}</div>
          </template>
        </Column>
        <Column field="hang_hoa" header="Hàng hoá" style="min-width: 110px;" />
        <Column header="Trước thuế" style="width: 90px; text-align:right;">
          <template #body="{ data }">
            <span class="cuoc-before">{{ fmtTruocThue(data.gia_cuoc) }}</span>
          </template>
        </Column>
        <Column header="Sau thuế" style="width: 88px; text-align:right;">
          <template #body="{ data }">
            <span class="cuoc-after">{{ fmt(data.gia_cuoc) }}</span>
          </template>
        </Column>
        <Column header="" style="width: 70px;">
          <template #body="{ data, index }">
            <Button icon="pi pi-pencil" text rounded size="small" severity="info"
              @click="openManualDialog(data, index)" v-tooltip.left="'Sửa'" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger"
              @click="removeManualRow(index)" v-tooltip.left="'Xoá'" />
          </template>
        </Column>
      </DataTable>
      <div style="margin-top: 0.75rem;">
        <Button label="Thêm dòng" icon="pi pi-plus" outlined size="small"
          @click="openManualDialog()" />
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB: HISTORY LOGS                                             -->
    <!-- ===================================================================== -->
    <!-- ══ TAB: Lịch sử ══ -->
    <div class="card" v-if="tab === 'history'">
      <DataTable :value="historyList" stripedRows size="small" responsiveLayout="scroll" dataKey="id">
        <Column field="ma_bang_ke" header="Mã bảng kê" style="width: 110px; font-weight:700;" />
        <Column header="Ngày xuất" style="width: 90px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_xuat) }}</template>
        </Column>
        <Column field="bien_so_xe" header="Biển số xe" style="width: 100px;" />
        <Column header="Số dòng" style="width: 80px; text-align:center;">
          <template #body="{ data }">
            <Tag :value="String(data.so_bien_nhan)" severity="info" />
          </template>
        </Column>
        <Column header="Tổng cước (ST)" style="width: 130px; text-align:right;">
          <template #body="{ data }">{{ fmt(data.tong_cuoc) }}đ</template>
        </Column>
        <Column header="" style="width: 50px;">
          <template #body="{ data }">
            <Button icon="pi pi-download" text rounded severity="info" size="small"
              @click="redownload(data)" v-tooltip.left="'Tải lại'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: MANUAL ROW CREATOR/EDITOR                             -->
    <!-- ===================================================================== -->
    <!-- ══ DIALOG: Thêm/Sửa dòng tự kê ══ -->
    <Dialog v-model:visible="manualDialogVisible"
      :modal="true" :style="{ width: '500px' }" :draggable="false">

      <template #header>
        <div class="manual-dlg-header">
          <div class="manual-dlg-icon">
            <i :class="manualEditing !== null ? 'pi pi-pencil' : 'pi pi-plus'"></i>
          </div>
          <div>
            <div class="manual-dlg-title">{{ manualEditing !== null ? 'Sửa dòng tự kê' : 'Thêm dòng tự kê' }}</div>
            <div class="manual-dlg-sub">Nhập thông tin tương tự biên nhận hàng gửi</div>
          </div>
        </div>
      </template>

      <!-- ── Section: Ngày & Tuyến ── -->
      <div class="form-section">
        <div class="form-section-title"><i class="pi pi-map-marker"></i> Ngày & Tuyến</div>
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label">Ngày</label>
            <DatePicker v-model="manualForm.ngay" dateFormat="dd/mm/yy" showIcon fluid />
          </div>
          <div class="form-group">
            <label class="form-label"><span class="vp-badge vp-gui">Gửi</span> Văn phòng gửi</label>
            <Select v-model="manualForm.vp_gui_id"
              :options="vanPhongs" optionLabel="label" optionValue="value"
              placeholder="Chọn VP gửi..." fluid filter />
          </div>
          <div class="form-group">
            <label class="form-label"><span class="vp-badge vp-nhan">Nhận</span> Văn phòng nhận</label>
            <Select v-model="manualForm.vp_nhan_id"
              :options="vanPhongs" optionLabel="label" optionValue="value"
              placeholder="Chọn VP nhận..." fluid filter />
          </div>
        </div>
      </div>

      <!-- ── Người gửi ── -->
      <div class="form-section form-section-green">
        <div class="form-section-title"><i class="pi pi-send"></i> Người gửi</div>
        <div class="form-group">
          <label class="form-label">Đơn vị gửi <span class="req">*</span></label>
          <AutoComplete
            v-model="manualForm.don_vi_gui"
            :suggestions="guiSuggestions"
            field="ten_don_vi"
            @complete="searchKH"
            @item-select="onSelectGui"
            placeholder="Gõ tên đơn vị hoặc số điện thoại..."
            fluid
          >
            <template #option="{ option }">
              <div class="ac-option">
                <span class="ac-name">{{ option.ten_don_vi }}</span>
                <span class="ac-sub">{{ option.dien_thoai }}{{ option.nguoi_lien_he ? ' — ' + option.nguoi_lien_he : '' }}</span>
              </div>
            </template>
          </AutoComplete>
        </div>
        <div class="form-group">
          <label class="form-label">Địa chỉ gửi</label>
          <InputText v-model="manualForm.dia_chi_gui" placeholder="Địa chỉ gửi..." fluid />
        </div>
      </div>

      <!-- ── Hàng hoá & Cước ── -->
      <div class="form-section">
        <div class="form-section-title"><i class="pi pi-box"></i> Hàng hoá & Cước</div>
        <div class="form-group">
          <label class="form-label">Hàng hoá <span class="req">*</span></label>
          <InputText v-model="manualForm.hang_hoa" placeholder="VD: 3 Kiện, 2 Bao, 1 Thùng..." fluid />
          <small class="form-hint">Nhập tự do, cách nhau bằng dấu phẩy</small>
        </div>
        <div class="form-group">
          <label class="form-label">Cước (sau thuế) <span class="req">*</span></label>
          <InputNumber v-model="manualForm.gia_cuoc" :min="0" :step="1000" fluid
            suffix="đ" :useGrouping="true" placeholder="0" />
        </div>
      </div>

      <template #footer>
        <div class="manual-dlg-footer">
          <Button label="Huỷ" severity="secondary" text size="small" @click="manualDialogVisible = false" />
          <Button :label="manualEditing !== null ? 'Cập nhật' : 'Thêm dòng'"
            :icon="manualEditing !== null ? 'pi pi-check' : 'pi pi-plus'"
            size="small" @click="saveManualRow" />
        </div>
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: BUSINESSES MANAGER (HDDT)                             -->
    <!-- ===================================================================== -->
    <!-- ══ DIALOG: Quản lý Doanh nghiệp HĐĐT ══ -->
    <Dialog v-model:visible="dnDialogVisible"
      header="Quản lý Doanh nghiệp HĐĐT"
      :modal="true" :style="{ width: '620px' }">

      <!-- Form thêm/sửa -->
      <div class="dn-form">
        <div class="form-grid" style="margin-bottom:0.5rem;">
          <div class="form-group">
            <label class="form-label">Tên doanh nghiệp <span style="color:var(--danger)">*</span></label>
            <InputText v-model="dnForm.ten" placeholder="Tên DN..." fluid />
          </div>
          <div class="form-group">
            <label class="form-label">Mã số thuế</label>
            <InputText v-model="dnForm.ma_so_thue" placeholder="MST..." fluid />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0.5rem;">
          <label class="form-label">Địa chỉ</label>
          <InputText v-model="dnForm.dia_chi" placeholder="Địa chỉ..." fluid />
        </div>
        <div style="display:flex; gap:0.5rem; margin-bottom:0.75rem;">
          <Button :label="dnFormMode === 'add' ? 'Thêm mới' : 'Cập nhật'"
            :icon="dnFormMode === 'add' ? 'pi pi-plus' : 'pi pi-check'"
            size="small" :loading="dnSaving" @click="saveDN" />
          <Button v-if="dnFormMode === 'edit'" label="Huỷ sửa"
            severity="secondary" text size="small" @click="openAddDN" />
        </div>
      </div>

      <!-- Danh sách DN -->
      <DataTable :value="doanhNghieps" size="small" stripedRows style="font-size:0.82rem;">
        <Column field="ten" header="Tên doanh nghiệp" />
        <Column field="ma_so_thue" header="MST" style="width: 100px;" />
        <Column header="TT" style="width: 80px;">
          <template #body="{ data }">
            <Tag :value="data.active ? 'Hoạt động' : 'Tắt'"
              :severity="data.active ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="" style="width: 80px;">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded size="small" severity="info"
              @click="openEditDN(data)" v-tooltip.left="'Sửa'" />
            <Button :icon="data.active ? 'pi pi-ban' : 'pi pi-check-circle'"
              text rounded size="small"
              :severity="data.active ? 'warn' : 'success'"
              @click="toggleDN(data)"
              v-tooltip.left="data.active ? 'Tắt' : 'Kích hoạt'" />
          </template>
        </Column>
      </DataTable>

      <template #footer>
        <Button label="Đóng" severity="secondary" text size="small" @click="dnDialogVisible = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES
   ============================================================================ */
.bk-toolbar {
  padding: 0.65rem 0.85rem;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.toolbar-lbl {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.toolbar-summary {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
  font-size: 0.85rem;
}

.summary-label {
  color: var(--text-muted);
  font-weight: 600;
}

.summary-truoc {
  color: var(--text-secondary);
  font-weight: 700;
}

.summary-sau {
  color: #16a34a;
  font-weight: 700;
  font-size: 0.9rem;
}

.summary-sep {
  color: var(--border);
}

.tab-bar {
  display: flex;
  gap: 0.4rem;
}

.empty-msg {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-msg p {
  font-size: 0.85rem;
}

/* Hàng hoá inline edit — multi-item */
.hh-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hh-edit {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

:deep(.hh-add) {
  font-size: 0.72rem;
  padding: 0.1rem 0.3rem;
  align-self: flex-start;
}

:deep(.hh-num) {
  width: 90px;
}

:deep(.hh-num .p-inputnumber-input) {
  width: 40px;
  font-size: 0.8rem;
  padding: 0.2rem 0.3rem;
  text-align: center;
}

:deep(.hh-num .p-inputnumber-button) {
  width: 22px;
  padding: 0;
}

:deep(.hh-unit) {
  width: 82px;
}

:deep(.hh-unit .p-select-label) {
  font-size: 0.78rem;
  padding: 0.2rem 0.3rem;
}

/* Giá cước */
.cuoc-before {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.cuoc-after {
  font-size: 0.82rem;
  font-weight: 700;
  color: #15803d;
}

/* DN form */
.dn-form {
  background: var(--surface-50, #f8fafc);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.75rem;
}

/* ══ Manual dialog ══ */
.manual-dlg-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.manual-dlg-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-100, #e0e7ff);
  color: var(--primary, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.manual-dlg-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.manual-dlg-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.manual-dlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

/* Sections trong dialog */
.form-section {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.65rem 0.85rem 0.5rem;
  margin-bottom: 0.75rem;
}

.form-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.form-section-green {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.form-section-green .form-section-title {
  color: #15803d;
}

.form-section-gold {
  border-color: #fde68a;
  background: #fffbeb;
}

.form-section-gold .form-section-title {
  color: #92400e;
}

/* Layout 3-cột cho Ngày & Tuyến */
.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.6rem;
}

/* Layout 2-cột — đã bỏ */


/* VP badge inline label */
.vp-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  margin-right: 0.2rem;
  vertical-align: middle;
}
.vp-gui { background: #dcfce7; color: #15803d; }
.vp-nhan { background: #fef9c3; color: #a16207; }


/* Required star */
.req {
  color: var(--danger, #dc2626);
  margin-left: 0.1rem;
}

/* Tuyến badge trong table */
.tuyen-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary, #4f46e5);
  background: var(--primary-50, #eef2ff);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
}

/* Cell 2 dòng (đơn vị / tên) */
.cell-main {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.cell-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 1px;
}

/* ── Hint text trong form ── */
.form-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* ── Autocomplete option template ── */
.ac-option {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.15rem 0;
}

.ac-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.ac-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}


</style>
