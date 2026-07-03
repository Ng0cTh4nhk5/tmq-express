<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import { useChoVanChuyenStore } from '../stores/cho-van-chuyen.store';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatCurrency, formatDate } from '../utils/format';

const toast = useToast();
const auth = useAuthStore();
const choVcStore = useChoVanChuyenStore();
const route = useRoute();
const router = useRouter();

// ============================================================================
// MARK: - STATE: CORE DATA
// ============================================================================
// ── Data ──────────────────────────────────────────────────────────
const items = ref([]);
const stats = ref({ total: 0, tong_cuoc: 0, so_co_cod: 0 });
const pagination = ref({ page: 1, limit: 50, total: 0, totalPages: 1 }); // [B9] Backend pagination
const page = ref(1);
const loading = ref(false);
const vanPhongs = ref([]);
const selectedVpGui = ref(null);
const searchText = ref('');
const filterVpNhan = ref(null);
const filterChanh = ref(null);

// ============================================================================
// MARK: - STATE: BATCH & SINGLE DIALOGS
// ============================================================================
// ── Batch ─────────────────────────────────────────────────────────
const batchSelected = ref([]);
const batchConfirmVisible = ref(false);
const batchConfirming = ref(false);
const batchGhiChu = ref('');

// ── Confirm đơn lẻ ────────────────────────────────────────────────
const confirmDialogVisible = ref(false);
const confirmTarget = ref(null);
const confirmGhiChu = ref('');
const confirming = ref(false);

// ── Auto-refresh ───────────────────────────────────────────────────
const refreshCountdown = ref(60);
let refreshTimer = null;
let countdownTimer = null;

// ============================================================================
// MARK: - COMPUTED STATE
// ============================================================================
// ── Computed ───────────────────────────────────────────────────────
const isAdminOrAccountant = computed(() => auth.isAdmin);

const vpNhanOptions = computed(() => {
  const map = new Map();
  for (const b of items.value) {
    const vp = b.van_phong_nhan;
    if (vp && !map.has(vp.ma_vp)) {
      map.set(vp.ma_vp, { label: `${vp.ma_vp} — ${vp.ten}`, value: vp.ma_vp });
    }
  }
  return [{ label: 'Tất cả VP nhận', value: null }, ...map.values()];
});

const chanhOptions = computed(() => {
  const map = new Map();
  for (const b of items.value) {
    if (b.chanh && !map.has(b.chanh.id)) {
      map.set(b.chanh.id, { label: b.chanh.ten, value: b.chanh.id });
    }
  }
  return [{ label: 'Tất cả chành', value: null }, ...map.values()];
});

// [FE-W1] debouncedSearch — khai báo trước filteredItems để rõ dependency
const debouncedSearch = ref('');
let searchDebounceTimer = null;
watch(searchText, (val) => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => { debouncedSearch.value = val; }, 250);
});

const filteredItems = computed(() => {
  let result = items.value;
  if (filterVpNhan.value) result = result.filter(b => b.van_phong_nhan?.ma_vp === filterVpNhan.value);
  if (filterChanh.value) result = result.filter(b => b.chanh?.id === filterChanh.value);
  if (debouncedSearch.value.trim()) {
    const q = debouncedSearch.value.toLowerCase();
    result = result.filter(b =>
      [b.ma_so, b.don_vi_gui, b.nguoi_gui, b.don_vi_nhan, b.nguoi_nhan,
       b.dien_thoai_gui, b.dien_thoai_nhan, b.ten_hang_hoa, b.chanh?.ten]
        .some(f => f?.toLowerCase().includes(q))
    );
  }
  return result;
});

// [FE-W2] isFiltered & displayStats — stats phản ánh đúng filter đang active
const isFiltered = computed(() => filterVpNhan.value || filterChanh.value || debouncedSearch.value.trim());
const displayStats = computed(() => {
  if (!isFiltered.value) return stats.value;
  return {
    total:     filteredItems.value.length,
    tong_cuoc: filteredItems.value.reduce((s, b) => s + Number(b.gia_cuoc || 0), 0),
    so_co_cod: filteredItems.value.filter(b => Number(b.thu_ho) > 0).length,
  };
});

