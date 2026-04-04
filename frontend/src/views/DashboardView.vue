<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';

use([BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const stats = ref({ bn_hom_nay: 0, tong_bn: 0, doanh_thu_thang: 0, cong_no_ton: 0, so_cong_no: 0 });
const barOption = ref({});
const pieOption = ref({});
const lineOption = ref({});
const lastUpdated = ref('');
let refreshTimer = null;

function fmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

async function fetchAll() {
  try {
    const [sRes, dtRes, tlRes, tcRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/doanh-thu-7-ngay'),
      api.get('/dashboard/ty-le-tuyen'),
      api.get('/dashboard/thu-chi-theo-thang'),
    ]);

    stats.value = sRes.data.data;
    lastUpdated.value = new Date().toLocaleTimeString('vi-VN');

    // Bar chart — Doanh thu 7 ngày
    const dt = dtRes.data.data;
    barOption.value = {
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}<br/>Doanh thu: ${fmt(p[0].value)}đ<br/>BN: ${dt[p[0].dataIndex].so_bn}` },
      grid: { left: 55, right: 12, bottom: 24, top: 20 },
      xAxis: { type: 'category', data: dt.map(d => d.label), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'tr' : v >= 1e3 ? (v / 1e3) + 'K' : v } },
      series: [{
        type: 'bar', data: dt.map(d => d.doanh_thu), barWidth: '60%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1d4ed8' }] } },
      }],
    };

    // Pie chart — Tỷ lệ tuyến
    const tl = tlRes.data.data;
    pieOption.value = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} BN ({d}%)' },
      legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['38%', '68%'], center: ['50%', '42%'],
        data: tl.map(t => ({ name: t.tuyen, value: t.so_bn })),
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } },
        label: { show: false },
      }],
    };

    // Line chart — Thu chi theo tháng
    const tc = tcRes.data.data;
    lineOption.value = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Thu', 'Chi'], bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      grid: { left: 55, right: 12, bottom: 32, top: 16 },
      xAxis: { type: 'category', data: tc.map(t => t.thang), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'tr' : v } },
      series: [
        { name: 'Thu', type: 'line', data: tc.map(t => t.thu), smooth: true, lineStyle: { width: 2 }, areaStyle: { opacity: 0.08 }, itemStyle: { color: '#22c55e' }, symbol: 'circle', symbolSize: 4 },
        { name: 'Chi', type: 'line', data: tc.map(t => t.chi), smooth: true, lineStyle: { width: 2 }, areaStyle: { opacity: 0.08 }, itemStyle: { color: '#ef4444' }, symbol: 'circle', symbolSize: 4 },
      ],
    };
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

onMounted(() => {
  fetchAll();
  refreshTimer = setInterval(fetchAll, 60000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Dashboard" icon="pi pi-chart-pie">
      <template #actions>
        <span v-if="lastUpdated" class="update-time">
          <i class="pi pi-clock"></i> {{ lastUpdated }}
        </span>
        <Button icon="pi pi-refresh" text rounded size="small" @click="fetchAll" v-tooltip.bottom="'Làm mới'" />
      </template>
    </PageHeader>

    <!-- Stat Cards -->
    <div class="stats-grid">
      <StatCard icon="pi pi-file-edit" label="Biên nhận hôm nay" :value="stats.bn_hom_nay" gradient="blue" />
      <StatCard icon="pi pi-inbox" label="Tổng biên nhận" :value="stats.tong_bn" gradient="green" />
      <StatCard icon="pi pi-wallet" label="Doanh thu tháng" :value="fmt(stats.doanh_thu_thang) + 'đ'" gradient="purple" />
      <StatCard icon="pi pi-exclamation-triangle" :label="`Công nợ tồn (${stats.so_cong_no})`" :value="fmt(stats.cong_no_ton) + 'đ'" gradient="orange" />
    </div>

    <!-- Charts -->
    <div class="chart-grid">
      <div class="chart-card">
        <h3 class="card-title">Doanh thu 7 ngày qua</h3>
        <v-chart :option="barOption" autoresize style="height: 220px;" />
      </div>
      <div class="chart-card">
        <h3 class="card-title">Tỷ lệ tuyến</h3>
        <v-chart :option="pieOption" autoresize style="height: 220px;" />
      </div>
      <div class="chart-card full">
        <h3 class="card-title">Thu — Chi theo tháng</h3>
        <v-chart :option="lineOption" autoresize style="height: 200px;" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-time {
  font-size: 0.72rem;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.chart-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 0.85rem;
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--border);
}

.chart-card.full {
  grid-column: 1 / -1;
}

.chart-card .card-title {
  margin-bottom: 0.5rem;
}
</style>
