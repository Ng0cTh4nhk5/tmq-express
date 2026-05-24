<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store.js';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatDate, formatNumber, toISODate } from '../utils/format';
import {
  CUOC_NHAN_STATUS,
  CUOC_NHAN_STATUS_OPTIONS,
  PHIEU_CHUYEN_CUOC_STATUS_OPTIONS,
  HINH_THUC_OPTIONS,
} from '../constants/cuoc-nhan.js';

const toast = useToast();
const fmt = formatNumber;
const fmtDate = formatDate;

// ─── User context ─────────────────────────────────────────────────
const authStore  = useAuthStore();
const currentUser = computed(() => authStore.user);
const userVpId    = computed(() => currentUser.value?.van_phong?.id || null);
const isAdmin     = computed(() => currentUser.value?.role === 'admin');

// [UX-2] Nhân viên chỉ được xác nhận phiếu nếu đúng VP có thẩm quyền
function canActOnPhieu(phieu, action) {
  if (!phieu) return false;
  if (isAdmin.value) return true;
  if (action === 'chuyen') return phieu.van_phong_nhan_id === userVpId.value;
  if (action === 'nhan')   return phieu.van_phong_gui_id  === userVpId.value;
  return false;
}

// ─── State ────────────────────────────────────────────────────────
const activeView   = ref('bn');
const data         = ref([]);
const pagination   = ref(null);
const tongHop      = ref(null);
const loading      = ref(false);
const page         = ref(1);

const filterState  = ref('');
const filterFrom   = ref(null);
const filterTo     = ref(null);
const search       = ref('');

// Multi-select cho lập phiếu gom lô
const selectedRows = ref([]);

// Dialog lập PhieuChuyenCuoc
const lapPhieuVisible = ref(false);
const selectedForLap  = ref([]);
const vpGuiTarget     = ref(null);
const vpGuiAutoDetected = ref(false); // true = đã auto-detect, show disabled + nút Đổi
const vpGuiOverride   = ref(false);  // true = user muốn chịn lại thủ công
const hinhThucLap     = ref('tien_mat');
const ghiChuLap       = ref('');
const confirmingLap   = ref(false);
const vanPhongs       = ref([]);

// Phiếu list
const phieuData      = ref([]);
const phieuPage      = ref(1);
const phieuPagi      = ref(null);
const filterPhieu    = ref('');
const filterPhieuFrom = ref(null);
const filterPhieuTo   = ref(null);
const loadingP       = ref(false);

// Dialog chi tiết phiếu
const chiTietDialogVisible = ref(false);
const chiTietPhieu         = ref(null);
const loadingChiTiet       = ref(false);

// Dialog xác nhận phiếu
const phieuDialogVisible = ref(false);
const selectedPhieu      = ref(null);
const phieuAction        = ref('');
const hinhThucPhieu      = ref('tien_mat');
const confirmingPhieu    = ref(false);

// Computed: tổng tiền selected
const tongTienSelected = computed(() =>
  selectedRows.value.reduce((s, r) => s + Number(r.gia_cuoc || 0), 0)
);

// [UX-3] Đếm phiếu cần mình xử lý hiện tại (hiển thị badge)
const pendingForMe = computed(() => {
  if (!userVpId.value) return 0;
  return phieuData.value.filter(p =>
    (p.trang_thai === 'cho_chuyen' && p.van_phong_nhan_id === userVpId.value) ||
    (p.trang_thai === 'da_chuyen'  && p.van_phong_gui_id  === userVpId.value)
  ).length;
});

// ─── API BN ───────────────────────────────────────────────────────
async function fetchBN() {
  loading.value = true;
  try {
    const p = { page: page.value, limit: 20 };
    if (filterState.value) p.trang_thai_cuoc_nhan = filterState.value;
    if (filterFrom.value)  p.from = toISODate(filterFrom.value);
    if (filterTo.value)    p.to   = toISODate(filterTo.value);
    if (search.value)      p.search = search.value;
    const res = await api.get('/cuoc-nhan', { params: p });
    data.value       = res.data.data;
    pagination.value = res.data.pagination;
    selectedRows.value = [];
  } catch (err) { handleApiError(err, toast, 'Không thể tải danh sách'); }
  loading.value = false;
}

async function fetchTongHop() {
  try {
    const res = await api.get('/cuoc-nhan/tong-hop');
    tongHop.value = res.data.data;
  } catch { /* silent */ }
}

function onSearch() { page.value = 1; fetchBN(); }

// ─── API Phiếu ────────────────────────────────────────────────────
async function fetchPhieu() {
  loadingP.value = true;
  try {
    const p = { page: phieuPage.value, limit: 20 };
    if (filterPhieu.value)    p.trang_thai = filterPhieu.value;
    if (filterPhieuFrom.value) p.from = toISODate(filterPhieuFrom.value);
    if (filterPhieuTo.value)   p.to   = toISODate(filterPhieuTo.value);
    const res = await api.get('/cuoc-nhan/phieu', { params: p });
    phieuData.value = res.data.data;
    phieuPagi.value = res.data.pagination;
  } catch (err) { handleApiError(err, toast, 'Không thể tải phiếu'); }
  loadingP.value = false;
}