// [Fix #hasMore] Banner cảnh báo: backend có nhiều hơn số BN đang hiển thị
const hasMore = computed(() => items.value.length < (pagination.value?.total ?? 0));

// ============================================================================
// MARK: - API: FETCH DATA
// ============================================================================
// ── Load VPs (Admin) ───────────────────────────────────────────────
async function loadVanPhongs() {
  if (!isAdminOrAccountant.value) return;
  try {
    const { data: res } = await api.get('/van-phong?active=true');
    vanPhongs.value = [
      { label: 'Tất cả VP', value: null },  // [FIX-ADMIN] Admin xem tất cả khi không chọn VP
      ...res.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id })),
    ];
  } catch { vanPhongs.value = []; }
}

// ── Load data ──────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 50 };
    if (isAdminOrAccountant.value && selectedVpGui.value) params.vp_gui_id = selectedVpGui.value;
    const { data: res } = await api.get('/bien-nhan/cho-van-chuyen', { params });
    items.value = res.data;
    stats.value = res.stats;
    pagination.value = res.pagination ?? { page: 1, limit: 50, total: res.stats?.total ?? 0, totalPages: 1 }; // [B9]
    choVcStore.count = res.stats.total; // Cập nhật badge trực tiếp
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách');
  } finally {
    loading.value = false;
  }
}

// ============================================================================
// MARK: - ACTIONS & REFRESH TIMERS
// ============================================================================
// ── Timers ─────────────────────────────────────────────────────────
function resetCountdown() { refreshCountdown.value = 60; }
function startTimers() {
  resetCountdown();
  refreshTimer = setInterval(async () => { resetCountdown(); await loadData(); }, 60_000);
  countdownTimer = setInterval(() => { refreshCountdown.value = Math.max(0, refreshCountdown.value - 1); }, 1_000);
}
async function manualRefresh() {
  clearInterval(refreshTimer); clearInterval(countdownTimer);
  batchSelected.value = []; // [FE-B1] Reset batch selection trước reload
  await loadData();
  startTimers();
}

// ============================================================================
// MARK: - ACTIONS: SINGLE & BATCH CONFIRMATIONS
// ============================================================================
// ── Confirm đơn lẻ ────────────────────────────────────────────────
function openConfirm(bn) {
  confirmTarget.value = bn;
  confirmGhiChu.value = '';
  confirmDialogVisible.value = true;
}

async function confirmSingle() {
  if (!confirmTarget.value) return;
  confirming.value = true;
  try {
    await api.patch(`/bien-nhan/${confirmTarget.value.id}/trang-thai`, {
      trang_thai: 'dang_vc',
      ghi_chu: confirmGhiChu.value.trim() || 'Đã giao xe vận chuyển',
      phuong_thuc: 'manual',
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `${confirmTarget.value.ma_so} — Đã giao xe`, life: 3000 });
    confirmDialogVisible.value = false;
    batchSelected.value = [];
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật trạng thái');
    confirmDialogVisible.value = false; // [V3-B1] Đóng dialog — BN không còn ở trạng thái cho_vc
    await loadData();
  } finally {
    confirming.value = false;
  }
}

// ── Batch confirm ──────────────────────────────────────────────────
function openBatchConfirm() {
  batchGhiChu.value = '';
  batchConfirmVisible.value = true;
}

