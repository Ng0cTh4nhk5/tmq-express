<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();

// ─── Hằng số ──────────────────────────────────────────────────────────────
const COD_STATUS = {
  cho_thu:   { label: 'Chờ thu',    severity: 'warn',    icon: 'pi pi-clock' },
  da_thu:    { label: 'Đã thu',     severity: 'info',    icon: 'pi pi-check' },
  da_chuyen: { label: 'Đã chuyển', severity: 'help',    icon: 'pi pi-send' },
  da_tra:    { label: 'Hoàn tất',  severity: 'success', icon: 'pi pi-check-circle' },
};

const ACTION_MAP = {
  cho_thu:   { label: 'Xác nhận thu',    action: 'xac-nhan-thu',    severity: 'success' },
  da_thu:    { label: 'Xác nhận chuyển', action: 'xac-nhan-chuyen', severity: 'info' },
  da_chuyen: { label: 'Xác nhận trả',   action: 'xac-nhan-tra',    severity: 'warn' },
  da_tra:    null,
};

const STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ thu',   value: 'cho_thu' },
  { label: 'Đã thu',    value: 'da_thu' },
  { label: 'Đã chuyển', value: 'da_chuyen' },
  { label: 'Hoàn tất', value: 'da_tra' },
];

const HINH_THUC_OPTIONS = [
  { label: 'Tiền mặt',     value: 'tien_mat' },
  { label: 'Chuyển khoản', value: 'chuyen_khoan' },
];

// ─── State ────────────────────────────────────────────────────────────────
const data       = ref([]);
const pagination = ref(null);
const summary    = ref(null);
const tongHop    = ref(null);
const loading    = ref(false);
const page       = ref(1);

// Filters
const filterTrangThai = ref('');
const filterFrom      = ref('');
const filterTo        = ref('');
const search          = ref('');

// Dialog xác nhận
const dialogVisible = ref(false);
const selectedBN    = ref(null);
const currentAction = ref('');
const hinhThuc      = ref('tien_mat');
const ghiChu        = ref('');
const confirming    = ref(false);

// ─── API ──────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 20 };
    if (filterTrangThai.value) params.trang_thai_cod = filterTrangThai.value;
    if (filterFrom.value)      params.from = filterFrom.value;
    if (filterTo.value)        params.to   = filterTo.value;
    if (search.value)          params.search = search.value;

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
  } catch (err) {
    // silent — StatCards sẽ hiển thị 0
  }
}

function onSearch() {
  page.value = 1;
  fetchData();
}

// ─── Dialog ───────────────────────────────────────────────────────────────
function openDialog(bn) {
  const actionInfo = ACTION_MAP[bn.trang_thai_cod];
  if (!actionInfo) return;
  selectedBN.value  = bn;
  currentAction.value = actionInfo.action;
  hinhThuc.value    = 'tien_mat';
  ghiChu.value      = '';
  dialogVisible.value = true;
}

const dialogTitle = {
  'xac-nhan-thu':    '✅ Xác nhận thu COD',
  'xac-nhan-chuyen': '📤 Xác nhận chuyển COD về VP gửi',
  'xac-nhan-tra':    '💸 Xác nhận trả COD cho người gửi',
};

