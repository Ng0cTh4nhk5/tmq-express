<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import PageHeader from '../components/shared/PageHeader.vue';
import StatCard from '../components/shared/StatCard.vue';
import api from '../api/client';
import { handleApiError } from '../utils/error-handler';
import { formatNumber } from '../utils/format';

const toast = useToast();
const fmt = (v) => formatNumber(v ?? 0);

// ── Bộ lọc tháng/năm ─────────────────────────────────────────────
const thang = ref(new Date().getMonth() + 1);
const nam   = ref(new Date().getFullYear());

// ── Tab Tuyến ────────────────────────────────────────────────────
const tuyenData    = ref([]);
const tuyenLoading = ref(false);
const expandedTuyen = ref({});

async function fetchTuyen() {
  tuyenLoading.value = true;
  try {
    const res = await api.get('/bao-cao/theo-tuyen', { params: { thang: thang.value, nam: nam.value } });
    tuyenData.value = res.data.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải báo cáo tuyến');
  }
  tuyenLoading.value = false;
}

const tuyenSummary = computed(() => {
  const total = tuyenData.value.reduce(
    (acc, t) => ({
      so_bn:    acc.so_bn    + t.so_bien_nhan,
      tong_cuoc: acc.tong_cuoc + t.tong_cuoc,
      tong_cod: acc.tong_cod + t.tong_cod,
    }),
    { so_bn: 0, tong_cuoc: 0, tong_cod: 0 }
  );
  return total;
});

// ── Tab Chành ────────────────────────────────────────────────────
const chanhData    = ref([]);
const chanhLoading = ref(false);
const expandedChanh = ref({});

async function fetchChanh() {
  chanhLoading.value = true;
  try {
    const res = await api.get('/bao-cao/theo-chanh', { params: { thang: thang.value, nam: nam.value } });
    chanhData.value = res.data.data;
  } catch (err) {
    handleApiError(err, toast, 'Không thể tải báo cáo chành');
  }
  chanhLoading.value = false;
}

const chanhSummary = computed(() => {
  return chanhData.value.reduce(
    (acc, c) => ({
      so_bn:    acc.so_bn    + c.so_bien_nhan,
      tong_cuoc: acc.tong_cuoc + c.tong_cuoc,
      tong_cod: acc.tong_cod + c.tong_cod,
    }),
    { so_bn: 0, tong_cuoc: 0, tong_cod: 0 }
  );
});