async function confirmBatch() {
  if (!batchSelected.value.length) return;
  batchConfirming.value = true;
  try {
    const ids = batchSelected.value.map(b => b.id);
    await api.patch('/bien-nhan/batch-trang-thai', {
      ids,
      trang_thai: 'dang_vc',
      ghi_chu: batchGhiChu.value.trim() || `Batch giao xe: ${ids.length} biên nhận`,
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Đã giao xe ${ids.length} biên nhận`, life: 4000 });
    batchSelected.value = [];
    batchGhiChu.value = '';
    batchConfirmVisible.value = false;
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật hàng loạt');
    await loadData(); // [NEW-B2] Reload để đồng bộ UI sau lỗi batch
  } finally {
    batchConfirming.value = false;
  }
}

// [FE-B2] syncFiltersToUrl — dùng delete thay vì undefined để Vue Router xóa key đúng cách
function syncFiltersToUrl() {
  const q = { ...route.query };
  if (filterVpNhan.value) q.vp_nhan = filterVpNhan.value;
  else delete q.vp_nhan;
  if (filterChanh.value)  q.chanh  = String(filterChanh.value);
  else delete q.chanh;
  router.replace({ query: q });
}

// [NEW-W1] Cleanup batchSelected khi filter thay đổi — tránh giao xe BN không còn visible
watch([filterVpNhan, filterChanh, debouncedSearch], () => {
  const visibleIds = new Set(filteredItems.value.map(b => b.id));
  batchSelected.value = batchSelected.value.filter(b => visibleIds.has(b.id));
});

watch([filterVpNhan, filterChanh], syncFiltersToUrl);

// [V3-W1] Bỏ guard "if (oldVal===null) return" vì:
//   - Vue watcher (immediate:false) không fire khi init — guard không cần thiết
//   - Guard đang chặn luôn lần chọn VP đầu tiên của admin (null→vpId) → regression
//   - Watcher cần chạy cho cả 3 trường hợp: chọn lần đầu, đổi VP, bỏ chọn về null
watch(selectedVpGui, async () => {
  batchSelected.value   = [];
  filterVpNhan.value    = null;
  filterChanh.value     = null;
  searchText.value      = '';
  debouncedSearch.value = '';
  await loadData();
});

// ── Init ───────────────────────────────────────────────────────────
// ============================================================================
// MARK: - LIFECYCLE
// ============================================================================
onMounted(async () => {
  // Restore filters từ URL
  if (route.query.vp_nhan) filterVpNhan.value = route.query.vp_nhan;
  if (route.query.chanh)   filterChanh.value  = Number(route.query.chanh);
  await loadVanPhongs();
  await loadData();
  startTimers();
});
onUnmounted(() => {
  clearInterval(refreshTimer);
  clearInterval(countdownTimer);
});
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & OFFICE SWITCHER                                      -->
  <!-- ===================================================================== -->
  <div class="cvc-page animate-fade-in">

    <!-- ═══ HEADER ═══ -->
    <div class="cvc-header">
      <div class="cvc-header-left">
        <i class="pi pi-truck header-icon"></i>
        <h1>Chờ vận chuyển</h1>
        <div v-if="isAdminOrAccountant" class="vp-select-wrap">
          <!-- [NEW-W3] Bỏ @change — watcher selectedVpGui đã gọi loadData() -->
          <Select v-model="selectedVpGui" :options="vanPhongs" optionLabel="label" optionValue="value"
            placeholder="Chọn VP gửi..." class="vp-select" />
        </div>
        <div v-else class="vp-badge">
          <i class="pi pi-building"></i>
          {{ auth.userVanPhong?.ten || auth.userVanPhong?.ma_vp }}
        </div>
      </div>
      <div class="cvc-header-right">
        <span class="refresh-info" :class="{ 'almost': refreshCountdown <= 10 }"
          v-tooltip.bottom="'Tự động làm mới dữ liệu sau ' + refreshCountdown + ' giây'">
          <i class="pi pi-clock"></i> {{ refreshCountdown }}s
        </span>
        <Button icon="pi pi-refresh" v-tooltip.bottom="'Làm mới ngay'" severity="secondary"
          text rounded size="small" :loading="loading" @click="manualRefresh" />
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - STATISTICS CARDS                                              -->
    <!-- ===================================================================== -->
    <!-- ═══ STATS CARDS ═══ -->
    <div class="stats-row">
      <div class="stat-card stat-total">
        <div class="stat-icon"><i class="pi pi-hourglass"></i></div>
        <div class="stat-body">
          <!-- [FE-W2] Dùng displayStats — phản ánh đúng filter đang active -->
          <span class="stat-value">{{ displayStats.total }}</span>
          <span class="stat-label">{{ isFiltered ? 'Kết quả lọc' : 'Chờ giao xe' }}</span>
        </div>
      </div>
      <div class="stat-card stat-money">
        <div class="stat-icon"><i class="pi pi-dollar"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ formatCurrency(displayStats.tong_cuoc) }}</span>
          <span class="stat-label">Tổng cước</span>
        </div>
      </div>
      <div class="stat-card stat-cod" :class="{ 'stat-cod-active': displayStats.so_co_cod > 0 }">
        <div class="stat-icon"><i class="pi pi-money-bill"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ displayStats.so_co_cod }}</span>
          <span class="stat-label">Có thu hộ (COD)</span>
        </div>
        <span v-if="displayStats.so_co_cod > 0" class="stat-cod-warn">Cần thu</span>
      </div>
    </div>

    <!-- [NEW-L1] has_more warning — hiển thị khi > 50 BN trong hàng đợi -->
    <div v-if="hasMore && !loading" class="has-more-warn">
      <i class="pi pi-exclamation-triangle"></i>
      Đang hiển thị <strong>50</strong> / <strong>{{ stats.total }}</strong> biên nhận.
    </div>

    <!-- [FIX-ADMIN] Bỏ guard v-if/v-else — admin thấy dữ liệu ngay -->
      <!-- ===================================================================== -->
      <!-- MARK: - TOOLBAR & FILTERS                                             -->
      <!-- ===================================================================== -->
      <!-- ═══ TOOLBAR ═══ -->
      <div class="cvc-toolbar">
        <div class="toolbar-row">
          <IconField class="search-wrap">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchText" placeholder="Tìm mã BN, người gửi/nhận, chành..." class="search-input" />
          </IconField>
          <Select v-model="filterVpNhan" :options="vpNhanOptions" optionLabel="label" optionValue="value"
            class="filter-select" placeholder="Lọc VP nhận..." />
          <Select v-model="filterChanh" :options="chanhOptions" optionLabel="label" optionValue="value"
            class="filter-select filter-chanh" placeholder="Lọc chành..." />
          <Button v-if="batchSelected.length > 0"
            :label="`Giao xe ${batchSelected.length} BN`"
            icon="pi pi-send" severity="warn" size="small"
            @click="openBatchConfirm" />
        </div>
        <div v-if="filterVpNhan || filterChanh" class="filter-active-hint">
          <i class="pi pi-filter-fill"></i>
          <span v-if="filterVpNhan">VP nhận: <strong>{{ filterVpNhan }}</strong></span>
          <span v-if="filterChanh && filterVpNhan"> · </span>
          <span v-if="filterChanh">Chành: <strong>{{ chanhOptions.find(c=>c.value===filterChanh)?.label }}</strong></span>
          — {{ filteredItems.length }} / {{ items.length }} biên nhận
          <button class="clear-filter" @click="filterVpNhan=null; filterChanh=null">✕ Bỏ lọc</button>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MARK: - DATA TABLE                                                    -->
      <!-- ===================================================================== -->
      <!-- ═══ TABLE ═══ -->
      <DataTable :value="filteredItems" v-model:selection="batchSelected" dataKey="id"
        :loading="loading" stripedRows size="small" scrollable scrollHeight="flex"
        :rowClass="(d) => Number(d.thu_ho) > 0 ? 'row-has-cod' : ''"
        :paginator="filteredItems.length > 100" :rows="100" :rowsPerPageOptions="[50, 100, 200]"
        paginatorTemplate="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first}-{last} / {totalRecords}"
        class="cvc-table">
        <Column selectionMode="multiple" headerStyle="width: 3rem" />
        <Column header="Mã BN" field="ma_so" frozen style="min-width:130px;font-weight:700;">
          <template #body="{ data }"><span class="ma-so-cell">{{ data.ma_so }}</span></template>
        </Column>
        <Column header="Ngày" style="min-width:85px;">
          <template #body="{ data }">{{ formatDate(data.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="VP nhận" style="min-width:80px;">
          <template #body="{ data }"><span class="vp-tag vp-nhan">{{ data.van_phong_nhan?.ma_vp }}</span></template>
        </Column>
        <Column header="Chành" style="min-width:120px;">
          <template #body="{ data }">
            <span v-if="data.chanh" class="chanh-tag">{{ data.chanh.ten }}</span>
            <span v-else class="no-val">—</span>
          </template>
        </Column>
        <Column header="Người gửi" style="min-width:155px;">
          <template #body="{ data }">
            <div class="person-cell">
              <span class="name">{{ data.don_vi_gui || data.nguoi_gui || '—' }}</span>
              <span v-if="data.don_vi_gui && data.nguoi_gui" class="sub">{{ data.nguoi_gui }}</span>
              <span v-if="data.dien_thoai_gui" class="phone">{{ data.dien_thoai_gui }}</span>
            </div>
          </template>
        </Column>
        <Column header="Hàng hóa" style="min-width:140px;">
          <template #body="{ data }">
            <span class="text-truncate" style="max-width:140px;display:inline-block;">{{ data.ten_hang_hoa || '—' }}</span>
          </template>
        </Column>
        <Column header="Cước" style="min-width:90px;text-align:right;">
          <template #body="{ data }"><span class="cuoc-val">{{ formatCurrency(data.gia_cuoc) }}</span></template>
        </Column>
        <Column header="COD" style="min-width:95px;text-align:right;">
          <template #body="{ data }">
            <span v-if="Number(data.thu_ho) > 0" class="cod-badge">
              <i class="pi pi-exclamation-circle" style="font-size:0.65rem;"></i>
              {{ formatCurrency(data.thu_ho) }}
            </span>
            <span v-else class="no-val">—</span>
          </template>
        </Column>
        <Column v-if="isAdminOrAccountant" header="NV nhập" style="min-width:110px;">
          <template #body="{ data }">
            <span class="nv-nhap-cell">{{ data.nhan_vien_nhap?.ten || '—' }}</span>
          </template>
        </Column>
        <Column frozen alignFrozen="right" style="min-width:110px;text-align:center;">
          <template #header><span style="font-size:0.75rem;">Giao xe</span></template>
          <template #body="{ data }">
            <Button icon="pi pi-send" label="Giao xe" severity="warn"
              size="small" class="confirm-btn" @click="openConfirm(data)" />
          </template>
        </Column>
        <!-- [FE-W3] ── Empty state: phân biệt no-data vs filtered-empty ── -->
        <template #empty>
          <div class="table-empty">
            <template v-if="isFiltered">
              <i class="pi pi-filter-slash" style="font-size:2rem;color:#94a3b8;"></i>
              <p>Không có kết quả nào khớp bộ lọc</p>
              <button class="clear-filter" style="margin-top:0.25rem;" @click="filterVpNhan=null; filterChanh=null; searchText=''">✕ Xóa bộ lọc</button>
            </template>
            <template v-else>
              <i class="pi pi-hourglass" style="font-size:2rem;color:#94a3b8;"></i>
              <p>Không có biên nhận nào đang chờ vận chuyển</p>
            </template>
          </div>
        </template>
      </DataTable>

      <!-- ─── Pagination Bar [B9] ─────────────────────────────────────── -->
      <div v-if="pagination.totalPages > 1" class="page-pagination">
        <span>Trang {{ pagination.page }}/{{ pagination.totalPages }} · {{ pagination.total }} biên nhận</span>
        <div class="pagi-controls">
          <Button icon="pi pi-angle-double-left" text size="small" rounded
            :disabled="pagination.page <= 1" @click="page = 1; loadData()" />
          <Button icon="pi pi-angle-left" text size="small" rounded
            :disabled="pagination.page <= 1" @click="page--; loadData()" />
          <span style="font-size:0.8rem; padding: 0 0.25rem;">{{ pagination.page }}</span>
          <Button icon="pi pi-angle-right" text size="small" rounded
            :disabled="pagination.page >= pagination.totalPages" @click="page++; loadData()" />
          <Button icon="pi pi-angle-double-right" text size="small" rounded
            :disabled="pagination.page >= pagination.totalPages" @click="page = pagination.totalPages; loadData()" />
        </div>
      </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: CONFIRM SINGLE ITEM                                   -->
    <!-- ===================================================================== -->
    <!-- ═══ CONFIRM ĐƠN LẺ ═══ -->
    <Dialog v-model:visible="confirmDialogVisible" header="Xác nhận Giao xe" :modal="true" :style="{ width: '420px' }">
      <div v-if="confirmTarget" class="confirm-info">
        <div class="confirm-row"><span class="confirm-lbl">Mã BN:</span><strong class="confirm-val">{{ confirmTarget.ma_so }}</strong></div>
        <div class="confirm-row"><span class="confirm-lbl">Tuyến:</span>
          <span class="confirm-val">{{ confirmTarget.van_phong_gui?.ma_vp }} → {{ confirmTarget.van_phong_nhan?.ma_vp }}</span>
        </div>
        <div class="confirm-row" v-if="confirmTarget.chanh"><span class="confirm-lbl">Chành:</span>
          <span class="confirm-val">{{ confirmTarget.chanh?.ten }}</span>
        </div>
        <div class="confirm-row"><span class="confirm-lbl">Người gửi:</span>
          <span class="confirm-val">{{ confirmTarget.don_vi_gui || confirmTarget.nguoi_gui || '—' }}</span>
        </div>
        <div class="confirm-row"><span class="confirm-lbl">Hàng hóa:</span>
          <span class="confirm-val">{{ confirmTarget.ten_hang_hoa || '—' }}</span>
        </div>
        <div v-if="Number(confirmTarget.thu_ho) > 0" class="confirm-cod-warn">
          <i class="pi pi-exclamation-circle"></i>
          COD: <strong>{{ formatCurrency(confirmTarget.thu_ho) }}</strong>
        </div>
        <div class="confirm-ghi-chu">
          <label class="confirm-lbl">Ghi chú (tùy chọn):</label>
          <InputText v-model="confirmGhiChu" placeholder="Nhập ghi chú..." fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="confirmDialogVisible = false" />
        <Button label="Giao xe" icon="pi pi-send" severity="warn" size="small" :loading="confirming" @click="confirmSingle" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: BATCH CONFIRM ITEMS                                   -->
    <!-- ===================================================================== -->
    <!-- ═══ BATCH CONFIRM ═══ -->
    <Dialog v-model:visible="batchConfirmVisible" header="Giao xe hàng loạt" :modal="true" :style="{ width: '460px' }">
      <p style="font-size:0.87rem;margin-bottom:0.6rem;">
        Xác nhận giao xe <strong>{{ batchSelected.length }}</strong> biên nhận?
      </p>
      <div class="batch-list">
        <div v-for="bn in batchSelected" :key="bn.id" class="batch-item">
          <strong>{{ bn.ma_so }}</strong>
          <span>{{ bn.van_phong_nhan?.ma_vp }}</span>
          <span>{{ bn.don_vi_gui || bn.nguoi_gui || '—' }}</span>
          <span v-if="Number(bn.thu_ho) > 0" class="cod-badge" style="font-size:0.68rem;">COD</span>
        </div>
      </div>
      <div class="confirm-ghi-chu" style="margin-top:0.75rem;">
        <label class="confirm-lbl">Ghi chú (tùy chọn):</label>
        <InputText v-model="batchGhiChu" placeholder="Nhập ghi chú chung cho lô hàng..." fluid />
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="batchConfirmVisible = false; batchGhiChu = ''" /> <!-- [V3-W3] Reset ghi chú khi hủy -->
        <Button :label="`Giao xe ${batchSelected.length} BN`"
          icon="pi pi-send" severity="warn" size="small" :loading="batchConfirming" @click="confirmBatch" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
/* ─── Page Layout ──────────────────────────────────────────────── */
.cvc-page { display: flex; flex-direction: column; height: calc(100vh - var(--header-height) - var(--content-padding) * 2); gap: 0.5rem; }

/* ─── Header ────────────────────────────────────────────────────── */
.cvc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.cvc-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.cvc-header-left h1 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--secondary);
  margin: 0;
  white-space: nowrap;
}

.cvc-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ─── Table & Toolbar ───────────────────────────────────────────── */
.cvc-table   { flex: 1; overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.cvc-toolbar { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }

/* ─── NV nhập cell: chỉ riêng ChoVanChuyen mới có cột này ──────── */
.nv-nhap-cell { font-size: 0.78rem; color: var(--text-muted); }
</style>

