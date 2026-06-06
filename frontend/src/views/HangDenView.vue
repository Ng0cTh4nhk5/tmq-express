<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import { useHangDenStore } from '../stores/hang-den.store';
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
const hangDenStore = useHangDenStore();

// ============================================================================
// MARK: - STATE: TAB CONFIG
// ============================================================================
// ── Tab state ──────────────────────────────────────────────────────
const activeTab = ref('dang_vc');
const TABS = [
  { key: 'dang_vc',       label: 'Đang đến',     icon: 'pi pi-truck',    action: 'Xác nhận đến kho', nextState: 'da_den_kho',    severity: 'success', ghiChuDefault: 'Hàng đã đến kho',   allowBatch: true },
  { key: 'da_den_kho',    label: 'Tại kho',       icon: 'pi pi-building', action: 'Phân loại',        nextState: null,            severity: 'info',    ghiChuDefault: null,                 allowBatch: true },
  { key: 'da_bao_khach',  label: 'Đã báo khách',  icon: 'pi pi-phone',    action: 'Khách đã nhận',    nextState: 'khach_da_nhan', severity: 'success', ghiChuDefault: 'Khách đã nhận hàng', allowBatch: true },
  { key: 'dang_giao',     label: 'Đang giao',     icon: 'pi pi-car',      action: 'Khách đã nhận',    nextState: 'khach_da_nhan', severity: 'success', ghiChuDefault: 'Khách đã nhận hàng', allowBatch: true },
  { key: 'da_giao_chanh', label: 'Đã giao Chành', icon: 'pi pi-send',     action: null,               nextState: null,            severity: null,      ghiChuDefault: null,                 allowBatch: false },
];
const currentTab = computed(() => TABS.find(t => t.key === activeTab.value));

// ── Helper: tính nextState động cho từng BN trong tab da_den_kho ───
function getNextStateForBN(bn) {
  if (activeTab.value !== 'da_den_kho') return currentTab.value?.nextState;
  if (bn.chanh_id) return 'da_giao_chanh';
  if (bn.hinh_thuc_giao === 'tu_toi') return 'khach_da_nhan';
  if (bn.hinh_thuc_giao === 'tan_noi') return 'dang_giao';
  return 'da_bao_khach'; // goi_dien (default)
}

function getActionLabelForBN(bn) {
  const next = getNextStateForBN(bn);
  const map = {
    da_giao_chanh: 'Giao Chành',
    khach_da_nhan: 'Khách nhận',
    dang_giao:     'Bắt đầu giao',
    da_bao_khach:  'Báo khách',
  };
  return map[next] || next;
}

function getActionSeverityForBN(bn) {
  const next = getNextStateForBN(bn);
  return next === 'da_giao_chanh' ? 'help'
       : next === 'khach_da_nhan' ? 'success'
       : next === 'dang_giao'     ? 'warn'
       : 'info';
}

// ============================================================================
// MARK: - STATE: CORE DATA
// ============================================================================
// ── Data ──────────────────────────────────────────────────────────
const items = ref([]);
const stats = ref({ total: 0, tong_cuoc: 0, so_co_cod: 0 });
const tabCounts = ref({ dang_vc: 0, da_den_kho: 0, da_bao_khach: 0, dang_giao: 0, da_giao_chanh: 0 });
const pagination = ref({ page: 1, limit: 50, total: 0, totalPages: 1 }); // [B8] Backend pagination
const page = ref(1);
const loading = ref(false);
const vanPhongs = ref([]);
const selectedVpNhan = ref(null);
const searchText = ref('');
const filterVpGui = ref(null);
const filterChanh = ref(null);
// [Fix #7] Ẩn BN đã hoàn thành vòng đời trong tab da_giao_chanh — mặc định BẬT
const hideCompleted = ref(true);

// [NT-01] Nhận diện đơn nội thành: VP gửi = VP nhận
function isNoiThanhBN(bn) {
  return bn.van_phong_gui_id === bn.van_phong_nhan_id;
}

// ============================================================================
// MARK: - STATE: BATCH & SINGLE DIALOGS
// ============================================================================
// ── Batch ─────────────────────────────────────────────────────────
const batchSelected = ref([]);
const batchConfirmVisible = ref(false);
const batchConfirming = ref(false);
const batchGhiChu = ref(''); // [Fix #4] Ghi chú batch

// ── Confirm đơn lẻ ────────────────────────────────────────────────
const confirmDialogVisible = ref(false);
const confirmTarget = ref(null);
const confirmGhiChu = ref('');
const confirming = ref(false);

// ── Xác nhận thu tiền Chành ────────────────────────────────────────
const chanhPayDialogVisible = ref(false);
const chanhPayTarget = ref(null);
const confirmingChanhPay = ref(false);

function openChanhPayConfirm(bn) {
  chanhPayTarget.value = bn;
  chanhPayDialogVisible.value = true;
}

