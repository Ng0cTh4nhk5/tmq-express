<script setup>
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

// ── Tab state ──────────────────────────────────────────────────────
const activeTab = ref('dang_vc');
const TABS = [
  { key: 'dang_vc',      label: 'Đang đến',    icon: 'pi pi-truck',        action: 'Xác nhận đến kho', nextState: 'da_den_kho',    severity: 'success', ghiChuDefault: 'Hàng đã đến kho',      allowBatch: true },
  { key: 'da_den_kho',   label: 'Tại kho',      icon: 'pi pi-building',     action: null,               nextState: null,            severity: null,      ghiChuDefault: null,                    allowBatch: false },
  { key: 'da_bao_khach', label: 'Đã báo khách', icon: 'pi pi-phone',        action: 'Khách đã nhận',    nextState: 'khach_da_nhan', severity: 'success', ghiChuDefault: 'Khách đã nhận hàng',    allowBatch: true },
  { key: 'dang_giao',    label: 'Đang giao',    icon: 'pi pi-car',          action: 'Khách đã nhận',    nextState: 'khach_da_nhan', severity: 'success', ghiChuDefault: 'Khách đã nhận hàng',    allowBatch: true },
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

// ── Data ──────────────────────────────────────────────────────────
const items = ref([]);
const stats = ref({ total: 0, tong_cuoc: 0, so_co_cod: 0 });
const tabCounts = ref({ dang_vc: 0, da_den_kho: 0, da_bao_khach: 0, dang_giao: 0 });
const hasMore = ref(false); // [HD-01] flag: có hơn 500 BN chưa hiển thị
const loading = ref(false);
const vanPhongs = ref([]);
const selectedVpNhan = ref(null);
const searchText = ref('');
const filterVpGui = ref(null);
const filterChanh = ref(null);

// [NT-01] Nhận diện đơn nội thành: VP gửi = VP nhận
function isNoiThanhBN(bn) {
  return bn.van_phong_gui_id === bn.van_phong_nhan_id;
}

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

// ── Auto-refresh ───────────────────────────────────────────────────
const refreshCountdown = ref(60);
let refreshTimer = null;
let countdownTimer = null;

// ── Computed ───────────────────────────────────────────────────────
const isAdminOrAccountant = computed(() => auth.isAdmin || auth.isAccountant);

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
  return result;
});

// [Bonus] displayStats — phản ánh đúng filter đang active
const isFiltered = computed(() => filterVpGui.value || filterChanh.value || searchText.value.trim());
const displayStats = computed(() => {
  if (!isFiltered.value) return stats.value;
  return {
    total:     filteredItems.value.length,
    tong_cuoc: filteredItems.value.reduce((s, b) => s + Number(b.gia_cuoc || 0), 0),
    so_co_cod: filteredItems.value.filter(b => Number(b.thu_ho) > 0).length,
  };
});

// ── Load VPs ──────────────────────────────────────────────────────
async function loadVanPhongs() {
  if (!isAdminOrAccountant.value) return;
  try {
    const { data: res } = await api.get('/van-phong?active=true');
    vanPhongs.value = res.data.map(v => ({ label: `${v.ma_vp} — ${v.ten}`, value: v.id }));
  } catch { vanPhongs.value = []; }
}

// ── Load data ──────────────────────────────────────────────────────
async function loadData() {
  if (isAdminOrAccountant.value && !selectedVpNhan.value) {
    items.value = []; stats.value = { total: 0, tong_cuoc: 0, so_co_cod: 0 };
    tabCounts.value = { dang_vc: 0, da_den_kho: 0, da_bao_khach: 0 }; hasMore.value = false;
    return;
  }
  loading.value = true;
  try {
    const params = { trang_thai: activeTab.value };
    if (isAdminOrAccountant.value) params.vp_nhan_id = selectedVpNhan.value;
    const { data: res } = await api.get('/bien-nhan/hang-den', { params });
    items.value = res.data;
    stats.value = res.stats;
    hasMore.value = res.has_more ?? false;
    if (res.tab_counts) {
      tabCounts.value = res.tab_counts;
      hangDenStore.setFromTabCounts(res.tab_counts); // [N-L04] Update badge ngay, không cần fetchCount() thêm
    }
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải danh sách');
  } finally {
    loading.value = false;
  }
}