// ─── Xem chi tiết phiếu ───────────────────────────────────────────
async function xemChiTietPhieu(phieu) {
  chiTietPhieu.value         = null;
  chiTietDialogVisible.value = true;
  loadingChiTiet.value       = true;
  try {
    const res = await api.get(`/cuoc-nhan/phieu/${phieu.id}`);
    chiTietPhieu.value = res.data.data;
  } catch (err) { handleApiError(err, toast, 'Lỗi tải chi tiết phiếu'); }
  loadingChiTiet.value = false;
}

// ─── Lập PhieuChuyenCuoc ──────────────────────────────────────────
async function loadVanPhongs() {
  try {
    const res = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
  } catch { vanPhongs.value = []; }
}

// [UX-1] Loại trừ VP của nhân viên (VP Nhận) — không thể chuyển cước về chính mình
const vanPhongsGui = computed(() =>
  vanPhongs.value.filter(v => v.value !== userVpId.value)
);

function openLapPhieu(bns) {
  selectedForLap.value = Array.isArray(bns) ? bns : [bns];
  hinhThucLap.value    = 'tien_mat';
  ghiChuLap.value      = '';

  // [UX-1] Auto-detect VP Gửi từ BN đầu tiên
  const firstBN = selectedForLap.value[0];
  const guiId   = firstBN?.van_phong_gui_id ?? null;
  if (guiId && guiId !== userVpId.value) {
    vpGuiTarget.value      = guiId;
    vpGuiAutoDetected.value = true;
    vpGuiOverride.value    = false;
  } else {
    vpGuiTarget.value      = null;
    vpGuiAutoDetected.value = false;
    vpGuiOverride.value    = false;
  }

  lapPhieuVisible.value = true;
}

function openLapPhieuBatch() {
  const daThu = selectedRows.value.filter(r => r.trang_thai_cuoc_nhan === 'da_thu');
  if (!daThu.length) {
    toast.add({ severity: 'warn', summary: 'Lưu ý', detail: 'Chọn ít nhất 1 biên nhận đã thu cước', life: 3000 });
    return;
  }
  openLapPhieu(daThu);
}

// Chỉ cho phép chọn row có trang_thai_cuoc_nhan === 'da_thu'
function isDataSelectable({ data: row }) {
  return row.trang_thai_cuoc_nhan === 'da_thu';
}

// Chọn tất cả da_thu trong trang hiện tại
function selectAllDaThu() {
  const daThu = data.value.filter(r => r.trang_thai_cuoc_nhan === 'da_thu');
  if (selectedRows.value.length === daThu.length) {
    selectedRows.value = []; // bỏ chọn nếu đã chọn hết
  } else {
    selectedRows.value = daThu;
  }
}

const allDaThuSelected = computed(() => {
  const daThu = data.value.filter(r => r.trang_thai_cuoc_nhan === 'da_thu');
  return daThu.length > 0 && selectedRows.value.length === daThu.length;
});

const daThuCount = computed(() => data.value.filter(r => r.trang_thai_cuoc_nhan === 'da_thu').length);

