<script setup>
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

const toast = useToast();

// ── Đơn vị hàng hoá ──────────────────────────────────────────
const UNITS = ['Kiện', 'Bao', 'Thùng', 'Cuộn', 'Pallet', 'Cái', 'Bộ', 'Khác'];

// ── State chính ───────────────────────────────────────────────
const tab = ref('pending');
const selectedDate = ref(new Date());
const bienSoXe = ref('');
const loading = ref(false);
const exporting = ref(false);

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

// ── Case B: Dòng tự kê ───────────────────────────────────────
const manualRows = ref([]);
const manualDialogVisible = ref(false);
const manualEditing = ref(null); // null = thêm mới, { idx, data } = sửa
const manualForm = ref(createEmptyManual());

function createEmptyManual() {
  return {
    nguoi_gui: '',
    dia_chi_gui: '',
    tuyen: '',
    hang_hoa: '',
    gia_cuoc: 0,
    ngay: selectedDate.value || new Date(),
  };
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
  if (!manualForm.value.nguoi_gui?.trim()) {
    toast.add({ severity: 'warn', summary: 'Thiếu người gửi', life: 2000 });
    return;
  }
  if (!manualForm.value.gia_cuoc || manualForm.value.gia_cuoc <= 0) {
    toast.add({ severity: 'warn', summary: 'Cần nhập giá cước', life: 2000 });
    return;
  }
  if (manualEditing.value !== null) {
    manualRows.value[manualEditing.value.idx] = { ...manualForm.value };
  } else {
    manualRows.value.push({ ...manualForm.value });
  }
  manualDialogVisible.value = false;
}

function removeManualRow(idx) {
  manualRows.value.splice(idx, 1);
}

// ── Autocomplete doanh nghiệp (Case B) ───────────────────────
const dnSuggestions = ref([]);

async function searchDN(event) {
  if (!event.query || event.query.length < 1) { dnSuggestions.value = []; return; }
  try {
    const res = await api.get('/doanh-nghiep-hddt', { params: { search: event.query, active: true } });
    dnSuggestions.value = res.data.data;
  } catch { dnSuggestions.value = []; }
}

function onSelectDN(event) {
  const dn = event.value;
  // AutoComplete v-model gán object → dùng nextTick để gán lại string
  nextTick(() => {
    manualForm.value.nguoi_gui = dn.ten || '';
  });
  manualForm.value.dia_chi_gui = dn.dia_chi || '';
}

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

// ── Lấy BN chờ HĐĐT theo ngày ─────────────────────────────────
async function loadPending() {
  loading.value = true;
  selectedBNs.value = [];
  try {
    const ngay = fmtISO(selectedDate.value);
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
      items.push({
        bien_nhan_id: null,
        ngay: fmtISO(row.ngay || selectedDate.value),
        tuyen: row.tuyen || '',
        nguoi_gui: row.nguoi_gui || '',
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

// ── Helpers ───────────────────────────────────────────────────
function fmtISO(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('vi-VN');
}

function fmt(n) { return Number(n).toLocaleString('vi-VN'); }
function fmtTruocThue(n) { return Math.round(Number(n) / 1.08).toLocaleString('vi-VN'); }

function downloadBase64File(base64, filename) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}

onMounted(() => {
  loadPending();
  fetchHistory();
  loadDN();
});
</script>

<template>
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
        <Column field="ma_so" header="Mã BN" style="width: 110px; font-weight:700; font-family: monospace;" />
        <Column header="Ngày" style="width: 78px;">
          <template #body="{ data }">{{ fmtDate(data.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="Tuyến" style="width: 74px;">
          <template #body="{ data }">{{ data.van_phong_gui?.ma_vp }}→{{ data.van_phong_nhan?.ma_vp }}</template>
        </Column>
        <Column field="don_vi_gui" header="Người gửi" style="min-width: 120px;">
          <template #body="{ data }">
            <span class="text-truncate" style="max-width:130px; display:inline-block;">
              {{ data.don_vi_gui || data.nguoi_gui || '—' }}
            </span>
          </template>
        </Column>
        <Column header="Địa chỉ gửi" style="min-width: 110px;">
          <template #body="{ data }">
            <span class="text-truncate" style="max-width:120px; display:inline-block;">
              {{ data.dia_chi_gui || '—' }}
            </span>
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
        <Column field="tuyen" header="Tuyến" style="width: 74px;" />
        <Column field="nguoi_gui" header="Người gửi" />
        <Column field="dia_chi_gui" header="Địa chỉ gửi" />
        <Column field="hang_hoa" header="Hàng hoá" style="width: 130px;" />
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

    <!-- ══ DIALOG: Thêm/Sửa dòng tự kê ══ -->
    <Dialog v-model:visible="manualDialogVisible"
      :header="manualEditing !== null ? 'Sửa dòng tự kê' : 'Thêm dòng tự kê'"
      :modal="true" :style="{ width: '480px' }">

      <div class="form-group">
        <label class="form-label">Người gửi <span style="color:var(--danger)">*</span></label>
        <AutoComplete v-model="manualForm.nguoi_gui"
          :suggestions="dnSuggestions" optionLabel="ten"
          @complete="searchDN" @item-select="onSelectDN"
          placeholder="Gõ tên hoặc chọn từ danh sách DN..." fluid />
      </div>
      <div class="form-group">
        <label class="form-label">Địa chỉ gửi</label>
        <InputText v-model="manualForm.dia_chi_gui" placeholder="Địa chỉ người gửi..." fluid />
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Tuyến</label>
          <InputText v-model="manualForm.tuyen" placeholder="VD: SG→CT" fluid />
        </div>
        <div class="form-group">
          <label class="form-label">Ngày</label>
          <DatePicker v-model="manualForm.ngay" dateFormat="dd/mm/yy" showIcon fluid />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Hàng hoá</label>
        <InputText v-model="manualForm.hang_hoa" placeholder="VD: 3 Thùng" fluid />
      </div>
      <div class="form-group">
        <label class="form-label">Cước (sau thuế, đơn vị: đồng) <span style="color:var(--danger)">*</span></label>
        <InputNumber v-model="manualForm.gia_cuoc" :min="0" :step="1000" fluid
          suffix="đ" :useGrouping="true" placeholder="0" />
      </div>

      <template #footer>
        <Button label="Huỷ" severity="secondary" text size="small" @click="manualDialogVisible = false" />
        <Button label="Lưu dòng" icon="pi pi-check" size="small" @click="saveManualRow" />
      </template>
    </Dialog>

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
</style>