// ── Tab switch ─────────────────────────────────────────────────────
// [Fix #3] Giữ searchText khi switch tab; chỉ reset filter VP/Chành
async function switchTab(tabKey) {
  if (activeTab.value === tabKey) return;
  activeTab.value = tabKey;
  batchSelected.value = [];
  filterVpGui.value = null;
  filterChanh.value = null;
  syncTabToUrl(tabKey); // [Fix #6]
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
    const ids = batchSelected.value.map(b => b.id);
    await api.patch('/bien-nhan/batch-trang-thai', {
      ids,
      trang_thai: nextState,
      ghi_chu: batchGhiChu.value.trim() || `Batch ${action}: ${ids.length} biên nhận`, // [Fix #4]
    });
    toast.add({ severity: 'success', summary: 'Thành công', detail: `Đã cập nhật ${ids.length} biên nhận`, life: 4000 });
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
onMounted(async () => {
  // [Fix #6] Restore activeTab từ URL khi mount
  const tabFromUrl = new URLSearchParams(window.location.search).get('tab');
  if (tabFromUrl && TABS.some(t => t.key === tabFromUrl)) activeTab.value = tabFromUrl;
  await loadVanPhongs();
  await loadData();
  startTimers();
});
onUnmounted(() => { clearInterval(refreshTimer); clearInterval(countdownTimer); });

// [Fix N2] Cleanup batchSelected khi filter thay đổi — tránh confirm BN không còn visible
watch([filterVpGui, filterChanh, searchText], () => {
  const visibleIds = new Set(filteredItems.value.map(b => b.id));
  batchSelected.value = batchSelected.value.filter(b => visibleIds.has(b.id));
});
</script>

<template>
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

    <!-- ═══ TAB BAR ═══ -->
    <div class="tab-bar">
      <button v-for="tab in TABS" :key="tab.key"
        class="tab-btn" :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)">
        <i :class="tab.icon"></i>
        <span>{{ tab.label }}</span>
        <span v-if="tabCounts[tab.key] > 0" class="tab-badge" :class="tab.key">
          {{ tabCounts[tab.key] }}
        </span>
      </button>
    </div>

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

    <!-- ═══ EMPTY (admin chưa chọn VP) ═══ -->
    <div v-if="isAdminOrAccountant && !selectedVpNhan" class="empty-state">
      <i class="pi pi-building empty-icon"></i>
      <p>Chọn văn phòng nhận để xem danh sách</p>
    </div>

    <template v-else>
      <!-- ═══ TOOLBAR ═══ -->
      <div class="hd-toolbar">
        <div class="toolbar-row">
          <IconField class="search-wrap">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchText" placeholder="Tìm mã BN, người gửi/nhận, chành..." class="search-input" />
          </IconField>
          <Select v-model="filterVpGui" :options="vpGuiOptions" optionLabel="label" optionValue="value"
            class="filter-select" placeholder="Lọc chi nhánh gửi..." />
          <Select v-model="filterChanh" :options="chanhOptions" optionLabel="label" optionValue="value"
            class="filter-select filter-chanh" placeholder="Lọc chành..." />
          <Button v-if="batchSelected.length > 0 && currentTab?.allowBatch"
            :label="`${currentTab?.action} ${batchSelected.length} BN`"
            icon="pi pi-check-circle" :severity="currentTab?.severity" size="small"
            @click="openBatchConfirm" />

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
            <span v-else class="no-cod">—</span>
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
        <Column frozen alignFrozen="right" style="min-width:130px;text-align:center;">
          <template #header>
            <span style="font-size:0.75rem;">{{ activeTab === 'da_den_kho' ? 'Hành động' : currentTab?.action }}</span>
          </template>
          <template #body="{ data }">
            <!-- Tab da_den_kho: mỗi BN có action riêng -->
            <Button v-if="activeTab === 'da_den_kho'"
              :label="getActionLabelForBN(data)"
              :severity="getActionSeverityForBN(data)"
              size="small" class="confirm-btn" @click="openConfirm(data)" />
            <!-- Các tab khác: action cố định -->
            <Button v-else
              :icon="activeTab==='dang_vc' ? 'pi pi-check' : activeTab==='dang_giao' ? 'pi pi-user-check' : 'pi pi-user-check'"
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
    </template>

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
          :label="'✓ ' + (activeTab === 'da_den_kho' && confirmTarget ? getActionLabelForBN(confirmTarget) : currentTab?.action)"
          :severity="activeTab === 'da_den_kho' && confirmTarget ? getActionSeverityForBN(confirmTarget) : currentTab?.severity"
          size="small" :loading="confirming" @click="confirmSingle" />
      </template>
    </Dialog>

    <!-- ═══ BATCH CONFIRM ═══ -->
    <Dialog v-model:visible="batchConfirmVisible" :header="currentTab?.action + ' hàng loạt'" :modal="true" :style="{ width: '460px' }">
      <p style="font-size:0.87rem;margin-bottom:0.6rem;">
        Xác nhận <strong>{{ batchSelected.length }}</strong> biên nhận?
      </p>
      <div class="batch-list">
        <div v-for="bn in batchSelected" :key="bn.id" class="batch-item">
          <strong>{{ bn.ma_so }}</strong>
          <span>{{ bn.don_vi_nhan || bn.nguoi_nhan || '—' }}</span>
          <div style="display:flex;gap:3px;">
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
        <Button :label="'✓ ' + currentTab?.action + ' ' + batchSelected.length + ' BN'"
          :severity="currentTab?.severity" size="small" :loading="batchConfirming" @click="confirmBatch" />
      </template>
    </Dialog>

  </div>
