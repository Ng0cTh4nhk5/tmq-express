<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';

const toast = useToast();

// ── Filter state ─────────────────────────────
const now = new Date();
const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
const today        = now.toISOString().slice(0, 10);

const from   = ref(firstOfMonth);
const to     = ref(today);
const vpId   = ref('');
const nhom   = ref('ngay');

// ── Data state ───────────────────────────────
const loading    = ref(false);
const chiTiet    = ref([]);
const tongHop    = ref(null);
const vanPhongs  = ref([]);

// ── Helpers ──────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

// ── Fetch VP list ─────────────────────────────
async function fetchVanPhong() {
  try {
    const res = await api.get('/van-phong');
    vanPhongs.value = res.data.data;
  } catch {
    // ignore
  }
}

// ── Fetch report ─────────────────────────────
async function fetchReport() {
  loading.value = true;
  try {
    const params = { nhom: nhom.value };
    if (from.value)  params.from = from.value;
    if (to.value)    params.to   = to.value;
    if (vpId.value)  params.van_phong_id = vpId.value;

    const res = await api.get('/doanh-thu', { params });
    chiTiet.value = res.data.data.chi_tiet;
    tongHop.value = res.data.data.tong_hop;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải báo cáo doanh thu');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchVanPhong();
  await fetchReport();
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Báo cáo doanh thu" icon="pi pi-chart-line" />

    <div class="card">
      <!-- Filter row — native HTML to avoid PrimeVue InputGroup CSS merging -->
      <div class="dt-filter-row">
        <label class="dt-label">Từ ngày</label>
        <input type="date" v-model="from" class="dt-input" />

        <label class="dt-label">Đến ngày</label>
        <input type="date" v-model="to" class="dt-input" />

        <label class="dt-label">VP gửi</label>
        <select v-model="vpId" class="dt-select">
          <option value="">Tất cả</option>
          <option v-for="vp in vanPhongs" :key="vp.id" :value="vp.id">{{ vp.ma_vp }} — {{ vp.ten }}</option>
        </select>

        <label class="dt-label">Nhóm theo</label>
        <div class="dt-radio-group">
          <button :class="['dt-radio-btn', { active: nhom === 'ngay' }]"  @click="nhom = 'ngay'">Ngày</button>
          <button :class="['dt-radio-btn', { active: nhom === 'tuan' }]"  @click="nhom = 'tuan'">Tuần</button>
          <button :class="['dt-radio-btn', { active: nhom === 'thang' }]" @click="nhom = 'thang'">Tháng</button>
          <button :class="['dt-radio-btn', { active: nhom === 'nam' }]"   @click="nhom = 'nam'">Năm</button>
        </div>

        <Button label="Xem" icon="pi pi-search" style="margin-left: 1.5rem;" :loading="loading" @click="fetchReport" />
      </div>

      <!-- Stat cards -->
      <div v-if="tongHop" class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1rem;">
        <StatCard icon="pi pi-inbox"               label="Số biên nhận"     :value="fmt(tongHop.so_bn) + ' BN'"     gradient="blue" />
        <StatCard icon="pi pi-wallet"              label="Tổng doanh thu"   :value="fmt(tongHop.tong_cuoc) + 'đ'"   gradient="purple" />
        <StatCard icon="pi pi-check-circle"        label="Đã thu"           :value="fmt(tongHop.da_thu) + 'đ'"      gradient="green" />
        <StatCard icon="pi pi-exclamation-triangle" label="Chưa thu + Nợ" :value="fmt(tongHop.chua_thu + tongHop.cong_no) + 'đ'" gradient="orange" />
      </div>

      <!-- Data table -->
      <DataTable
        :value="chiTiet"
        :loading="loading"
        stripedRows
        size="small"
        responsiveLayout="scroll"
        showGridlines
      >
        <template #empty>
          <div style="text-align:center; padding:2rem; color:var(--text-muted);">
            <i class="pi pi-chart-bar" style="font-size:1.5rem; opacity:.3;"></i>
            <p style="font-size:0.85rem; margin-top:0.5rem;">Chọn khoảng thời gian rồi bấm "Xem"</p>
          </div>
        </template>

        <Column field="key" header="Kỳ" style="font-weight:600; font-family: monospace; white-space: nowrap;" />

        <Column header="Số BN" style="width:80px; text-align:right;">
          <template #body="{ data }">
            <span style="font-weight:600;">{{ data.so_bn }}</span>
          </template>
        </Column>

        <Column header="Tổng cước" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span style="font-weight:700; color:#1e293b;">{{ fmt(data.tong_cuoc) }}đ</span>
          </template>
        </Column>

        <Column header="Đã thu" style="width:120px; text-align:right;">
          <template #body="{ data }">
            <span style="color:#16a34a; font-weight:600;">{{ fmt(data.da_thu) }}đ</span>
          </template>
        </Column>

        <Column header="Chưa thu" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span :style="{ color: data.chua_thu > 0 ? '#d97706' : '#94a3b8' }">{{ fmt(data.chua_thu) }}đ</span>
          </template>
        </Column>

        <Column header="Công nợ" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span :style="{ color: data.cong_no > 0 ? '#dc2626' : '#94a3b8', fontWeight: data.cong_no > 0 ? 700 : 400 }">
              {{ fmt(data.cong_no) }}đ
            </span>
          </template>
        </Column>

        <Column header="Thu hộ" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span style="color:#6366f1;">{{ fmt(data.thu_ho) }}đ</span>
          </template>
        </Column>
      </DataTable>

      <!-- Footer tổng cộng -->
      <div v-if="tongHop && chiTiet.length"
        style="display:flex; gap:2rem; justify-content:flex-end; margin-top:0.5rem;
               padding:0.6rem 0.75rem; background:#f1f5f9; border-radius:6px;
               font-size:0.82rem; font-weight:700; border:1px solid #e2e8f0;">
        <span>{{ fmt(tongHop.so_bn) }} biên nhận</span>
        <span>Tổng: <span style="color:#1e293b;">{{ fmt(tongHop.tong_cuoc) }}đ</span></span>
        <span style="color:#16a34a;">Đã thu: {{ fmt(tongHop.da_thu) }}đ</span>
        <span style="color:#d97706;">Chưa thu: {{ fmt(tongHop.chua_thu) }}đ</span>
        <span style="color:#dc2626;">Công nợ: {{ fmt(tongHop.cong_no) }}đ</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Filter row — native HTML, no PrimeVue to avoid InputGroup border-merge bug */
.dt-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  gap: 0;
}

.dt-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-right: 0.4rem;
  white-space: nowrap;
}

.dt-input,
.dt-select {
  padding: 0.38rem 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  margin-right: 1.5rem;
  outline: none;
  transition: border-color 0.15s;
}

.dt-input:focus,
.dt-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.dt-input[type="date"] { width: 130px; }
.dt-select             { width: 160px; }

/* Nhóm theo buttons — segmented control style */
.dt-radio-group {
  display: flex;
}

.dt-radio-btn {
  padding: 0.38rem 0.85rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 0.8rem;
  font-family: inherit;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  outline: none;
}

.dt-radio-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.dt-radio-btn:last-child {
  border-radius: 0 6px 6px 0;
}

.dt-radio-btn:not(:first-child) {
  border-left: none;
}

.dt-radio-btn.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.dt-radio-btn:not(.active):hover {
  background: #f1f5f9;
}
</style>