async function confirmChanhPayment() {
  const bn = chanhPayTarget.value;
  if (!bn) return;
  confirmingChanhPay.value = true;
  try {
    const calls = [];
    // Ghi nhận Chành đã thu COD (cho_thu → da_thu_chanh)
    if (Number(bn.thu_ho) > 0 && bn.chanh_id && bn.trang_thai_cod === 'cho_thu') {
      calls.push(api.post(`/thu-ho/${bn.id}/xac-nhan-thu-chanh`, {}));
    }
    // Thu cước nhận (cho_thu → da_thu)
    if (bn.trang_thai_cuoc_nhan === 'cho_thu') {
      calls.push(api.post(`/cuoc-nhan/${bn.id}/thu`, { hinh_thuc: 'tien_mat' }));
    }
    if (!calls.length) {
      toast.add({ severity: 'info', summary: 'Không có gì để thu', detail: 'BN này không có COD hay cước cần thu', life: 3000 });
      chanhPayDialogVisible.value = false;
      return;
    }
    await Promise.all(calls);
    const parts = [];
    if (Number(bn.thu_ho) > 0 && bn.trang_thai_cod === 'cho_thu') parts.push('COD');
    if (bn.trang_thai_cuoc_nhan === 'cho_thu') parts.push('cước nhận');
    toast.add({ severity: 'success', summary: '✅ Thành công', detail: `${bn.ma_so} — Đã ghi nhận thu ${parts.join(' + ')} qua chành`, life: 3500 });
    chanhPayDialogVisible.value = false;
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xác nhận thu tiền chành');
  } finally {
    confirmingChanhPay.value = false;
  }
}

// Helper: kiểm tra BN còn tiền cần thu không (tab da_giao_chanh)
function chanhHasPending(bn) {
  return (Number(bn.thu_ho) > 0 && bn.trang_thai_cod === 'cho_thu')
      || bn.trang_thai_cuoc_nhan === 'cho_thu';
}

// ── Auto-refresh ───────────────────────────────────────────────────
const refreshCountdown = ref(60);
let refreshTimer = null;
let countdownTimer = null;

// [Fix freeze] Guard: ngăn async callback ghi state sau khi component unmount
let isMounted = false;

// ============================================================================
// MARK: - COMPUTED STATE
// ============================================================================
// ── Computed ───────────────────────────────────────────────────────
const isAdminOrAccountant = computed(() => auth.isAdmin);

const vpGuiOptions = computed(() => {
  const map = new Map();
  for (const b of items.value) {
    const vp = b.van_phong_gui;
    if (vp && !map.has(vp.ma_vp)) map.set(vp.ma_vp, { label: `${vp.ma_vp} — ${vp.ten}`, value: vp.ma_vp });
  }
  return [{ label: 'Tất cả chi nhánh gửi', value: null }, ...map.values()];
});

const chanhOptions = computed(() => {
  const map = new Map();
  for (const b of items.value) {
    if (b.chanh && !map.has(b.chanh.id)) map.set(b.chanh.id, { label: b.chanh.ten, value: b.chanh.id });
  }
  return [{ label: 'Tất cả chành', value: null }, ...map.values()];
});

const filteredItems = computed(() => {
  let result = items.value;
  if (filterVpGui.value) result = result.filter(b => b.van_phong_gui?.ma_vp === filterVpGui.value);
  if (filterChanh.value) result = result.filter(b => b.chanh?.id === filterChanh.value);
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase();
    result = result.filter(b =>
      [b.ma_so, b.don_vi_gui, b.nguoi_gui, b.don_vi_nhan, b.nguoi_nhan,
       b.dien_thoai_gui, b.dien_thoai_nhan, b.ten_hang_hoa, b.chanh?.ten]
        .some(f => f?.toLowerCase().includes(q))
    );
  }
  // [Fix #7] Ẩn BN đã xong vòng đời trong tab da_giao_chanh
  // BN "đã xong" = không còn khoản nào cần thu/xử lý:
  //   COD: không có (thu_ho=0) HOẶC đã hoàn tất (không phải cho_thu, không phải da_thu_chanh)
  //   Cước nhận: không phải cho_thu
  if (hideCompleted.value && activeTab.value === 'da_giao_chanh') {
    result = result.filter(b => {
      const codPending = Number(b.thu_ho) > 0 && (b.trang_thai_cod === 'cho_thu' || b.trang_thai_cod === 'da_thu_chanh');
      const cuocPending = b.trang_thai_cuoc_nhan === 'cho_thu';
      return codPending || cuocPending; // Chỉ giữ lại BN còn pending
    });
  }
  return result;
});

// [Bonus] displayStats — phản ánh đúng filter đang active
const isFiltered = computed(() => filterVpGui.value || filterChanh.value || searchText.value.trim() || hideCompleted.value);
const displayStats = computed(() => {
  if (!isFiltered.value) return stats.value;
  return {
    total:     filteredItems.value.length,
    tong_cuoc: filteredItems.value.reduce((s, b) => s + Number(b.gia_cuoc || 0), 0),
    so_co_cod: filteredItems.value.filter(b => Number(b.thu_ho) > 0).length,
  };
});

// [Fix #7] Badge tab: khi ẩn BN hoàn tất, badge da_giao_chanh hiện số pending thực tế
function getTabBadge(tabKey) {
  if (tabKey === 'da_giao_chanh' && hideCompleted.value && activeTab.value === 'da_giao_chanh') {
    return filteredItems.value.length;
  }
  return tabCounts.value[tabKey] || 0;
}

// [Fix #hasMore] Banner cảnh báo: backend có nhiều hơn số BN đang hiển thị
const hasMore = computed(() => items.value.length < (pagination.value?.total ?? 0));

// ============================================================================
// MARK: - API: FETCH DATA
// ============================================================================
// ── Load VPs ──────────────────────────────────────────────────────
async function loadVanPhongs() {
  if (!isAdminOrAccountant.value) return;
  try {
    const { data: res } = await api.get('/van-phong?active=true');
    if (!isMounted) return; // [Fix freeze] component đã unmount, bỏ qua
    vanPhongs.value = [
      { label: 'Tất cả VP', value: null },  // [FIX-ADMIN] Admin xem tất cả khi không chọn VP
      ...res.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id })),
    ];
  } catch { if (isMounted) vanPhongs.value = []; }
}