async function xacNhan() {
  confirming.value = true;
  try {
    const res = await api.post(`/thu-ho/${selectedBN.value.id}/${currentAction.value}`, {
      hinh_thuc: hinhThuc.value,
      ghi_chu: ghiChu.value || undefined,
    });
    toast.add({ severity: 'success', summary: '✅ Thành công', detail: res.data.message, life: 3000 });
    dialogVisible.value = false;
    await Promise.all([fetchData(), fetchTongHop()]);
  } catch (err) {
    handleApiError(err, toast, 'Lỗi xác nhận COD');
  }
  confirming.value = false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

// ─── Init ─────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchData();
  fetchTongHop();
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Thu hộ (COD)" icon="pi pi-money-bill" />

    <!-- StatCards -->
    <div class="stats-grid" style="margin-bottom: 1rem;">
      <StatCard
        icon="pi pi-clock"
        label="Chờ thu"
        :value="fmt(tongHop?.cho_thu?.total || 0) + 'đ'"
        :subtitle="(tongHop?.cho_thu?.count || 0) + ' biên nhận'"
        gradient="orange"
      />
      <StatCard
        icon="pi pi-check"
        label="Đã thu"
        :value="fmt(tongHop?.da_thu?.total || 0) + 'đ'"
        :subtitle="(tongHop?.da_thu?.count || 0) + ' biên nhận'"
        gradient="blue"
      />
      <StatCard
        icon="pi pi-send"
        label="Đã chuyển"
        :value="fmt(tongHop?.da_chuyen?.total || 0) + 'đ'"
        :subtitle="(tongHop?.da_chuyen?.count || 0) + ' biên nhận'"
        gradient="purple"
      />
      <StatCard
        icon="pi pi-check-circle"
        label="Hoàn tất"
        :value="fmt(tongHop?.da_tra?.total || 0) + 'đ'"
        :subtitle="(tongHop?.da_tra?.count || 0) + ' biên nhận'"
        gradient="green"
      />
    </div>

    <!-- Bộ lọc -->
    <div class="card" style="margin-bottom: 1rem;">
      <div class="bk-filter-row">
        <label class="bk-label">Trạng thái COD</label>
        <Select
          v-model="filterTrangThai"
          :options="STATUS_OPTIONS"
          optionLabel="label"
          optionValue="value"
          style="width: 180px; margin-right: 1rem;"
        />

        <label class="bk-label">Từ ngày</label>
        <input type="date" v-model="filterFrom" class="bk-input" style="width: 140px;" />
        <label class="bk-label" style="margin-left: 0.75rem;">Đến ngày</label>
        <input type="date" v-model="filterTo" class="bk-input" style="width: 140px;" />

        <label class="bk-label" style="margin-left: 0.75rem;">Tìm kiếm</label>
        <InputText
          v-model="search"
          placeholder="Mã BN, tên gửi/nhận..."
          class="bk-input"
          style="width: 200px;"
          @keyup.enter="onSearch"
        />

        <Button label="Xem" icon="pi pi-search" style="margin-left: 1rem;" @click="onSearch" :loading="loading" />
      </div>
    </div>

    <!-- DataTable -->
    <div class="card">
      <DataTable
        :value="data"
        :loading="loading"
        stripedRows
        size="small"
        responsiveLayout="scroll"
      >
        <template #empty>
          <div style="text-align:center; padding:2rem; color:var(--text-muted);">
            <i class="pi pi-money-bill" style="font-size:1.5rem; opacity:.3;"></i>
            <p style="font-size:0.85rem; margin-top:0.5rem;">Không có biên nhận COD nào</p>
          </div>
        </template>

        <Column header="Mã BN" style="width:130px; font-family:monospace; font-weight:600;">
          <template #body="{ data: row }">{{ row.ma_so }}</template>
        </Column>

        <Column header="Ngày" style="width:90px;">
          <template #body="{ data: row }">{{ fmtDate(row.ngay_bien_nhan) }}</template>
        </Column>

        <Column header="Tuyến" style="width:110px;">
          <template #body="{ data: row }">
            <span style="font-size:0.8rem; font-weight:600;">
              {{ row.van_phong_gui?.ma_vp }} → {{ row.van_phong_nhan?.ma_vp }}
            </span>
          </template>
        </Column>

        <Column header="Người gửi">
          <template #body="{ data: row }">
            <span style="font-size:0.82rem;">{{ row.don_vi_gui || row.nguoi_gui || '—' }}</span>
          </template>
        </Column>

        <Column header="Người nhận">
          <template #body="{ data: row }">
            <span style="font-size:0.82rem;">{{ row.don_vi_nhan || row.nguoi_nhan || '—' }}</span>
          </template>
        </Column>

        <Column header="Tiền COD" style="width:130px; text-align:right;">
          <template #body="{ data: row }">
            <span style="font-weight:700; color:#dc2626;">{{ fmt(row.thu_ho) }}đ</span>
          </template>
        </Column>

        <Column header="Trạng thái" style="width:120px; text-align:center;">
          <template #body="{ data: row }">
            <Tag
              v-if="COD_STATUS[row.trang_thai_cod]"
              :value="COD_STATUS[row.trang_thai_cod].label"
              :severity="COD_STATUS[row.trang_thai_cod].severity"
            />
          </template>
        </Column>

        <Column header="Thao tác" style="width:160px; text-align:center;">
          <template #body="{ data: row }">
            <Button
              v-if="ACTION_MAP[row.trang_thai_cod]"
              :label="ACTION_MAP[row.trang_thai_cod].label"
              :severity="ACTION_MAP[row.trang_thai_cod].severity"
              size="small"
              @click="openDialog(row)"
            />
            <Tag v-else value="✅ Hoàn tất" severity="success" />
          </template>
        </Column>
      </DataTable>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total > 20"
        style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem; font-size:0.82rem; color:#64748b;">
        <span>Tổng {{ pagination.total }} biên nhận</span>
        <div style="display:flex; gap:0.5rem;">
          <Button icon="pi pi-chevron-left" text rounded size="small" :disabled="page <= 1" @click="page--; fetchData()" />
          <span style="line-height:2rem;">Trang {{ page }}/{{ pagination.totalPages }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="page >= pagination.totalPages" @click="page++; fetchData()" />
        </div>
      </div>

      <!-- Footer tổng -->
      <div v-if="summary"
        style="display:flex; justify-content:flex-end; gap:1.5rem; margin-top:0.5rem;
               font-size:0.85rem; font-weight:700; padding:0.5rem 0.75rem;
               background:var(--surface-50,#f8fafc); border-radius:6px;">
        <span>{{ summary.count }} biên nhận</span>
        <span style="color:#dc2626;">Tổng COD: {{ fmt(summary.total_thu_ho) }}đ</span>
      </div>
    </div>

    <!-- Dialog xác nhận -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="dialogTitle[currentAction]"
      :style="{ width: '500px' }"
      modal
    >
      <!-- Thông tin BN -->
      <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; font-size: 0.85rem;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
          <span><b>Mã BN:</b></span>
          <span style="font-family:monospace; font-weight:700;">{{ selectedBN?.ma_so }}</span>
          <span><b>Tuyến:</b></span>
          <span>{{ selectedBN?.van_phong_gui?.ma_vp }} → {{ selectedBN?.van_phong_nhan?.ma_vp }}</span>
          <span><b>Người gửi:</b></span>
          <span>{{ selectedBN?.don_vi_gui || selectedBN?.nguoi_gui || '—' }}</span>
          <span><b>Người nhận:</b></span>
          <span>{{ selectedBN?.don_vi_nhan || selectedBN?.nguoi_nhan || '—' }}</span>
          <span><b>Tiền COD:</b></span>
          <span style="font-weight:700; color:#dc2626; font-size:1rem;">{{ fmt(selectedBN?.thu_ho) }}đ</span>
        </div>
      </div>

      <!-- Preview phiếu sẽ tạo -->
      <div style="background:#f1f5f9; padding:0.75rem; border-radius:8px; font-size:0.82rem; margin-bottom:1rem; border-left: 3px solid #2563eb;">
        <p style="font-weight:700; margin-bottom:0.4rem; color:#1e40af;">📄 Phiếu sẽ tự động tạo:</p>
        <p v-if="currentAction === 'xac-nhan-thu'" style="margin:0; color:#475569;">
          • Phiếu <b>thu</b> tại VP <b>{{ selectedBN?.van_phong_nhan?.ten }}</b>
        </p>
        <div v-if="currentAction === 'xac-nhan-chuyen'" style="color:#475569;">
          <p style="margin:0 0 0.25rem;">• Phiếu <b>chi</b> tại VP <b>{{ selectedBN?.van_phong_nhan?.ten }}</b></p>
          <p style="margin:0;">• Phiếu <b>thu</b> tại VP <b>{{ selectedBN?.van_phong_gui?.ten }}</b></p>
        </div>
        <p v-if="currentAction === 'xac-nhan-tra'" style="margin:0; color:#475569;">
          • Phiếu <b>chi</b> tại VP <b>{{ selectedBN?.van_phong_gui?.ten }}</b>
        </p>
      </div>

      <!-- Form -->
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        <div>
          <label class="bk-label">Hình thức thanh toán</label>
          <Select
            v-model="hinhThuc"
            :options="HINH_THUC_OPTIONS"
            optionLabel="label"
            optionValue="value"
            style="width:100%; margin-top:0.25rem;"
          />
        </div>
        <div>
          <label class="bk-label">Ghi chú (tùy chọn)</label>
          <InputText
            v-model="ghiChu"
            style="width:100%; margin-top:0.25rem;"
            placeholder="Ghi chú..."
          />
        </div>
      </div>

      <template #footer>
        <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
          <Button label="Hủy" severity="secondary" @click="dialogVisible = false" />
          <Button
            :label="ACTION_MAP[selectedBN?.trang_thai_cod]?.label || 'Xác nhận'"
            :loading="confirming"
            @click="xacNhan"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.bk-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.bk-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.bk-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 0.85rem;
  color: #1e293b;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.bk-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
</style>