// ── Load cả 2 khi mount ──────────────────────────────────────────
function fetchAll() {
  fetchTuyen();
  fetchChanh();
}
onMounted(fetchAll);
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Báo cáo tuyến & chành" icon="pi pi-chart-line" />

    <!-- Bộ lọc chung -->
    <div class="card" style="margin-bottom:1rem; padding:0.75rem 1rem;">
      <div class="filter-section" style="align-items:center;">
        <label>Tháng</label>
        <input type="number" v-model="thang" min="1" max="12" style="width:70px;" />
        <label class="filter-spacer">Năm</label>
        <input type="number" v-model="nam" min="2020" max="2030" style="width:80px;" />
        <Button label="Tải báo cáo" icon="pi pi-refresh" @click="fetchAll"
          :loading="tuyenLoading || chanhLoading" style="margin-left:auto;" />
      </div>
    </div>

    <!-- Tabs -->
    <TabView>
      <!-- ══ TAB 1: THEO TUYẾN ══ -->
      <TabPanel header="Theo Tuyến">
        <!-- Summary cards -->
        <div v-if="tuyenData.length" class="stats-grid" style="grid-template-columns: repeat(3,1fr); margin-bottom:1rem;">
          <StatCard icon="pi pi-list"         label="Tổng biên nhận" :value="String(tuyenSummary.so_bn) + ' BN'"   variant="info" />
          <StatCard icon="pi pi-dollar"       label="Tổng cước"     :value="fmt(tuyenSummary.tong_cuoc) + 'đ'"    variant="success" />
          <StatCard icon="pi pi-send"         label="Tổng COD"      :value="fmt(tuyenSummary.tong_cod) + 'đ'"     variant="warning" />
        </div>

        <DataTable
          :value="tuyenData"
          :loading="tuyenLoading"
          v-model:expandedRows="expandedTuyen"
          dataKey="tuyen_label"
          stripedRows size="small"
        >
          <template #empty>
            <div style="text-align:center; padding:2rem; color:var(--text-muted);">
              <i class="pi pi-inbox" style="font-size:1.5rem; opacity:.3;"></i>
              <p style="font-size:0.85rem;">Không có dữ liệu trong tháng này</p>
            </div>
          </template>

          <Column expander style="width:3rem" />

          <Column header="Tuyến">
            <template #body="{ data }">
              <span style="font-weight:600;">
                <span style="color:#2563eb;">{{ data.vp_gui?.ten }}</span>
                <i class="pi pi-arrow-right" style="margin:0 6px; font-size:0.7rem; color:var(--text-muted);"></i>
                <span style="color:#7c3aed;">{{ data.vp_nhan?.ten }}</span>
              </span>
            </template>
          </Column>

          <Column header="Số BN" style="width:80px; text-align:center;">
            <template #body="{ data }">
              <Tag :value="String(data.so_bien_nhan)" severity="info" />
            </template>
          </Column>

          <Column header="Tổng cước" style="width:130px; text-align:right;">
            <template #body="{ data }">{{ fmt(data.tong_cuoc) }}đ</template>
          </Column>

          <Column header="Tổng COD" style="width:120px; text-align:right;">
            <template #body="{ data }">
              <span :style="data.tong_cod > 0 ? 'color:#d97706;font-weight:600;' : ''">
                {{ fmt(data.tong_cod) }}đ
              </span>
            </template>
          </Column>

          <Column header="Đã giao" style="width:80px; text-align:center;">
            <template #body="{ data }">
              <span style="color:#16a34a; font-weight:600;">{{ data.da_giao }}</span>
              / {{ data.so_bien_nhan }}
            </template>
          </Column>

          <Column header="CN cước" style="width:80px; text-align:center;">
            <template #body="{ data }">
              <Tag v-if="data.cong_no_cuoc > 0" :value="String(data.cong_no_cuoc)" severity="danger" />
              <span v-else style="color:var(--text-muted);">—</span>
            </template>
          </Column>

          <!-- Row expanded: danh sách BN -->
          <template #expansion="{ data }">
            <div style="padding:0.5rem 1rem; background:#f8fafc;">
              <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">
                Chi tiết {{ data.so_bien_nhan }} biên nhận — {{ data.tuyen_label }}
              </p>
              <DataTable :value="data.items" size="small" stripedRows>
                <Column field="ma_so" header="Mã BN" style="width:120px;" />
                <Column header="Ngày" style="width:90px;">
                  <template #body="{ data: item }">
                    {{ new Date(item.ngay_bien_nhan).toLocaleDateString('vi-VN') }}
                  </template>
                </Column>
                <Column header="Cước" style="width:110px; text-align:right;">
                  <template #body="{ data: item }">{{ fmt(item.gia_cuoc) }}đ</template>
                </Column>
                <Column header="COD" style="width:100px; text-align:right;">
                  <template #body="{ data: item }">
                    <span v-if="item.thu_ho > 0" style="color:#d97706;">{{ fmt(item.thu_ho) }}đ</span>
                    <span v-else>—</span>
                  </template>
                </Column>
                <Column header="Trạng thái" style="width:110px;">
                  <template #body="{ data: item }">
                    <Tag :value="item.trang_thai" severity="info" style="font-size:0.7rem;" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </DataTable>
      </TabPanel>

      <!-- ══ TAB 2: THEO CHÀNH ══ -->
      <TabPanel header="Theo Chành">
        <!-- Summary cards -->
        <div v-if="chanhData.length" class="stats-grid" style="grid-template-columns: repeat(3,1fr); margin-bottom:1rem;">
          <StatCard icon="pi pi-list"   label="Tổng biên nhận" :value="String(chanhSummary.so_bn) + ' BN'"   variant="info" />
          <StatCard icon="pi pi-dollar" label="Tổng cước"     :value="fmt(chanhSummary.tong_cuoc) + 'đ'"    variant="success" />
          <StatCard icon="pi pi-send"   label="Tổng COD"      :value="fmt(chanhSummary.tong_cod) + 'đ'"     variant="warning" />
        </div>

        <DataTable
          :value="chanhData"
          :loading="chanhLoading"
          v-model:expandedRows="expandedChanh"
          dataKey="chanh_label"
          stripedRows size="small"
        >
          <template #empty>
            <div style="text-align:center; padding:2rem; color:var(--text-muted);">
              <i class="pi pi-inbox" style="font-size:1.5rem; opacity:.3;"></i>
              <p style="font-size:0.85rem;">Không có dữ liệu trong tháng này</p>
            </div>
          </template>

          <Column expander style="width:3rem" />

          <Column header="Chành">
            <template #body="{ data }">
              <div>
                <span style="font-weight:600;">{{ data.chanh_label }}</span>
                <span v-if="data.chanh?.dien_thoai" style="margin-left:8px; font-size:0.75rem; color:var(--text-muted);">
                  📞 {{ data.chanh.dien_thoai }}
                </span>
                <span v-if="data.chanh?.nguoi_lien_he" style="margin-left:6px; font-size:0.75rem; color:var(--text-muted);">
                  — {{ data.chanh.nguoi_lien_he }}
                </span>
              </div>
              <div v-if="data.chanh?.dia_chi" style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                {{ data.chanh.dia_chi }}
              </div>
            </template>
          </Column>

          <Column header="Số BN" style="width:80px; text-align:center;">
            <template #body="{ data }">
              <Tag :value="String(data.so_bien_nhan)" severity="info" />
            </template>
          </Column>

          <Column header="Tổng cước" style="width:130px; text-align:right;">
            <template #body="{ data }">{{ fmt(data.tong_cuoc) }}đ</template>
          </Column>

          <Column header="Tổng COD" style="width:120px; text-align:right;">
            <template #body="{ data }">
              <span :style="data.tong_cod > 0 ? 'color:#d97706;font-weight:600;' : ''">
                {{ fmt(data.tong_cod) }}đ
              </span>
            </template>
          </Column>

          <Column header="Đã giao" style="width:80px; text-align:center;">
            <template #body="{ data }">
              <span style="color:#16a34a; font-weight:600;">{{ data.da_giao }}</span>
              / {{ data.so_bien_nhan }}
            </template>
          </Column>

          <!-- Row expanded: danh sách BN -->
          <template #expansion="{ data }">
            <div style="padding:0.5rem 1rem; background:#f8fafc;">
              <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">
                Chi tiết {{ data.so_bien_nhan }} biên nhận — {{ data.chanh_label }}
              </p>
              <DataTable :value="data.items" size="small" stripedRows>
                <Column field="ma_so" header="Mã BN" style="width:120px;" />
                <Column header="Tuyến" style="width:140px;">
                  <template #body="{ data: item }">
                    <span style="font-size:0.75rem;">
                      {{ item.van_phong_gui?.ma_vp }} → {{ item.van_phong_nhan?.ma_vp }}
                    </span>
                  </template>
                </Column>
                <Column header="Người gửi" style="width:140px;">
                  <template #body="{ data: item }">
                    <span style="font-size:0.8rem;">{{ item.don_vi_gui || '—' }}</span>
                  </template>
                </Column>
                <Column header="Cước" style="width:110px; text-align:right;">
                  <template #body="{ data: item }">{{ fmt(item.gia_cuoc) }}đ</template>
                </Column>
                <Column header="COD" style="width:100px; text-align:right;">
                  <template #body="{ data: item }">
                    <span v-if="item.thu_ho > 0" style="color:#d97706;">{{ fmt(item.thu_ho) }}đ</span>
                    <span v-else>—</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>
</template>