// ── Load data ──────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  try {
    const params = { trang_thai: activeTab.value, page: page.value, limit: 50 };
    if (isAdminOrAccountant.value && selectedVpNhan.value) params.vp_nhan_id = selectedVpNhan.value;
    const { data: res } = await api.get('/bien-nhan/hang-den', { params });
    if (!isMounted) return;
    items.value = res.data;
    stats.value = res.stats;
    pagination.value = res.pagination ?? { page: 1, limit: 50, total: res.stats?.total ?? 0, totalPages: 1 }; // [B8]
    if (res.tab_counts) {
      tabCounts.value = res.tab_counts;
      hangDenStore.setFromTabCounts(res.tab_counts);
    }
  } catch (err) {
    if (isMounted) handleApiError(err, toast, 'Không thể tải danh sách');
  } finally {
    if (isMounted) loading.value = false;
  }
}

// ============================================================================
// MARK: - ACTIONS & TAB NAVIGATION
// ============================================================================
// ── Tab switch ─────────────────────────────────────────────────────
// [Fix #3] Giữ searchText khi switch tab; chỉ reset filter VP/Chành
async function switchTab(tabKey) {
  if (activeTab.value === tabKey) return;
  activeTab.value = tabKey;
  page.value = 1; // [B8] Reset về trang 1 khi đổi tab
  batchSelected.value = [];
  filterVpGui.value = null;
  filterChanh.value = null;
  syncTabToUrl(tabKey);
  await loadData();
}

// [Fix #6] Sync activeTab vào URL query string
function syncTabToUrl(tabKey) {
  const url = new URL(window.location.href);
  if (tabKey && tabKey !== 'dang_vc') url.searchParams.set('tab', tabKey);
  else url.searchParams.delete('tab');
  window.history.replaceState({}, '', url.toString());
}

// ── Timers ─────────────────────────────────────────────────────────
function resetCountdown() { refreshCountdown.value = 60; }
function startTimers() {
  resetCountdown();
  refreshTimer = setInterval(async () => { resetCountdown(); await loadData(); }, 60_000);
  countdownTimer = setInterval(() => { refreshCountdown.value = Math.max(0, refreshCountdown.value - 1); }, 1_000);
}
async function manualRefresh() {
  clearInterval(refreshTimer); clearInterval(countdownTimer);
  batchSelected.value = [];
  await loadData();
  startTimers();
}

// ============================================================================
// MARK: - ACTIONS: SINGLE & BATCH CONFIRMATIONS
// ============================================================================
// ── Confirm đơn lẻ ────────────────────────────────────────────────
function openConfirm(bn) {
  confirmTarget.value = bn; confirmGhiChu.value = ''; confirmDialogVisible.value = true;
}

async function confirmSingle() {
  if (!confirmTarget.value) return;
  confirming.value = true;
  // Tab da_den_kho: nextState phụ thuộc vào từng BN
  const nextState = getNextStateForBN(confirmTarget.value);
  const actionLabel = getActionLabelForBN(confirmTarget.value);
  const ghiChuDefault = currentTab.value?.ghiChuDefault || '';
  try {
    await api.patch(`/bien-nhan/${confirmTarget.value.id}/trang-thai`, {
      trang_thai: nextState,
      ghi_chu: confirmGhiChu.value.trim() || undefined,
      phuong_thuc: 'manual',
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `${confirmTarget.value.ma_so} — ${actionLabel}`, life: 3000 });
    confirmDialogVisible.value = false;
    batchSelected.value = [];
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật trạng thái');
  } finally {
    confirming.value = false;
  }
}

// ── Batch confirm ──────────────────────────────────────────────────
function openBatchConfirm() {
  batchGhiChu.value = ''; // [Fix #4] Reset ghi chú mỗi lần mở
  batchConfirmVisible.value = true;
}