async function xacNhanLapPhieu() {
  if (!vpGuiTarget.value) {
    toast.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Vui lòng chọn VP Gửi', life: 3000 });
    return;
  }
  confirmingLap.value = true;
  try {
    const res = await api.post('/cuoc-nhan/phieu', {
      van_phong_gui_id: vpGuiTarget.value,
      bien_nhan_ids:    selectedForLap.value.map(b => b.id),
      hinh_thuc:        hinhThucLap.value,
      ghi_chu:          ghiChuLap.value || undefined,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    lapPhieuVisible.value = false;
    selectedForLap.value  = [];
    selectedRows.value    = [];
    await Promise.all([fetchBN(), fetchTongHop()]);
  } catch (err) { handleApiError(err, toast, 'Lỗi lập phiếu'); }
  confirmingLap.value = false;
}

// ─── Xác nhận phiếu ───────────────────────────────────────────────
function openPhieuAction(phieu, action) {
  selectedPhieu.value      = phieu;
  phieuAction.value        = action;
  hinhThucPhieu.value      = 'tien_mat';
  phieuDialogVisible.value = true;
}

async function xacNhanPhieu() {
  confirmingPhieu.value = true;
  const endpoint = phieuAction.value === 'chuyen'
    ? `/cuoc-nhan/phieu/${selectedPhieu.value.id}/xac-nhan-chuyen`
    : `/cuoc-nhan/phieu/${selectedPhieu.value.id}/xac-nhan-nhan`;
  try {
    const body = phieuAction.value === 'nhan' ? { hinh_thuc: hinhThucPhieu.value } : {};
    const res  = await api.patch(endpoint, body);
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    phieuDialogVisible.value = false;
    await fetchPhieu();
  } catch (err) { handleApiError(err, toast, 'Lỗi xác nhận phiếu'); }
  confirmingPhieu.value = false;
}

// [B3] Thu cước thủ công khi auto-thu đã fail (BN kẹt cho_thu sau khi giao hàng)
async function thuCuocThuCong(row) {
  try {
    const res = await api.post(`/cuoc-nhan/${row.id}/thu`, { hinh_thuc: 'tien_mat' });
    toast.add({ severity: 'success', summary: 'Thành công', detail: res.data.message, life: 3000 });
    await Promise.all([fetchBN(), fetchTongHop()]);
  } catch (err) { handleApiError(err, toast, 'Lỗi thu cước'); }
}

onMounted(async () => {
  await Promise.all([fetchBN(), fetchTongHop(), loadVanPhongs(), fetchPhieu()]);
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Cước nhận" icon="pi pi-wallet" />

    <!-- Stats -->
    <div class="cuoc-stats-grid">
      <StatCard icon="pi pi-clock"        label="Chưa thu cước" :value="fmt(tongHop?.cho_thu?.total||0)+'đ'"    :subtitle="(tongHop?.cho_thu?.count||0)+' BN'"     variant="warning" />
      <StatCard icon="pi pi-check"        label="Đã thu"        :value="fmt(tongHop?.da_thu?.total||0)+'đ'"     :subtitle="(tongHop?.da_thu?.count||0)+' BN'"      variant="info" />
      <StatCard icon="pi pi-hourglass"    label="Chờ chuyển"   :value="fmt(tongHop?.cho_chuyen?.total||0)+'đ'" :subtitle="(tongHop?.cho_chuyen?.count||0)+' BN'"  variant="gold" />
      <StatCard icon="pi pi-check-circle" label="Hoàn tất"     :value="fmt(tongHop?.da_nhan?.total||0)+'đ'"    :subtitle="(tongHop?.da_nhan?.count||0)+' BN'"     variant="success" />
    </div>

    <!-- Info banner -->
    <div class="info-banner">
      <i class="pi pi-info-circle"></i>
      <span>Cước nhận được <b>tự động thu</b> khi nhân viên xác nhận giao hàng thành công (trạng thái "Khách đã nhận").</span>
    </div>

    <!-- View switcher -->
    <div class="card" style="margin-bottom:.75rem;">
      <div class="filter-section">
        <Button label="Biên nhận cước" icon="pi pi-list"
          :outlined="activeView!=='bn'" @click="activeView='bn'; fetchBN()" />
        <!-- [UX-3] Badge đếm phiếu cần mình xử lý -->
        <div style="position:relative;display:inline-block;margin-left:.4rem;">
          <Button label="Phiếu chuyển cước" icon="pi pi-send"
            :outlined="activeView!=='phieu'"
            @click="activeView='phieu'; fetchPhieu()" />
          <span v-if="pendingForMe > 0" class="phieu-badge">{{ pendingForMe }}</span>
        </div>
      </div>
    </div>

    <!-- BN View -->
    <div v-if="activeView==='bn'" class="card">
      <!-- Filters -->
      <div class="filter-section" style="margin-bottom:.75rem;">
        <label>Trạng thái</label>
        <Select v-model="filterState" :options="CUOC_NHAN_STATUS_OPTIONS" optionLabel="label" optionValue="value" style="width:160px;" @change="onSearch" />
        <label class="filter-spacer">Từ ngày</label>
        <DatePicker v-model="filterFrom" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <label class="filter-spacer">Đến ngày</label>
        <DatePicker v-model="filterTo" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <InputText v-model="search" placeholder="Mã BN, tên..." style="width:180px;" @keyup.enter="onSearch" />
        <Button label="Xem" icon="pi pi-search" @click="onSearch" :loading="loading" style="margin-left:auto;" />
        <Button label="Xóa lọc" icon="pi pi-times" severity="secondary" text
          @click="filterState='';filterFrom=null;filterTo=null;search='';onSearch()" />
      </div>
      <!-- Quick filter chip: Cần xử lý -->
      <div style="margin-bottom:.5rem;">
        <button
          :class="['quick-chip', filterState==='cho_thu' ? 'quick-chip--active' : '']"
          @click="filterState='cho_thu';onSearch()"
        >⚠️ Cần xử lý (chưa thu)</button>
      </div>

      <!-- Batch action bar -->
      <div v-if="selectedRows.length > 0 || daThuCount > 0" class="batch-bar" :class="selectedRows.length > 0 ? 'batch-bar--active' : 'batch-bar--hint'">
        <span class="batch-info">
          <template v-if="selectedRows.length > 0">
            <i class="pi pi-check-square"></i>
            Đã chọn <b>{{ selectedRows.length }}</b> biên nhận
            — Tổng: <b class="cuoc-amount">{{ fmt(tongTienSelected) }}đ</b>
          </template>
          <template v-else>
            <i class="pi pi-info-circle"></i>
            Có <b>{{ daThuCount }}</b> BN đã thu cước có thể lập phiếu — tick ☑ để chọn
          </template>
        </span>
        <Button
          v-if="daThuCount > 0"
          :label="allDaThuSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${daThuCount})`"
          :icon="allDaThuSelected ? 'pi pi-times' : 'pi pi-check-square'"
          severity="secondary" text size="small"
          @click="selectAllDaThu"
        />
        <Button
          v-if="selectedRows.length > 0"
          label="Lập phiếu chuyển (gom lô)"
          icon="pi pi-send"
          severity="help"
          size="small"
          @click="openLapPhieuBatch"
        />
        <Button v-if="selectedRows.length > 0" label="Bỏ chọn" icon="pi pi-times" severity="secondary" text size="small" @click="selectedRows=[]" />
      </div>

      <DataTable
        v-model:selection="selectedRows"
        :value="data"
        :loading="loading"
        stripedRows size="small"
        dataKey="id"
        :isDataSelectable="isDataSelectable"
        :rowClass="row => row.trang_thai_cuoc_nhan !== 'da_thu' ? 'row-not-selectable' : ''"
      >
        <template #empty>
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <i class="pi pi-wallet" style="font-size:1.5rem;opacity:.3;"></i>
            <p style="font-size:.85rem;margin-top:.5rem;">Không có biên nhận cước nhận nào</p>
          </div>
        </template>

        <!-- Checkbox col: PrimeVue nàtive selection -->
        <Column selectionMode="multiple" style="width:44px;" :exportable="false" />

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
        <Column header="Cước" style="width:110px;text-align:right;">
          <template #body="{ data: row }"><span class="cuoc-amount">{{ fmt(row.gia_cuoc) }}đ</span></template>
        </Column>
        <Column header="Trạng thái" style="width:160px;text-align:center;">
          <template #body="{ data: row }">
            <!-- [B3] Phân biệt 2 sub-state của cho_thu:
                 - đã giao hàng nhưng chưa thu cước (auto-thu fail) → warn
                 - chưa giao hàng nên chưa thu cước → secondary -->
            <Tag v-if="row.trang_thai_cuoc_nhan === 'cho_thu' && row.trang_thai === 'khach_da_nhan'"
              value="Cần thu thủ công" severity="warn" />
            <Tag v-else-if="row.trang_thai_cuoc_nhan === 'cho_thu'"
              value="Chưa thu cước" severity="secondary" />
            <Tag v-else-if="row.trang_thai_cuoc_nhan && CUOC_NHAN_STATUS[row.trang_thai_cuoc_nhan]"
              :value="CUOC_NHAN_STATUS[row.trang_thai_cuoc_nhan].label"
              :severity="CUOC_NHAN_STATUS[row.trang_thai_cuoc_nhan].severity" />
            <span v-else class="text-muted" style="font-size:.75rem;">—</span>
          </template>
        </Column>
        <Column header="Thao tác" style="width:220px;">
          <template #body="{ data: row }">
            <div style="display:flex;gap:.3rem;flex-wrap:wrap;">
              <template v-if="row.trang_thai_cuoc_nhan === 'cho_thu'">
                <!-- [B3] Đã giao hàng nhưng cước chưa thu (auto-thu fail) → hiện nút thu -->
                <template v-if="row.trang_thai === 'khach_da_nhan'">
                  <Button label="Thu cước" icon="pi pi-dollar" size="small" severity="warn"
                    @click="thuCuocThuCong(row)" />
                </template>
                <!-- Chưa giao hàng → chờ -->
                <template v-else>
                  <span class="waiting-label"><i class="pi pi-clock"></i> Chưa thu cước</span>
                </template>
              </template>
              <template v-else-if="row.trang_thai_cuoc_nhan === 'da_thu'">
                <Button label="Lập phiếu" icon="pi pi-send" size="small" severity="help" @click="openLapPhieu(row)" />
              </template>
              <template v-else-if="row.trang_thai_cuoc_nhan === 'cho_chuyen'">
                <span style="display:flex;flex-direction:column;gap:.2rem;">
                  <Tag value="Trong phiếu" severity="help" />
                  <button
                    v-if="row.phieu_chuyen_cuoc_id"
                    class="phieu-link-btn"
                    @click="xemChiTietPhieu({ id: row.phieu_chuyen_cuoc_id })"
                  ><i class="pi pi-external-link"></i> Xem phiếu</button>
                </span>
              </template>
              <template v-else-if="row.trang_thai_cuoc_nhan === 'da_nhan'">
                <span style="display:flex;flex-direction:column;gap:.2rem;">
                  <Tag value="Hoàn tất" severity="success" />
                </span>
              </template>
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Pagination -->
      <div v-if="pagination"
        style="display:flex;justify-content:space-between;align-items:center;margin-top:.75rem;font-size:.82rem;color:#64748b;">
        <span>Tổng {{ pagination.total }} biên nhận</span>
        <div style="display:flex;gap:.5rem;">
          <Button icon="pi pi-chevron-left" text rounded size="small" :disabled="page<=1" @click="page--;fetchBN()" />
          <span style="line-height:2rem;">Trang {{ page }}/{{ Math.max(1, pagination.totalPages) }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="page>=pagination.totalPages" @click="page++;fetchBN()" />
        </div>
      </div>
    </div>

    <!-- Phiếu View -->
    <div v-if="activeView==='phieu'" class="card">
      <div class="filter-section" style="margin-bottom:.75rem;">
        <label>Trạng thái</label>
        <Select v-model="filterPhieu" :options="PHIEU_CHUYEN_CUOC_STATUS_OPTIONS" optionLabel="label" optionValue="value" style="width:160px;" @change="phieuPage=1;fetchPhieu()" />
        <label class="filter-spacer">Từ ngày</label>
        <DatePicker v-model="filterPhieuFrom" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <label class="filter-spacer">Đến ngày</label>
        <DatePicker v-model="filterPhieuTo" dateFormat="dd/mm/yy" showIcon style="width:140px;" />
        <Button label="Xem" icon="pi pi-search" @click="phieuPage=1;fetchPhieu()" :loading="loadingP" style="margin-left:auto;" />
        <Button label="Xóa lọc" icon="pi pi-times" severity="secondary" text
          @click="filterPhieu='';filterPhieuFrom=null;filterPhieuTo=null;phieuPage=1;fetchPhieu()" />
      </div>

      <DataTable :value="phieuData" :loading="loadingP" stripedRows size="small">
        <template #empty>
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <p style="font-size:.85rem;">Không có phiếu chuyển cước nào</p>
          </div>
        </template>
        <Column header="Mã phiếu" style="width:145px;font-weight:600;">
          <template #body="{ data: row }">{{ row.ma_phieu }}</template>
        </Column>
        <Column header="Ngày lập" style="width:90px;">
          <template #body="{ data: row }">{{ fmtDate(row.ngay_lap) }}</template>
        </Column>
        <Column header="VP Nhận (lập)">
          <template #body="{ data: row }">
            <div style="font-size:.82rem;">{{ row.van_phong_nhan?.ten||'—' }}</div>
            <div v-if="row.nhan_vien_lap" style="font-size:.75rem;color:var(--text-muted);">{{ row.nhan_vien_lap.ten }}</div>
          </template>
        </Column>
        <Column header="VP Gửi (nhận)">
          <template #body="{ data: row }">{{ row.van_phong_gui?.ten||'—' }}</template>
        </Column>
        <Column header="Tổng tiền" style="width:115px;text-align:right;">
          <template #body="{ data: row }"><span class="cuoc-amount">{{ fmt(row.so_tien_tong) }}đ</span></template>
        </Column>
        <Column header="Số BN" style="width:60px;text-align:center;">
          <template #body="{ data: row }">{{ row._count?.chi_tiet||0 }}</template>
        </Column>
        <Column header="Tiến trình" style="width:130px;text-align:center;">
          <template #body="{ data: row }">
            <div style="display:flex;flex-direction:column;align-items:center;gap:.2rem;">
              <Tag
                :value="row.trang_thai==='cho_chuyen'?'Chờ chuyển':row.trang_thai==='da_chuyen'?'Đã chuyển':'Hoàn tất'"
                :severity="row.trang_thai==='cho_chuyen'?'warn':row.trang_thai==='da_chuyen'?'info':'success'" />
              <span v-if="row.ngay_chuyen" style="font-size:.72rem;color:var(--text-muted);">Gửi: {{ fmtDate(row.ngay_chuyen) }}</span>
              <span v-if="row.ngay_nhan" style="font-size:.72rem;color:var(--text-muted);">Nhận: {{ fmtDate(row.ngay_nhan) }}</span>
              <span v-if="canActOnPhieu(row, 'chuyen') && row.trang_thai === 'cho_chuyen'"
                class="my-turn-label"><i class="pi pi-user"></i> Bạn gửi</span>
              <span v-else-if="canActOnPhieu(row, 'nhan') && row.trang_thai === 'da_chuyen'"
                class="my-turn-label"><i class="pi pi-user"></i> Bạn nhận</span>
            </div>
          </template>
        </Column>
        <Column header="Thao tác" style="width:220px;">
          <template #body="{ data: row }">
            <div style="display:flex;gap:.3rem;align-items:center;flex-wrap:wrap;">
              <!-- Nút xem chi tiết luôn hiện -->
              <Button icon="pi pi-eye" label="Chi tiết" size="small" severity="secondary" text
                @click="xemChiTietPhieu(row)" />
              <!-- [UX-2] Chỉ VP Nhận (lập phiếu) mới gửi tiền đi -->
              <Button
                v-if="row.trang_thai === 'cho_chuyen' && canActOnPhieu(row, 'chuyen')"
                label="Xác nhận gửi" size="small" severity="warn"
                @click="openPhieuAction(row, 'chuyen')" />
              <!-- [UX-2] Chỉ VP Gửi (nhận tiền về) mới xác nhận nhận -->
              <Button
                v-if="row.trang_thai === 'da_chuyen' && canActOnPhieu(row, 'nhan')"
                label="Xác nhận nhận" size="small" severity="success"
                @click="openPhieuAction(row, 'nhan')" />
              <!-- VP không có quyền: hiển thị chờ -->
              <span
                v-if="(row.trang_thai === 'cho_chuyen' && !canActOnPhieu(row, 'chuyen')) ||
                      (row.trang_thai === 'da_chuyen'  && !canActOnPhieu(row, 'nhan'))"
                class="waiting-label"
              ><i class="pi pi-lock"></i> Chờ VP khác</span>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog lập phiếu chuyển -->
    <Dialog v-model:visible="lapPhieuVisible" header="Lập phiếu chuyển cước" :style="{width:'600px'}" modal>
      <div style="margin-bottom:1rem;">
        <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
            <thead>
              <tr style="background:var(--bg-sunken);">
                <th style="padding:.35rem .6rem;text-align:left;font-weight:600;">Mã BN</th>
                <th style="padding:.35rem .6rem;text-align:left;font-weight:600;">Tuyến</th>
                <th style="padding:.35rem .6rem;text-align:left;font-weight:600;">Hàng hóa</th>
                <th style="padding:.35rem .6rem;text-align:left;font-weight:600;">Người nhận</th>
                <th style="padding:.35rem .6rem;text-align:right;font-weight:600;">Cước</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bn in selectedForLap" :key="bn.id" style="border-top:1px solid var(--border-light);">
                <td style="padding:.3rem .6rem;font-weight:600;font-family:var(--font-mono);white-space:nowrap;">{{ bn.ma_so }}</td>
                <td style="padding:.3rem .6rem;white-space:nowrap;font-size:.78rem;font-weight:600;">
                  {{ bn.van_phong_gui?.ma_vp||'?' }} → {{ bn.van_phong_nhan?.ma_vp||'?' }}
                </td>
                <td style="padding:.3rem .6rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);">
                  {{ bn.ten_hang_hoa ? bn.ten_hang_hoa.slice(0,28)+(bn.ten_hang_hoa.length>28?'…':'') : '—' }}
                </td>
                <td style="padding:.3rem .6rem;color:var(--text-secondary);">{{ bn.don_vi_nhan||bn.nguoi_nhan||'—' }}</td>
                <td style="padding:.3rem .6rem;text-align:right;"><span class="cuoc-amount">{{ fmt(bn.gia_cuoc) }}đ</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-sunken);border-top:2px solid var(--border);font-weight:700;">
                <td colspan="4" style="padding:.35rem .6rem;">Tổng cộng ({{ selectedForLap.length }} BN)</td>
                <td style="padding:.35rem .6rem;text-align:right;"><span class="cuoc-amount">{{ fmt(selectedForLap.reduce((s,b)=>s+Number(b.gia_cuoc||0),0)) }}đ</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem;">
        <div>
          <label class="bk-label">VP Gửi (nhận tiền cước về)</label>
          <div v-if="vpGuiAutoDetected && !vpGuiOverride" style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem;">
            <Select :modelValue="vpGuiTarget" :options="vanPhongsGui" optionLabel="label" optionValue="value"
              style="flex:1;" disabled />
            <Button label="Đổi" icon="pi pi-pencil" size="small" severity="secondary" text
              @click="vpGuiOverride=true;vpGuiTarget=null" />
          </div>
          <Select v-else v-model="vpGuiTarget" :options="vanPhongsGui" optionLabel="label" optionValue="value"
            style="width:100%;margin-top:.25rem;" placeholder="Chọn văn phòng gửi..." />
          <small v-if="vpGuiAutoDetected && !vpGuiOverride" style="color:#16a34a;font-size:.75rem;margin-top:.2rem;display:flex;align-items:center;gap:.3rem;">
            <i class="pi pi-lock"></i> Tự động theo biên nhận — VP Gửi nhận tiền cước về
          </small>
        </div>
        <div>
          <label class="bk-label">Hình thức</label>
          <Select v-model="hinhThucLap" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value" style="width:100%;margin-top:.25rem;" />
        </div>
        <div>
          <label class="bk-label">Ghi chú</label>
          <InputText v-model="ghiChuLap" style="width:100%;margin-top:.25rem;" placeholder="Ghi chú thêm (không bắt buộc)" />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" @click="lapPhieuVisible=false" />
        <Button label="Lập phiếu chuyển" severity="help" :loading="confirmingLap" @click="xacNhanLapPhieu" />
      </template>
    </Dialog>

    <!-- Dialog xác nhận phiếu -->
    <Dialog v-model:visible="phieuDialogVisible"
      :header="phieuAction==='chuyen' ? 'Xác nhận đã gửi tiền đi' : 'Xác nhận đã nhận tiền'"
      :style="{width:'420px'}" modal>
      <div v-if="selectedPhieu" style="margin-bottom:1rem;font-size:.85rem;">
        <p>Phiếu: <b>{{ selectedPhieu.ma_phieu }}</b></p>
        <p>Số tiền: <b class="cuoc-amount">{{ fmt(selectedPhieu.so_tien_tong) }}đ</b></p>
        <p v-if="phieuAction==='chuyen'">
          VP <b>{{ selectedPhieu.van_phong_nhan?.ten }}</b> xác nhận đã gửi tiền cước về VP <b>{{ selectedPhieu.van_phong_gui?.ten }}</b>
        </p>
        <p v-else>
          VP <b>{{ selectedPhieu.van_phong_gui?.ten }}</b> xác nhận đã nhận tiền cước từ VP <b>{{ selectedPhieu.van_phong_nhan?.ten }}</b>
        </p>
      </div>
      <div v-if="phieuAction==='nhan'">
        <label class="bk-label">Hình thức nhận</label>
        <Select v-model="hinhThucPhieu" :options="HINH_THUC_OPTIONS" optionLabel="label" optionValue="value" style="width:100%;margin-top:.25rem;" />
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" @click="phieuDialogVisible=false" />
        <Button :label="phieuAction==='chuyen' ? 'Xác nhận đã gửi' : 'Xác nhận đã nhận'"
          :severity="phieuAction==='chuyen' ? 'warn' : 'success'"
          :loading="confirmingPhieu" @click="xacNhanPhieu" />
      </template>
    </Dialog>

    <!-- Dialog chi tiết phiếu chuyển cước -->
    <Dialog v-model:visible="chiTietDialogVisible" header="Chi tiết phiếu chuyển cước" :style="{width:'720px'}" modal :maximizable="true">
      <div v-if="loadingChiTiet" style="text-align:center;padding:2rem;">
        <i class="pi pi-spin pi-spinner" style="font-size:1.5rem;color:var(--text-muted);"></i>
        <p style="margin-top:.5rem;font-size:.85rem;color:var(--text-muted);">Đang tải...</p>
      </div>
      <div v-else-if="chiTietPhieu">
        <!-- Info header -->
        <div class="phieu-detail-header">
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Mã phiếu</span>
            <span style="font-weight:700;font-family:var(--font-mono);">{{ chiTietPhieu.ma_phieu }}</span>
            <Tag
              :value="chiTietPhieu.trang_thai==='cho_chuyen'?'Chờ chuyển':chiTietPhieu.trang_thai==='da_chuyen'?'Đã chuyển':'Hoàn tất'"
              :severity="chiTietPhieu.trang_thai==='cho_chuyen'?'warn':chiTietPhieu.trang_thai==='da_chuyen'?'info':'success'"
              style="margin-left:.5rem;" />
          </div>
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Tuyến</span>
            <span class="phieu-route-pill">{{ chiTietPhieu.van_phong_nhan?.ma_vp }}</span>
            <i class="pi pi-arrow-right" style="font-size:.8rem;color:var(--text-muted);margin:0 .3rem;"></i>
            <span class="phieu-route-pill phieu-route-pill--dest">{{ chiTietPhieu.van_phong_gui?.ma_vp }}</span>
            <span style="font-size:.78rem;color:var(--text-muted);margin-left:.5rem;">{{ chiTietPhieu.van_phong_nhan?.ten }} → {{ chiTietPhieu.van_phong_gui?.ten }}</span>
          </div>
          <div class="phieu-detail-row">
            <span class="phieu-detail-label">Tổng tiền</span>
            <span class="cuoc-amount" style="font-size:1rem;">{{ fmt(chiTietPhieu.so_tien_tong) }}đ</span>
            <span style="font-size:.78rem;color:var(--text-muted);margin-left:.75rem;">{{ chiTietPhieu.hinh_thuc === 'tien_mat' ? '💵 Tiền mặt' : '🏦 Chuyển khoản' }}</span>
          </div>
          <div v-if="chiTietPhieu.ghi_chu" class="phieu-detail-row">
            <span class="phieu-detail-label">Ghi chú</span>
            <span style="font-size:.82rem;font-style:italic;">{{ chiTietPhieu.ghi_chu }}</span>
          </div>
        </div>

        <!-- Timeline -->
        <div class="phieu-timeline">
          <div class="tl-step tl-done">
            <div class="tl-dot"><i class="pi pi-file-edit"></i></div>
            <div class="tl-content">
              <div class="tl-title">Lập phiếu</div>
              <div class="tl-sub">{{ fmtDate(chiTietPhieu.ngay_lap) }} · {{ chiTietPhieu.nhan_vien_lap?.ten||'—' }}</div>
            </div>
          </div>
          <div class="tl-line"></div>
          <div :class="['tl-step', chiTietPhieu.trang_thai !== 'cho_chuyen' ? 'tl-done' : 'tl-pending']">
            <div class="tl-dot"><i class="pi pi-send"></i></div>
            <div class="tl-content">
              <div class="tl-title">Đã gửi tiền</div>
              <div class="tl-sub">{{ chiTietPhieu.ngay_chuyen ? fmtDate(chiTietPhieu.ngay_chuyen) : 'Chưa gửi' }}</div>
            </div>
          </div>
          <div class="tl-line"></div>
          <div :class="['tl-step', chiTietPhieu.trang_thai === 'da_nhan' ? 'tl-done' : 'tl-pending']">
            <div class="tl-dot"><i class="pi pi-check-circle"></i></div>
            <div class="tl-content">
              <div class="tl-title">Đã nhận tiền</div>
              <div class="tl-sub">{{ chiTietPhieu.ngay_nhan ? fmtDate(chiTietPhieu.ngay_nhan) + ' · ' + (chiTietPhieu.nhan_vien_nhan?.ten||'') : 'Chưa nhận' }}</div>
            </div>
          </div>
        </div>

        <!-- Bảng BN trong phiếu -->
        <div style="margin-top:1rem;">
          <div style="font-size:.82rem;font-weight:600;color:var(--text-secondary);margin-bottom:.4rem;">
            <i class="pi pi-list" style="margin-right:.3rem;"></i>
            Danh sách biên nhận ({{ chiTietPhieu.chi_tiet?.length||0 }} BN)
          </div>
          <div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
              <thead>
                <tr style="background:var(--bg-sunken);">
                  <th style="padding:.4rem .6rem;text-align:left;font-weight:600;">Mã BN</th>
                  <th style="padding:.4rem .6rem;text-align:left;font-weight:600;">Tuyến</th>
                  <th style="padding:.4rem .6rem;text-align:left;font-weight:600;">Hàng hóa</th>
                  <th style="padding:.4rem .6rem;text-align:left;font-weight:600;">Người nhận</th>
                  <th style="padding:.4rem .6rem;text-align:right;font-weight:600;">Cước</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ct in chiTietPhieu.chi_tiet" :key="ct.id"
                  style="border-top:1px solid var(--border-light);">
                  <td style="padding:.4rem .6rem;font-weight:600;font-family:var(--font-mono);white-space:nowrap;">{{ ct.bien_nhan?.ma_so||'—' }}</td>
                  <td style="padding:.4rem .6rem;white-space:nowrap;">
                    <span style="font-size:.78rem;font-weight:600;">
                      {{ ct.bien_nhan?.van_phong_gui_id ? chiTietPhieu.van_phong_nhan?.ma_vp : '—' }}
                      → {{ chiTietPhieu.van_phong_nhan?.ma_vp }}
                    </span>
                  </td>
                  <td style="padding:.4rem .6rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ ct.bien_nhan?.ten_hang_hoa||'—' }}</td>
                  <td style="padding:.4rem .6rem;">{{ ct.bien_nhan?.don_vi_nhan||ct.bien_nhan?.nguoi_nhan||'—' }}</td>
                  <td style="padding:.4rem .6rem;text-align:right;"><span class="cuoc-amount">{{ fmt(ct.so_tien) }}đ</span></td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background:var(--bg-sunken);border-top:2px solid var(--border);font-weight:700;">
                  <td colspan="4" style="padding:.4rem .6rem;">Tổng cộng</td>
                  <td style="padding:.4rem .6rem;text-align:right;"><span class="cuoc-amount">{{ fmt(chiTietPhieu.so_tien_tong) }}đ</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Phiếu tài chính -->
        <div v-if="chiTietPhieu.phieu_chi || chiTietPhieu.phieu_thu" class="phieu-finance-ref">
          <div style="font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.4rem;">Phiếu tài chính liên quan</div>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
            <span v-if="chiTietPhieu.phieu_chi" class="finance-tag finance-tag--chi">
              <i class="pi pi-arrow-up-right"></i>
              Phiếu chi: {{ chiTietPhieu.phieu_chi.ma_phieu }} · {{ fmt(chiTietPhieu.phieu_chi.so_tien) }}đ
            </span>
            <span v-if="chiTietPhieu.phieu_thu" class="finance-tag finance-tag--thu">
              <i class="pi pi-arrow-down-left"></i>
              Phiếu thu: {{ chiTietPhieu.phieu_thu.ma_phieu }} · {{ fmt(chiTietPhieu.phieu_thu.so_tien) }}đ
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Đóng" severity="secondary" @click="chiTietDialogVisible=false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.cuoc-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .75rem;
  margin-bottom: 1rem;
}
@media (max-width: 900px) { .cuoc-stats-grid { grid-template-columns: repeat(2, 1fr); } }

.cuoc-amount {
  font-weight: 700;
  color: #b45309;
}

.info-banner {
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
.info-banner .pi { font-size: 1rem; flex-shrink: 0; }

.batch-bar {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .6rem .75rem;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  margin-bottom: .5rem;
  transition: background .2s, border-color .2s;
}
.batch-bar--hint {
  background: #eff6ff;
  border-color: #93c5fd;
}
.batch-bar--hint .batch-info { color: #1e40af; }
.batch-bar--active {
  background: #f0fdf4;
  border-color: #86efac;
}
.batch-info {
  font-size: .83rem;
  color: #166534;
  flex: 1;
}
.batch-info .pi { margin-right: .3rem; }

/* Row không thể chọn — ẩn checkbox area */
:deep(.row-not-selectable .p-checkbox) {
  opacity: 0;
  pointer-events: none;
}
:deep(.row-not-selectable td:first-child) {
  pointer-events: none;
}

.waiting-label {
  font-size: .78rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: .3rem;
}
.waiting-label .pi { font-size: .75rem; }

/* [UX-3] Badge đếm phiếu cần xử lý trên tab */
.phieu-badge {
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

/* [UX-3] Mini-label "Bạn gửi / Bạn nhận" trong cột trạng thái phiếu */
.my-turn-label {
  font-size: .7rem;
  color: #7c3aed;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: .2rem;
}
.my-turn-label .pi { font-size: .68rem; }

/* Quick filter chip */
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  padding: .25rem .7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-base);
  font-size: .78rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all .15s;
  font-family: inherit;
}
.quick-chip:hover { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.quick-chip--active { border-color: #f59e0b; background: #fef3c7; color: #92400e; font-weight: 600; }

/* Phiếu link inline button */
.phieu-link-btn {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-size: .72rem;
  color: #7c3aed;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.phieu-link-btn:hover { color: #5b21b6; }

/* ── Dialog chi tiết phiếu ── */
.phieu-detail-header {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: .75rem 1rem;
  margin-bottom: .75rem;
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
.phieu-route-pill {
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 999px;
  padding: .15rem .55rem;
  font-size: .75rem;
  font-weight: 700;
  font-family: var(--font-mono);
}
.phieu-route-pill--dest {
  background: #d1fae5;
  color: #065f46;
}

/* Timeline */
.phieu-timeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: .5rem 0;
  margin-bottom: .25rem;
}
.tl-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.tl-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .85rem;
  flex-shrink: 0;
  margin-bottom: .3rem;
}
.tl-done .tl-dot {
  background: #d1fae5;
  color: #065f46;
  border: 2px solid #10b981;
}
.tl-pending .tl-dot {
  background: var(--bg-sunken);
  color: var(--text-light);
  border: 2px solid var(--border);
}
.tl-content {
  text-align: center;
}
.tl-title {
  font-size: .78rem;
  font-weight: 600;
  color: var(--text);
}
.tl-sub {
  font-size: .72rem;
  color: var(--text-muted);
  margin-top: .1rem;
}
.tl-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin-top: 15px;
  max-width: 60px;
}

/* Finance refs */
.phieu-finance-ref {
  margin-top: .75rem;
  padding: .6rem .75rem;
  background: var(--bg-sunken);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.finance-tag {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  font-size: .78rem;
  font-weight: 600;
  padding: .2rem .6rem;
  border-radius: 999px;
}
.finance-tag--chi {
  background: #fef3c7;
  color: #92400e;
}
.finance-tag--thu {
  background: #d1fae5;
  color: #065f46;
}
</style>
