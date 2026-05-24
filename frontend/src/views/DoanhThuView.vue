<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import { use }            from 'echarts/core';
import { CanvasRenderer }  from 'echarts/renderers';
import { BarChart }        from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';

// Đăng ký các ECharts components cần thiết (bắt buộc với vue-echarts v6+)
use([CanvasRenderer, BarChart, TooltipComponent, LegendComponent, GridComponent]);
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatNumber, toISODate } from '../utils/format';

const toast = useToast();

// ── Filter state ─────────────────────────────
const now = new Date();
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const today        = now;

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

function toLocalDateStr(d) {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    if (from.value)  params.from = toISODate(from.value);
    if (to.value)    params.to   = toISODate(to.value);
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

function setNhom(value) {
  nhom.value = value;
  const now = new Date();
  switch (value) {
    case 'ngay':
      from.value = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to.value   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'tuan': {
      const day = now.getDay() || 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      from.value = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
      to.value   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case 'thang':
      from.value = new Date(now.getFullYear(), now.getMonth(), 1);
      to.value   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'nam':
      from.value = new Date(now.getFullYear(), 0, 1);
      to.value   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
  }
}

// ── Chart config ─────────────────────────────
const chartOption = computed(() => {
  if (!chiTiet.value.length) return null;
  return {
    tooltip: { trigger: 'axis', formatter: (params) => {
      let html = `<b>${params[0].name}</b><br/>`;
      for (const p of params) {
        html += `${p.marker} ${p.seriesName}: <b>${Number(p.value || 0).toLocaleString('vi-VN')}đ</b><br/>`;
      }
      return html;
    }},
    legend: { data: ['Tổng cước', 'Đã thu'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 60, right: 20, top: 16, bottom: 40 },
    xAxis: { type: 'category', data: chiTiet.value.map(d => d.key), axisLabel: { fontSize: 10, rotate: chiTiet.value.length > 10 ? 30 : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v) => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v } },
    series: [
      { name: 'Tổng cước', type: 'bar', data: chiTiet.value.map(d => d.tong_cuoc), itemStyle: { color: '#2a4f8a', borderRadius: [3,3,0,0] }, barMaxWidth: 28 },
      { name: 'Đã thu', type: 'bar', data: chiTiet.value.map(d => d.da_thu), itemStyle: { color: '#16a34a', borderRadius: [3,3,0,0] }, barMaxWidth: 28 },
    ],
  };
});

onMounted(async () => {
  await fetchVanPhong();
  await fetchReport();
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Báo cáo doanh thu" icon="pi pi-chart-line" />

    <div class="card">
      <!-- Filter row -->
      <div class="filter-section">
        <label>Từ ngày</label>
        <DatePicker v-model="from" dateFormat="dd/mm/yy" showIcon style="width: 140px;" />

        <label class="filter-spacer">Đến ngày</label>
        <DatePicker v-model="to" dateFormat="dd/mm/yy" showIcon style="width: 140px;" />

        <label class="filter-spacer">VP gửi</label>
        <select v-model="vpId" style="width: 160px;">
          <option value="">Tất cả</option>
          <option v-for="vp in vanPhongs" :key="vp.id" :value="vp.id">{{ vp.ma_vp }} — {{ vp.ten }}</option>
        </select>

        <label class="filter-spacer">Nhóm theo</label>
        <div class="seg-group">
          <button :class="['seg-btn', { active: nhom === 'ngay' }]"  @click="setNhom('ngay')">Ngày</button>
          <button :class="['seg-btn', { active: nhom === 'tuan' }]"  @click="setNhom('tuan')">Tuần</button>
          <button :class="['seg-btn', { active: nhom === 'thang' }]" @click="setNhom('thang')">Tháng</button>
          <button :class="['seg-btn', { active: nhom === 'nam' }]"   @click="setNhom('nam')">Năm</button>
        </div>

        <Button label="Xem" icon="pi pi-search" style="margin-left: auto;" :loading="loading" @click="fetchReport" />
      </div>

      <!-- Stat cards -->
      <div v-if="tongHop" class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1rem;">
        <StatCard icon="pi pi-inbox"               label="Số biên nhận"   :value="fmt(tongHop.so_bn) + ' BN'"                              variant="info" />
        <StatCard icon="pi pi-wallet"              label="Tổng doanh thu" :value="fmt(tongHop.tong_cuoc) + 'đ'"                             variant="gold" />
        <StatCard icon="pi pi-check-circle"        label="Đã thu"         :value="fmt(tongHop.da_thu) + 'đ'"                                variant="success" />
        <StatCard icon="pi pi-exclamation-triangle" label="Chưa thu + Nợ" :value="fmt(tongHop.chua_thu + tongHop.cong_no) + 'đ'"            variant="danger" />
      </div>

      <!-- Chart -->
      <div v-if="chartOption" class="chart-wrap">
        <VChart :option="chartOption" autoresize style="height: 220px;" />
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

        <Column field="key" header="Kỳ" style="font-weight:600; white-space: nowrap;" />

        <Column header="Số BN" style="width:80px; text-align:right;">
          <template #body="{ data }">
            <span class="fw-600">{{ data.so_bn }}</span>
          </template>
        </Column>

        <Column header="Tổng cước" style="width:130px; text-align:right;">
          <template #body="{ data }">
            <span class="fw-700 text-heading">{{ fmt(data.tong_cuoc) }}đ</span>
          </template>
        </Column>

        <Column header="Đã thu" style="width:120px; text-align:right;">
          <template #body="{ data }">
            <span class="text-success fw-600">{{ fmt(data.da_thu) }}đ</span>
          </template>
        </Column>

        <Column header="Chưa thu" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span :class="data.chua_thu > 0 ? 'text-warning' : 'text-muted'">{{ fmt(data.chua_thu) }}đ</span>
          </template>
        </Column>

        <Column header="Công nợ" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span :class="[data.cong_no > 0 ? 'text-danger fw-700' : 'text-muted']">
              {{ fmt(data.cong_no) }}đ
            </span>
          </template>
        </Column>

        <Column header="Thu hộ" style="width:110px; text-align:right;">
          <template #body="{ data }">
            <span class="text-navy">{{ fmt(data.thu_ho) }}đ</span>
          </template>
        </Column>
      </DataTable>

      <!-- Footer tổng cộng -->
      <div v-if="tongHop && chiTiet.length" class="summary-footer">
        <span>{{ fmt(tongHop.so_bn) }} biên nhận</span>
        <span>Tổng: <span class="text-heading">{{ fmt(tongHop.tong_cuoc) }}đ</span></span>
        <span class="text-success">Đã thu: {{ fmt(tongHop.da_thu) }}đ</span>
        <span class="text-warning">Chưa thu: {{ fmt(tongHop.chua_thu) }}đ</span>
        <span class="text-danger">Công nợ: {{ fmt(tongHop.cong_no) }}đ</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Segmented control buttons */
.seg-group {
  display: flex;
}

.seg-btn {
  padding: 0.38rem 0.85rem;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  outline: none;
}

.seg-btn:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
.seg-btn:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.seg-btn:not(:first-child) { border-left: none; }

.seg-btn.active {
  background: var(--navy-500);
  color: #fff;
  border-color: var(--navy-500);
}

.seg-btn:not(.active):hover {
  background: var(--bg-sunken);
}

/* Chart container */
.chart-wrap {
  margin-bottom: 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 0.5rem;
  background: var(--bg-base);
}

/* Summary footer */
.summary-footer {
  display: flex;
  gap: 2rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-sunken);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 700;
  border: 1px solid var(--border);
}
</style>