</template>

<style scoped>
/* ─── Hình thức giao tags (tab Tại kho) ─────────────────────────── */
.ht-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.68rem; font-weight: 600; padding: 2px 6px;
  border-radius: 4px; white-space: nowrap;
}
.ht-chanh    { background: #ede9fe; color: #7c3aed; }
.ht-tan-noi  { background: #fef3c7; color: #d97706; }
.ht-tu-toi   { background: #dcfce7; color: #15803d; }
.ht-goi-dien { background: #dbeafe; color: #1d4ed8; }

/* ─── Chanh info panel in confirm dialog ─────────────────────────── */
.confirm-chanh-panel {
  display: flex; align-items: flex-start; gap: 0.6rem;
  background: #ede9fe; border: 1px solid #c4b5fd;
  border-radius: 8px; padding: 0.6rem 0.75rem;
  margin: 0.4rem 0 0.6rem; font-size: 0.82rem;
  color: #4c1d95;
}
.confirm-chanh-panel i { font-size: 1rem; margin-top: 2px; flex-shrink: 0; }
.confirm-chanh-panel strong { font-weight: 700; }

/* ─── Cước chưa thu badge (amber) ────────────────────────────────── */
.cuoc-nhan-badge {
  display: inline-flex; align-items: center; gap: 2px;
  background: #fef3c7; color: #92400e;
  border: 1px solid #fcd34d;
  font-size: 0.65rem; font-weight: 700;
  padding: 2px 5px; border-radius: 4px; white-space: nowrap;
}

/* ─── Warning thu cước trong confirm dialog ─────────────────────── */
.confirm-cuoc-warn {
  display: flex; align-items: flex-start; gap: 0.6rem;
  background: #fffbeb; border: 1px solid #fcd34d;
  border-left: 3px solid #f59e0b;
  border-radius: 8px; padding: 0.65rem 0.75rem;
  margin: 0.4rem 0 0.6rem; font-size: 0.82rem;
  color: #78350f;
}
.confirm-cuoc-warn i { font-size: 1rem; margin-top: 1px; flex-shrink: 0; color: #f59e0b; }
.confirm-cuoc-warn strong { font-weight: 700; }
.confirm-cuoc-warn small { font-size: 0.75rem; opacity: 0.8; margin-top: 2px; display: block; }

/* ─── Page ──────────────────────────────────────────────────────── */
.hd-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - var(--content-padding) * 2);
  gap: 0.5rem;
}

/* ─── Header ────────────────────────────────────────────────────── */
.hd-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; flex-wrap: wrap; gap: 0.5rem; padding: 0.25rem 0; }
.hd-header-left { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.hd-header-left h1 { font-size: 1.1rem; font-weight: 700; color: var(--secondary); margin: 0; }
.header-icon { color: var(--primary); font-size: 1rem; }
.hd-header-right { display: flex; align-items: center; gap: 0.5rem; }
.vp-select { min-width: 200px; font-size: 0.82rem; }
.vp-badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); background: var(--bg-hover); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); }
.refresh-info { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; min-width: 48px; transition: color 0.3s; }
.refresh-info.almost { color: #f97316; font-weight: 600; }

/* ─── Tab bar ───────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.25rem;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: calc(var(--radius) - 2px);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.tab-btn:hover { background: var(--bg-hover); color: var(--secondary); }
.tab-btn.active { background: var(--primary); color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
.tab-badge {
  min-width: 18px; height: 18px; border-radius: 999px; font-size: 0.65rem; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; padding: 0 5px;
  background: #ef4444; color: white;
}
.tab-btn.active .tab-badge { background: rgba(255,255,255,0.3); color: white; }

/* ─── Stats ─────────────────────────────────────────────────────── */
.stats-row { display: flex; gap: 0.6rem; flex-shrink: 0; }
.stat-card { flex: 1 1 0%; min-width: 0; position: relative; display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 0.9rem; border-radius: var(--radius); background: var(--bg-card); border: 1px solid var(--border); border-left: 3px solid transparent; transition: box-shadow 0.2s; overflow: hidden; }
.stat-card:hover { box-shadow: var(--shadow-sm); }
.stat-total { border-left-color: #3b82f6; }
.stat-money { border-left-color: #22c55e; }
.stat-cod   { border-left-color: #f97316; }
.stat-cod-active { border-left-color: #ef4444; background: #fff8f8; }
.stat-icon { width: 34px; height: 34px; min-width: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; }
.stat-total .stat-icon { background: #eff6ff; color: #2563eb; }
.stat-money .stat-icon { background: #f0fdf4; color: #16a34a; }
.stat-cod   .stat-icon { background: #fff7ed; color: #ea580c; }
.stat-cod-active .stat-icon { background: #fef2f2; color: #dc2626; }
.stat-body { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; flex: 1; }
.stat-value { font-size: 1.05rem; font-weight: 700; color: var(--secondary); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-label { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
.stat-cod-warn { position: absolute; top: 8px; right: 8px; font-size: 0.6rem; font-weight: 700; background: #ef4444; color: white; padding: 0.1rem 0.35rem; border-radius: 4px; text-transform: uppercase; }

/* ─── Has-more warning ──────────────────────────────────────────── */
.has-more-warn { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); flex-shrink: 0; }
.has-more-warn i { color: #d97706; font-size: 0.85rem; }

/* ─── Empty ─────────────────────────────────────────────────────── */
.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: var(--text-muted); }
.empty-icon { font-size: 3rem; opacity: 0.3; }

/* ─── Toolbar ───────────────────────────────────────────────────── */
.hd-toolbar { display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0; }
.toolbar-row { display: flex; align-items: stretch; gap: 0.5rem; flex-wrap: wrap; }
.search-wrap { flex: 1 1 200px; max-width: 300px; display: flex; align-items: center; }
.search-input { width: 100%; font-size: 0.83rem; height: 100%; }
.filter-select { flex: 0 0 180px; font-size: 0.82rem; }
.filter-chanh { flex: 0 0 160px; }
.filter-active-hint { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #2563eb; background: #eff6ff; padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid #bfdbfe; flex-wrap: wrap; }
.clear-filter { background: none; border: none; color: #dc2626; font-size: 0.75rem; cursor: pointer; padding: 0; margin-left: 0.25rem; font-weight: 600; }
.clear-filter:hover { text-decoration: underline; }

/* ─── Table ─────────────────────────────────────────────────────── */
.hd-table { flex: 1; overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.ma-so-cell { font-weight: 700; color: var(--primary); font-size: 0.82rem; }
.vp-tag { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; letter-spacing: 0.03em; }
.chanh-tag { display: inline-block; background: #f3e8ff; color: #7c3aed; font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 4px; }
.sender-cell { display: flex; flex-direction: column; gap: 0.05rem; }
.sender-cell .name { font-size: 0.82rem; font-weight: 600; color: var(--secondary); }
.sender-cell .sub  { font-size: 0.72rem; color: var(--text-muted); }
.sender-cell .phone { font-size: 0.72rem; color: #2563eb; }
.cuoc-val { font-size: 0.82rem; font-weight: 600; }
.cod-badge { display: inline-flex; align-items: center; gap: 0.2rem; background: #fef2f2; color: #dc2626; font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid #fecaca; }
.no-cod { color: var(--text-light); font-size: 0.8rem; }
.confirm-btn { font-size: 0.78rem; white-space: nowrap; }
:deep(.row-has-cod) { background: #fffbeb !important; border-left: 2px solid #f59e0b; }
:deep(.row-has-cod:hover td) { background: #fef3c7 !important; }
.table-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: var(--text-muted); }

/* ─── Confirm dialog ────────────────────────────────────────────── */
.confirm-info { display: flex; flex-direction: column; gap: 0.5rem; }
.confirm-row { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.85rem; }
.confirm-lbl { color: var(--text-muted); font-size: 0.78rem; min-width: 80px; flex-shrink: 0; }
.confirm-val { color: var(--secondary); font-size: 0.85rem; }
.confirm-cod-warn { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; background: #fef2f2; color: #dc2626; padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid #fecaca; flex-wrap: wrap; }
.confirm-ghi-chu { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.25rem; }
.batch-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.3rem 0.5rem; }
.batch-item { display: flex; gap: 0.5rem; align-items: center; font-size: 0.78rem; padding: 0.2rem 0; border-bottom: 1px solid var(--border-light); color: var(--text-muted); }
.batch-item strong { color: var(--secondary); min-width: 100px; }

/* -- [NT-01] Don Noi Thanh ----------------------------------------- */
.nt-mini-badge {
  display: inline-block;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #15803d;
  background: #dcfce7;
  border: 1px solid #86efac;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  margin-left: 3px;
  vertical-align: middle;
  cursor: default;
  line-height: 1.4;
}
.confirm-noi-thanh-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-sm, 6px);
}
.confirm-noi-thanh-info i { font-size: 0.78rem; flex-shrink: 0; }
</style>