async function confirmBatch() {
  if (!batchSelected.value.length || !currentTab.value) return;
  batchConfirming.value = true;
  const { nextState, action } = currentTab.value;
  try {
    if (activeTab.value === 'da_den_kho') {
      const groups = {};
      for (const bn of batchSelected.value) {
        const state = getNextStateForBN(bn);
        if (!groups[state]) groups[state] = [];
        groups[state].push(bn.id);
      }
      
      const calls = Object.entries(groups).map(([state, ids]) => 
        api.patch('/bien-nhan/batch-trang-thai', {
          ids,
          trang_thai: state,
          ghi_chu: batchGhiChu.value.trim() || `Phân loại hàng loạt: ${ids.length} biên nhận`,
        })
      );
      await Promise.all(calls);
    } else {
      const ids = batchSelected.value.map(b => b.id);
      await api.patch('/bien-nhan/batch-trang-thai', {
        ids,
        trang_thai: nextState,
        ghi_chu: batchGhiChu.value.trim() || `Batch ${action}: ${ids.length} biên nhận`, // [Fix #4]
      });
    }
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Đã cập nhật ${batchSelected.value.length} biên nhận`, life: 4000 });
    batchSelected.value = []; batchGhiChu.value = ''; batchConfirmVisible.value = false;
    await loadData();
  } catch (err) {
    handleApiError(err, toast, 'Lỗi cập nhật hàng loạt');
    await loadData();
  } finally {
    batchConfirming.value = false;
  }
}

// ── Init ───────────────────────────────────────────────────────────
// ============================================================================
// MARK: - LIFECYCLE
// ============================================================================
onMounted(async () => {
  isMounted = true;
  // [Fix #6] Restore activeTab từ URL khi mount
  const tabFromUrl = new URLSearchParams(window.location.search).get('tab');
  if (tabFromUrl && TABS.some(t => t.key === tabFromUrl)) activeTab.value = tabFromUrl;
  await loadVanPhongs();
  await loadData();
  if (isMounted) startTimers(); // chỉ start timer nếu vẫn còn mounted
});
onUnmounted(() => {
  isMounted = false; // [Fix freeze] báo hiệu cho async callbacks dừng ghi state
  clearInterval(refreshTimer);
  clearInterval(countdownTimer);
});

// [Fix N2] Cleanup batchSelected khi filter thay đổi — tránh confirm BN không còn visible
watch([filterVpGui, filterChanh, searchText], () => {
  const visibleIds = new Set(filteredItems.value.map(b => b.id));
  batchSelected.value = batchSelected.value.filter(b => visibleIds.has(b.id));
});
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - HEADER & OFFICE SWITCHER                                      -->
  <!-- ===================================================================== -->
  <div class="hd-page animate-fade-in">

    <!-- ═══ HEADER ═══ -->
    <div class="hd-header">
      <div class="hd-header-left">
        <i class="pi pi-inbox header-icon"></i>
        <h1>Giao nhận hàng</h1>
        <div v-if="isAdminOrAccountant" class="vp-select-wrap">
          <Select v-model="selectedVpNhan" :options="vanPhongs" optionLabel="label" optionValue="value"
            placeholder="Chọn VP nhận..." class="vp-select" @change="loadData" />
        </div>
        <div v-else class="vp-badge">
          <i class="pi pi-building"></i>
          {{ auth.userVanPhong?.ten || auth.userVanPhong?.ma_vp }}
        </div>
      </div>
      <div class="hd-header-right">
        <span class="refresh-info" :class="{ 'almost': refreshCountdown <= 10 }">
          <i class="pi pi-clock"></i> {{ refreshCountdown }}s
        </span>
        <Button icon="pi pi-refresh" v-tooltip.bottom="'Làm mới ngay'" severity="secondary"
          text rounded size="small" :loading="loading" @click="manualRefresh" />
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - TAB BAR                                                       -->
    <!-- ===================================================================== -->
    <!-- ═══ TAB BAR ═══ -->
    <div class="tab-bar">
      <button v-for="tab in TABS" :key="tab.key"
        class="tab-btn" :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)">
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
        <span v-if="getTabBadge(tab.key) > 0" class="tab-badge" :class="tab.key">
          {{ getTabBadge(tab.key) }}
        </span>
      </button>
    </div>

    <!-- ===================================================================== -->
    <!-- MARK: - STATISTICS CARDS                                              -->
    <!-- ===================================================================== -->
    <!-- ═══ STATS CARDS ═══ -->
    <div class="stats-row">
      <div class="stat-card stat-total">
        <div class="stat-icon"><i class="pi pi-list"></i></div>
        <div class="stat-body">
          <span class="stat-value">{{ displayStats.total }}</span>
          <span class="stat-label">{{ isFiltered ? 'Kết quả lọc' : currentTab?.label }}</span>
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

    <!-- [HD-01] has_more warning — hiển thị khi > 500 BN trong tab -->
    <div v-if="hasMore && !loading" class="has-more-warn">
      <i class="pi pi-exclamation-triangle"></i>
      Đang hiển thị <strong>{{ items.length }}</strong> / <strong>{{ stats.total }}</strong> biên nhận — xử lý các lô đầu để xem phần còn lại.
    </div>

    <!-- [FIX-ADMIN] Bỏ guard v-if/v-else — admin thấy dữ liệu ngay -->
      <!-- ===================================================================== -->
      <!-- MARK: - TOOLBAR & FILTERS                                             -->
      <!-- ===================================================================== -->
      <!-- ═══ TOOLBAR ═══ -->
      <div class="hd-toolbar">
        <div class="toolbar-row">
          <IconField class="search-wrap">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchText" placeholder="Tìm mã BN, người gửi/nhận, chành..." class="search-input" />
          </IconField>
          <Select v-model="filterVpGui" :options="vpGuiOptions" optionLabel="label" optionValue="value"
            class="filter-select" placeholder="Lọc VP gửi..." />
          <Select v-model="filterChanh" :options="chanhOptions" optionLabel="label" optionValue="value"
            class="filter-select filter-chanh" placeholder="Lọc chành..." />
          <Button v-if="batchSelected.length > 0 && currentTab?.allowBatch"
            :label="`${currentTab?.action} ${batchSelected.length} BN`"
            icon="pi pi-check-circle" :severity="currentTab?.severity" size="small"
            @click="openBatchConfirm" />
          <!-- [Fix #7] Toggle ẩn BN đã xong trong tab Đã giao Chành -->
          <Button v-if="activeTab === 'da_giao_chanh'"
            :label="hideCompleted ? 'Hiện tất cả' : 'Ẩn đã hoàn tất'"
            :icon="hideCompleted ? 'pi pi-eye' : 'pi pi-eye-slash'"
            :severity="hideCompleted ? 'info' : 'secondary'"
            :outlined="!hideCompleted"
            size="small"
            @click="hideCompleted = !hideCompleted"
          />
        </div>
        <div v-if="filterVpGui || filterChanh" class="filter-active-hint">
          <i class="pi pi-filter-fill"></i>
          <span v-if="filterVpGui">CN gửi: <strong>{{ filterVpGui }}</strong></span>
          <span v-if="filterChanh && filterVpGui"> · </span>
          <span v-if="filterChanh">Chành: <strong>{{ chanhOptions.find(c=>c.value===filterChanh)?.label }}</strong></span>
          — {{ filteredItems.length }} / {{ items.length }} biên nhận
          <button class="clear-filter" @click="filterVpGui=null; filterChanh=null">✕ Bỏ lọc</button>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MARK: - DATA TABLE                                                    -->
      <!-- ===================================================================== -->
      <!-- ═══ TABLE ═══ -->
      <DataTable :value="filteredItems" v-model:selection="batchSelected" dataKey="id"
        :loading="loading" stripedRows size="small" scrollable scrollHeight="flex"
        :rowClass="(d) => Number(d.thu_ho) > 0 ? 'row-has-cod' : ''"
        class="hd-table">
        <!-- Checkbox chỉ hiện khi tab có allowBatch -->
        <Column v-if="currentTab?.allowBatch" selectionMode="multiple" headerStyle="width: 3rem" />

        <Column header="Mã BN" field="ma_so" frozen style="min-width:130px;font-weight:700;">
          <template #body="{ data }"><span class="ma-so-cell">{{ data.ma_so }}</span></template>
        </Column>
        <Column header="Ngày" style="min-width:85px;">
          <template #body="{ data }">{{ formatDate(data.ngay_bien_nhan) }}</template>
        </Column>
        <Column header="VP gửi" style="min-width:85px;">
          <template #body="{ data }">
            <span class="vp-tag">{{ data.van_phong_gui?.ma_vp }}</span>
            <!-- [NT-01] Mini badge NT cho đơn nội thành -->
            <span
              v-if="isNoiThanhBN(data)"
              class="nt-mini-badge"
              v-tooltip.top="'\u0110\u01a1n n\u1ed9i th\u00e0nh'"
            >NT</span>
          </template>
        </Column>
        <!-- Cột HT Giao chỉ hiển trong tab Tại kho -->
        <Column v-if="activeTab === 'da_den_kho'" header="HT Giao" style="min-width:90px;">
          <template #body="{ data }">
            <span v-if="data.chanh_id" class="ht-tag ht-chanh" title="Gửi Chành"><i class="pi pi-send"></i> Chành</span>
            <span v-else-if="data.hinh_thuc_giao === 'tan_noi'" class="ht-tag ht-tan-noi"><i class="pi pi-car"></i> Tận nơi</span>
            <span v-else-if="data.hinh_thuc_giao === 'tu_toi'" class="ht-tag ht-tu-toi"><i class="pi pi-user"></i> Tự tới</span>
            <span v-else class="ht-tag ht-goi-dien"><i class="pi pi-phone"></i> Gọi điện</span>
          </template>
        </Column>
        <Column header="Chành" style="min-width:110px;">
          <template #body="{ data }">
            <span v-if="data.chanh" class="chanh-tag">{{ data.chanh.ten }}</span>
            <span v-else class="no-val">—</span>
          </template>
        </Column>

        <Column header="Người nhận" style="min-width:155px;">
          <template #body="{ data }">
            <div class="sender-cell">
              <span class="name">{{ data.don_vi_nhan || data.nguoi_nhan || '—' }}</span>
              <span v-if="data.don_vi_nhan && data.nguoi_nhan" class="sub">{{ data.nguoi_nhan }}</span>
              <span v-if="data.dien_thoai_nhan" class="phone">{{ data.dien_thoai_nhan }}</span>
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
        <Column header="COD / Cước" style="min-width:110px;text-align:right;">
          <template #body="{ data }">
            <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end;">
              <span v-if="Number(data.thu_ho) > 0" class="cod-badge">
                <i class="pi pi-exclamation-circle" style="font-size:0.65rem;"></i>
                {{ formatCurrency(data.thu_ho) }}
              </span>
              <span v-if="data.trang_thai_cuoc_nhan === 'cho_thu'" class="cuoc-nhan-badge">
                <i class="pi pi-wallet" style="font-size:0.65rem;"></i>
                CƯỚC
              </span>
              <span v-if="!Number(data.thu_ho) && data.trang_thai_cuoc_nhan !== 'cho_thu'" class="no-cod">—</span>
            </div>
          </template>
        </Column>
        <!-- Cột Thu tiền Chành: chỉ hiện trong tab da_giao_chanh -->
        <Column v-if="activeTab === 'da_giao_chanh'" header="Thu tiền Chành" style="min-width:200px;">
          <template #body="{ data }">
            <div class="chanh-fin-cell">
              <!-- COD status -->
              <span v-if="Number(data.thu_ho) > 0" class="fin-row">
                <i class="pi pi-money-bill fin-icon"></i>
                <span class="fin-amount">{{ formatCurrency(data.thu_ho) }}</span>
                <span v-if="data.trang_thai_cod === 'cho_thu'" class="fin-tag fin-tag--pending">Chờ thu COD</span>
                <span v-else-if="data.trang_thai_cod === 'da_thu_chanh'" class="fin-tag fin-tag--ok">Chành đã thu</span>
                <span v-else class="fin-tag fin-tag--done">Xong</span>
              </span>
              <!-- Cước status -->
              <span v-if="data.trang_thai_cuoc_nhan === 'cho_thu' || data.trang_thai_cuoc_nhan === 'da_thu'" class="fin-row">
                <i class="pi pi-wallet fin-icon"></i>
                <span class="fin-amount">{{ formatCurrency(data.gia_cuoc) }}</span>
                <span v-if="data.trang_thai_cuoc_nhan === 'cho_thu'" class="fin-tag fin-tag--pending">Chờ thu cước</span>
                <span v-else class="fin-tag fin-tag--ok">Đã thu</span>
              </span>
              <!-- Action -->
              <Button v-if="chanhHasPending(data)"
                label="Xác nhận thu tiền" icon="pi pi-check-circle"
                size="small" severity="success" class="chanh-pay-btn"
                @click="openChanhPayConfirm(data)" />
              <span v-else-if="!Number(data.thu_ho) && !data.trang_thai_cuoc_nhan" class="no-val">—</span>
              <span v-else class="chanh-done-label"><i class="pi pi-check-circle"></i> Hoàn tất</span>
            </div>
          </template>
        </Column>

        <Column frozen alignFrozen="right" style="min-width:130px;text-align:center;">
          <template #header>
            <span style="font-size:0.75rem;">{{ activeTab === 'da_den_kho' ? 'Hành động' : (activeTab === 'da_giao_chanh' ? 'Trạng thái' : currentTab?.action) }}</span>
          </template>
          <template #body="{ data }">
            <!-- Tab da_den_kho: mỗi BN có action riêng -->
            <Button v-if="activeTab === 'da_den_kho'"
              :label="getActionLabelForBN(data)"
              :severity="getActionSeverityForBN(data)"
              size="small" class="confirm-btn" @click="openConfirm(data)" />
            <!-- Tab da_giao_chanh: chỉ hiện tag trạng thái -->
            <Tag v-else-if="activeTab === 'da_giao_chanh'" value="Đã giao" severity="help" />
            <!-- Các tab khác: action cố định -->
            <Button v-else
              :icon="activeTab==='dang_vc' ? 'pi pi-check' : 'pi pi-user-check'"
              :label="currentTab?.action" :severity="currentTab?.severity"
              size="small" class="confirm-btn" @click="openConfirm(data)" />
          </template>
        </Column>

        <template #empty>
          <div class="table-empty">
            <i class="pi pi-inbox" style="font-size:2rem;color:#94a3b8;"></i>
            <p>Không có biên nhận nào ở trạng thái này</p>
          </div>
        </template>
      </DataTable>

      <!-- ─── Pagination Bar [B8] ─────────────────────────────────────── -->
      <div v-if="pagination.totalPages > 1" class="page-pagination">
        <span>
          Trang {{ pagination.page }}/{{ pagination.totalPages }}
          · {{ pagination.total }} biên nhận
        </span>
        <div class="pagi-controls">
          <Button icon="pi pi-angle-double-left" text size="small" rounded
            :disabled="pagination.page <= 1"
            @click="page = 1; loadData()" />
          <Button icon="pi pi-angle-left" text size="small" rounded
            :disabled="pagination.page <= 1"
            @click="page--; loadData()" />
          <span style="font-size:0.8rem; padding: 0 0.25rem;">{{ pagination.page }}</span>
          <Button icon="pi pi-angle-right" text size="small" rounded
            :disabled="pagination.page >= pagination.totalPages"
            @click="page++; loadData()" />
          <Button icon="pi pi-angle-double-right" text size="small" rounded
            :disabled="pagination.page >= pagination.totalPages"
            @click="page = pagination.totalPages; loadData()" />
        </div>
      </div>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: CONFIRM SINGLE ITEM                                   -->
    <!-- ===================================================================== -->
    <!-- ═══ CONFIRM ĐƠN LẺ ═══ -->
    <Dialog v-model:visible="confirmDialogVisible"
      :header="activeTab === 'da_den_kho' && confirmTarget ? getActionLabelForBN(confirmTarget) : currentTab?.action"
      :modal="true" :style="{ width: '420px' }">
      <div v-if="confirmTarget" class="confirm-info">
        <div class="confirm-row"><span class="confirm-lbl">Mã BN:</span><strong class="confirm-val">{{ confirmTarget.ma_so }}</strong></div>
        <div class="confirm-row"><span class="confirm-lbl">Tuyến:</span>
          <span class="confirm-val">{{ confirmTarget.van_phong_gui?.ma_vp }} → {{ confirmTarget.van_phong_nhan?.ma_vp }}</span>
        </div>
        <!-- [NT-01] Info box nội thành -->
        <div v-if="isNoiThanhBN(confirmTarget)" class="confirm-noi-thanh-info">
          <i class="pi pi-map-marker"></i>
          Đơn nội thành — tiếp nhận và giao trong cùng văn phòng
        </div>
        <!-- Thông tin Chành nổi bật khi bàn giao -->
        <div v-if="confirmTarget.chanh && activeTab === 'da_den_kho'" class="confirm-chanh-panel">
          <i class="pi pi-send"></i>
          <div>
            <strong>{{ confirmTarget.chanh.ten }}</strong>
            <span v-if="confirmTarget.chanh.dien_thoai"> — ĐT: {{ confirmTarget.chanh.dien_thoai }}</span>
            <span v-if="confirmTarget.chanh.dia_chi"><br>Địa chỉ: {{ confirmTarget.chanh.dia_chi }}</span>
            <span v-if="confirmTarget.chanh.nguoi_lien_he"><br>NLH: {{ confirmTarget.chanh.nguoi_lien_he }}</span>
          </div>
        </div>
        <div class="confirm-row"><span class="confirm-lbl">Người nhận:</span>
          <span class="confirm-val">{{ confirmTarget.don_vi_nhan || confirmTarget.nguoi_nhan || '—' }}</span>
        </div>
        <div class="confirm-row"><span class="confirm-lbl">Hàng hóa:</span>
          <span class="confirm-val">{{ confirmTarget.ten_hang_hoa || '—' }}</span>
        </div>
        <!-- Warning thu cước từ người nhận -->
        <div v-if="getNextStateForBN(confirmTarget) === 'khach_da_nhan' && confirmTarget.trang_thai_cuoc_nhan === 'cho_thu'"
             class="confirm-cuoc-warn">
          <i class="pi pi-wallet"></i>
          <div>
            <strong>Thu cước từ người nhận: {{ formatCurrency(confirmTarget.gia_cuoc) }}</strong>
            <span v-if="Number(confirmTarget.thu_ho) > 0">
              + COD: {{ formatCurrency(confirmTarget.thu_ho) }}
              = Tổng thu: {{ formatCurrency(Number(confirmTarget.gia_cuoc) + Number(confirmTarget.thu_ho)) }}
            </span>
            <br><small>Cước và COD sẽ tự động được thu khi xác nhận</small>
          </div>
        </div>
        <div v-else-if="Number(confirmTarget.thu_ho) > 0" class="confirm-cod-warn">
          <i class="pi pi-exclamation-circle"></i>
          COD: <strong>{{ formatCurrency(confirmTarget.thu_ho) }}</strong>
          <span v-if="getNextStateForBN(confirmTarget) === 'khach_da_nhan'"> — sẽ tự động thu COD</span>
        </div>
        <div class="confirm-ghi-chu">
          <label class="confirm-lbl">Ghi chú (tùy chọn):</label>
          <InputText v-model="confirmGhiChu" placeholder="Nhập ghi chú..." fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="confirmDialogVisible = false" />
        <Button
          :label="(activeTab === 'da_den_kho' && confirmTarget ? getActionLabelForBN(confirmTarget) : currentTab?.action)"
          icon="pi pi-check"
          :severity="activeTab === 'da_den_kho' && confirmTarget ? getActionSeverityForBN(confirmTarget) : currentTab?.severity"
          size="small" :loading="confirming" @click="confirmSingle" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: BATCH CONFIRM ITEMS                                   -->
    <!-- ===================================================================== -->
    <!-- ═══ BATCH CONFIRM ═══ -->
    <Dialog v-model:visible="batchConfirmVisible" :header="currentTab?.action + ' hàng loạt'" :modal="true" :style="{ width: '460px' }">
      <p style="font-size:0.87rem;margin-bottom:0.6rem;">
        Xác nhận <strong>{{ batchSelected.length }}</strong> biên nhận?
      </p>
      <div class="batch-list">
        <div v-for="bn in batchSelected" :key="bn.id" class="batch-item">
          <strong>{{ bn.ma_so }}</strong>
          <span>{{ bn.don_vi_nhan || bn.nguoi_nhan || '—' }}</span>
          <div style="display:flex;gap:3px;align-items:center;">
            <span v-if="activeTab === 'da_den_kho'" style="font-size:0.7rem; font-weight:600; color:var(--primary-color);">
              → {{ getActionLabelForBN(bn) }}
            </span>
            <span v-if="Number(bn.thu_ho) > 0" class="cod-badge" style="font-size:0.68rem;">COD</span>
            <span v-if="bn.trang_thai_cuoc_nhan === 'cho_thu'" class="cuoc-nhan-badge" style="font-size:0.68rem;">CƯỚC</span>
          </div>
        </div>
      </div>
      <!-- [Fix #4] Thêm input ghi chú cho batch confirm -->
      <div class="confirm-ghi-chu" style="margin-top:0.75rem;">
        <label class="confirm-lbl">Ghi chú (tùy chọn):</label>
        <InputText v-model="batchGhiChu" placeholder="Nhập ghi chú chung cho lô hàng..." fluid />
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small"
          @click="batchConfirmVisible = false; batchGhiChu = ''" />
        <Button :label="currentTab?.action + ' ' + batchSelected.length + ' BN'"
          icon="pi pi-check" :severity="currentTab?.severity" size="small" :loading="batchConfirming" @click="confirmBatch" />
      </template>
    </Dialog>

    <!-- ===================================================================== -->
    <!-- MARK: - DIALOG: XAC NHAN THU TIEN CHANH                               -->
    <!-- ===================================================================== -->
    <Dialog v-model:visible="chanhPayDialogVisible" header="Xác nhận thu tiền từ Chành" :modal="true" :style="{ width: '440px' }">
      <div v-if="chanhPayTarget" class="confirm-info">
        <div class="confirm-row"><span class="confirm-lbl">Mã BN:</span><strong class="confirm-val">{{ chanhPayTarget.ma_so }}</strong></div>
        <div class="confirm-row"><span class="confirm-lbl">Chành:</span><span class="confirm-val">{{ chanhPayTarget.chanh?.ten || '—' }}</span></div>
        <div class="confirm-row"><span class="confirm-lbl">Người nhận:</span>
          <span class="confirm-val">{{ chanhPayTarget.don_vi_nhan || chanhPayTarget.nguoi_nhan || '—' }}</span>
        </div>
        <!-- Danh sách khoản sẽ thu -->
        <div class="chanh-pay-summary">
          <p style="font-weight:700;margin-bottom:.5rem;font-size:.83rem;">Các khoản sẽ xác nhận:</p>
          <div v-if="Number(chanhPayTarget.thu_ho) > 0 && chanhPayTarget.trang_thai_cod === 'cho_thu'" class="pay-item">
            <i class="pi pi-money-bill" style="color:#7c3aed;"></i>
            <span>COD: <strong>{{ formatCurrency(chanhPayTarget.thu_ho) }}</strong></span>
            <span class="pay-note">→ Ghi nhận Chành đã thu (tiền vẫn ở chành)</span>
          </div>
          <div v-if="chanhPayTarget.trang_thai_cuoc_nhan === 'cho_thu'" class="pay-item">
            <i class="pi pi-wallet" style="color:#16a34a;"></i>
            <span>Cước nhận: <strong>{{ formatCurrency(chanhPayTarget.gia_cuoc) }}</strong></span>
            <span class="pay-note">→ Đánh dấu đã thu cước</span>
          </div>
          <div v-if="!chanhHasPending(chanhPayTarget)" style="color:var(--text-muted);font-size:.82rem;">
            Không có khoản nào cần thu.
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Hủy" severity="secondary" text size="small" @click="chanhPayDialogVisible = false" />
        <Button label="Xác nhận" icon="pi pi-check" severity="success" size="small"
          :loading="confirmingChanhPay" :disabled="!chanhPayTarget || !chanhHasPending(chanhPayTarget)"
          @click="confirmChanhPayment" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES (HangDen-specific — chỉ giữ lại styles không có trong base.css)
   Các class global (page-shell, stats-row, stat-card, tab-bar, tab-btn,
   page-toolbar, batch-bar, confirm-info, ma-so-cell, cod-badge, no-val, v.v.)
   đã được định nghĩa trong assets/styles/base.css.
   ============================================================================ */

/* ─── Page Layout ─────────────────────────────────────────────── */
.hd-page { display: flex; flex-direction: column; height: calc(100vh - var(--header-height) - var(--content-padding) * 2); gap: 0.5rem; }

/* ─── Header ────────────────────────────────────────────────────── */
.hd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.hd-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.hd-header-left h1 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--secondary);
  margin: 0;
  white-space: nowrap;
}

.hd-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ─── Table & Toolbar ───────────────────────────────────────────── */
.hd-table   { flex: 1; overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.hd-toolbar { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }

/* ─── Tab bar active variant (HangDen dùng nền đậm hơn) ─────────── */
.tab-btn.active { background: var(--primary); color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
.tab-btn.active .tab-badge { background: rgba(255,255,255,0.3); color: white; }

/* ─── sender-cell alias của person-cell ─────────────────────────── */
.sender-cell { display: flex; flex-direction: column; gap: 0.05rem; }
.sender-cell .name  { font-size: 0.82rem; font-weight: 600; color: var(--secondary); }
.sender-cell .sub   { font-size: 0.72rem; color: var(--text-muted); }
.sender-cell .phone { font-size: 0.72rem; color: #2563eb; }

/* ─── Hình thức giao tags (tab Tại kho) ─────────────────────────── */
.ht-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 0.68rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.ht-chanh    { background: #ede9fe; color: #7c3aed; }
.ht-tan-noi  { background: #fef3c7; color: #d97706; }
.ht-tu-toi   { background: #dcfce7; color: #15803d; }
.ht-goi-dien { background: #dbeafe; color: #1d4ed8; }

/* ─── Cột thu tiền Chành ─────────────────────────────────────────── */
.chanh-fin-cell { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.15rem 0; }
.fin-row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.fin-icon { font-size: 0.72rem; color: var(--text-muted); flex-shrink: 0; }
.fin-amount { font-size: 0.8rem; font-weight: 700; color: var(--secondary); }
.fin-tag { font-size: 0.65rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; }
.fin-tag--pending { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.fin-tag--ok      { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
.fin-tag--done    { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.chanh-pay-btn { font-size: 0.75rem !important; margin-top: 0.15rem; }
.chanh-done-label { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #16a34a; font-weight: 600; }

/* ─── Dialog xác nhận thu tiền chành ─────────────────────────────── */
.chanh-pay-summary { background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 0.75rem; margin: 0.5rem 0 0.25rem; }
.pay-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; padding: 0.25rem 0; flex-wrap: wrap; }
.pay-item + .pay-item { border-top: 1px solid var(--border-light); }
.pay-note { font-size: 0.73rem; color: var(--text-muted); font-style: italic; }

/* ─── Chanh info panel in confirm dialog ─────────────────────────── */
.confirm-chanh-panel { display: flex; align-items: flex-start; gap: 0.6rem; background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 8px; padding: 0.6rem 0.75rem; margin: 0.4rem 0 0.6rem; font-size: 0.82rem; color: #4c1d95; }
.confirm-chanh-panel i { font-size: 1rem; margin-top: 1px; flex-shrink: 0; color: #7c3aed; }
.confirm-chanh-panel strong { font-weight: 700; }
.confirm-chanh-panel .panel-mini { font-size: 0.65rem; font-weight: 700; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; font-size: 0.65rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; white-space: nowrap; }

/* ─── Warning thu cước trong confirm dialog ─────────────────────── */
.confirm-cuoc-warn { display: flex; align-items: flex-start; gap: 0.6rem; background: #fffbeb; border: 1px solid #fcd34d; border-left: 3px solid #f59e0b; border-radius: 8px; padding: 0.65rem 0.75rem; margin: 0.4rem 0 0.6rem; font-size: 0.82rem; color: #78350f; }
.confirm-cuoc-warn i { font-size: 1rem; margin-top: 1px; flex-shrink: 0; color: #f59e0b; }
.confirm-cuoc-warn strong { font-weight: 700; }
.confirm-cuoc-warn small { font-size: 0.75rem; opacity: 0.8; margin-top: 2px; display: block; }

/* ─── Nội thành badge ───────────────────────────────────────────── */
.nt-mini-badge { display: inline-block; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.04em; color: #15803d; background: #dcfce7; border: 1px solid #86efac; padding: 0.05rem 0.3rem; border-radius: 3px; margin-left: 3px; vertical-align: middle; cursor: default; line-height: 1.4; }
.confirm-noi-thanh-info { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 500; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.35rem 0.6rem; border-radius: var(--radius-sm, 6px); }
.confirm-noi-thanh-info i { font-size: 0.78rem; flex-shrink: 0; }

/* ─── Row highlight ─────────────────────────────────────────────── */
:deep(.row-has-cod) { background: #fffbeb !important; border-left: 2px solid #f59e0b; }
:deep(.row-has-cod:hover td) { background: #fef3c7 !important; }
</style>