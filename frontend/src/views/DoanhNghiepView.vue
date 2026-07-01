<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import AutoComplete from 'primevue/autocomplete';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';
import { formatNumber } from '../utils/format';

const toast = useToast();
const fmt = (v) => formatNumber(v ?? 0);

// ── Danh sách DN ─────────────────────────────────────────────────
const list      = ref([]);
const loading   = ref(false);
const search    = ref('');
const page      = ref(1);
const totalPages = ref(1);
const total     = ref(0);

async function fetchList() {
  loading.value = true;
  try {
    const { data: res } = await api.get('/doanh-nghiep', {
      params: { search: search.value || undefined, page: page.value, limit: 20 },
    });
    list.value       = res.data;
    totalPages.value = res.pagination.totalPages;
    total.value      = res.pagination.total;
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách doanh nghiệp', life: 3000 });
  }
  loading.value = false;
}
function doSearch() { page.value = 1; fetchList(); }
onMounted(fetchList);

// ── Form tạo/sửa DN ──────────────────────────────────────────────
const showFormDlg  = ref(false);
const formMode     = ref('create'); // 'create' | 'edit'
const formLoading  = ref(false);
const formData     = ref(emptyForm());
const formErrors   = ref({});

function emptyForm() {
  return { id: null, ten: '', ma_so_thue: '', dien_thoai: '', dia_chi: '', ghi_chu: '' };
}

function openCreate() {
  formMode.value  = 'create';
  formData.value  = emptyForm();
  formErrors.value = {};
  showFormDlg.value = true;
}
function openEdit(dn) {
  formMode.value = 'edit';
  formData.value = { id: dn.id, ten: dn.ten, ma_so_thue: dn.ma_so_thue || '', dien_thoai: dn.dien_thoai || '', dia_chi: dn.dia_chi || '', ghi_chu: dn.ghi_chu || '' };
  formErrors.value = {};
  showFormDlg.value = true;
}

async function saveForm() {
  formErrors.value = {};
  if (!formData.value.ten?.trim()) {
    formErrors.value.ten = 'Tên doanh nghiệp là bắt buộc';
    return;
  }
  formLoading.value = true;
  try {
    const body = {
      ten:        formData.value.ten.trim(),
      ma_so_thue: formData.value.ma_so_thue?.trim() || undefined,
      dien_thoai: formData.value.dien_thoai?.trim() || undefined,
      dia_chi:    formData.value.dia_chi?.trim()    || undefined,
      ghi_chu:    formData.value.ghi_chu?.trim()    || undefined,
    };
    if (formMode.value === 'create') {
      await api.post('/doanh-nghiep', body);
      toast.add({ severity: 'success', summary: 'Đã tạo', detail: `Doanh nghiệp "${body.ten}" đã được tạo`, life: 3000 });
    } else {
      await api.put(`/doanh-nghiep/${formData.value.id}`, body);
      toast.add({ severity: 'success', summary: 'Đã lưu', detail: 'Cập nhật thành công', life: 3000 });
    }
    showFormDlg.value = false;
    fetchList();
    // Nếu đang xem detail → reload
    if (detail.value?.id === formData.value.id) loadDetail(formData.value.id);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: err.response?.data?.error?.message || 'Lưu thất bại', life: 4000 });
  }
  formLoading.value = false;
}

// ── Toggle active ─────────────────────────────────────────────────
async function toggleActive(dn) {
  try {
    await api.patch(`/doanh-nghiep/${dn.id}/active`, { active: !dn.active });
    toast.add({ severity: 'info', summary: !dn.active ? 'Kích hoạt' : 'Vô hiệu hoá', detail: dn.ten, life: 3000 });
    fetchList();
    if (detail.value?.id === dn.id) loadDetail(dn.id);
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Thao tác thất bại', life: 3000 });
  }
}

// ── Panel chi tiết ────────────────────────────────────────────────
const detail      = ref(null);
const detailLoad  = ref(false);

async function loadDetail(id) {
  detailLoad.value = true;
  detail.value = null;
  try {
    const { data: res } = await api.get(`/doanh-nghiep/${id}`);
    detail.value = res.data;
  } catch {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tải được chi tiết', life: 3000 });
  }
  detailLoad.value = false;
}

// ── Thành viên: tìm KH để gán ─────────────────────────────────────
const showAddMember   = ref(false);
const memberSuggests  = ref([]);
const memberQuery     = ref(null);
const memberLoading   = ref(false);

async function searchMember(event) {
  const q = event.query;
  if (!q || q.length < 2) return;
  const { data: res } = await api.get('/khach-hang/autocomplete', { params: { q } });
  memberSuggests.value = res.data;
}

async function addMember() {
  if (!memberQuery.value?.id) {
    toast.add({ severity: 'warn', summary: 'Chưa chọn khách hàng', detail: 'Vui lòng chọn từ gợi ý', life: 2500 });
    return;
  }
  memberLoading.value = true;
  try {
    await api.post(`/doanh-nghiep/${detail.value.id}/thanh-vien`, { khach_hang_id: memberQuery.value.id });
    toast.add({ severity: 'success', summary: 'Đã thêm', detail: `${memberQuery.value.ten_don_vi} → ${detail.value.ten}`, life: 3000 });
    memberQuery.value = null;
    showAddMember.value = false;
    loadDetail(detail.value.id);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: err.response?.data?.error?.message || 'Thêm thất bại', life: 4000 });
  }
  memberLoading.value = false;
}

async function removeMember(kh) {
  if (!confirm(`Gỡ "${kh.ten_don_vi}" khỏi doanh nghiệp này?`)) return;
  try {
    await api.delete(`/doanh-nghiep/${detail.value.id}/thanh-vien/${kh.id}`);
    toast.add({ severity: 'info', summary: 'Đã gỡ', detail: kh.ten_don_vi, life: 3000 });
    loadDetail(detail.value.id);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: err.response?.data?.error?.message || 'Gỡ thất bại', life: 4000 });
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Quản lý Doanh nghiệp" icon="pi pi-building" />

    <div style="display:grid; grid-template-columns:1fr 420px; gap:1rem; align-items:start;">

      <!-- ── CỘT TRÁI: Danh sách ── -->
      <div>
        <div class="card" style="padding:0.75rem 1rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <InputText v-model="search" placeholder="Tìm tên, MST, SĐT..." class="p-inputtext-sm" style="flex:1;" @keyup.enter="doSearch" />
            <Button icon="pi pi-search" label="Tìm" size="small" @click="doSearch" />
            <Button icon="pi pi-plus" label="Thêm DN" size="small" severity="success" @click="openCreate" style="margin-left:auto;" />
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">{{ total }} doanh nghiệp</div>
        </div>

        <DataTable
          :value="list"
          :loading="loading"
          stripedRows size="small"
          selectionMode="single"
          @row-click="(e) => loadDetail(e.data.id)"
          :rowClass="(row) => detail?.id === row.id ? 'row-selected' : ''"
        >
          <template #empty>
            <div style="text-align:center; padding:2rem; color:var(--text-muted);">
              <i class="pi pi-building" style="font-size:1.5rem; opacity:.3;"></i>
              <p style="font-size:0.85rem; margin-top:0.5rem;">Chưa có doanh nghiệp nào</p>
            </div>
          </template>

          <Column header="Tên doanh nghiệp">
            <template #body="{ data }">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-weight:600; font-size:0.85rem;">{{ data.ten }}</span>
                <Tag v-if="!data.active" value="Không HĐ" severity="danger" style="font-size:0.65rem; padding:1px 5px;" />
              </div>
              <div v-if="data.ma_so_thue" style="font-size:0.72rem; color:var(--text-muted);">MST: {{ data.ma_so_thue }}</div>
            </template>
          </Column>

          <Column header="SĐT" style="width:120px;">
            <template #body="{ data }">
              <span style="font-size:0.8rem;">{{ data.dien_thoai || '—' }}</span>
            </template>
          </Column>

          <Column header="Thành viên" style="width:90px; text-align:center;">
            <template #body="{ data }">
              <Tag :value="String(data._count?.thanh_vien ?? 0)" severity="info" />
            </template>
          </Column>

          <Column style="width:80px; text-align:center;">
            <template #body="{ data }">
              <div style="display:flex; gap:2px; justify-content:center;">
                <Button icon="pi pi-pencil" text rounded size="small" severity="info" @click.stop="openEdit(data)" v-tooltip.top="'Sửa'" />
                <Button
                  :icon="data.active ? 'pi pi-ban' : 'pi pi-check-circle'"
                  text rounded size="small"
                  :severity="data.active ? 'danger' : 'success'"
                  @click.stop="toggleActive(data)"
                  v-tooltip.top="data.active ? 'Vô hiệu hoá' : 'Kích hoạt'"
                />
              </div>
            </template>
          </Column>
        </DataTable>

        <!-- Pagination -->
        <div v-if="totalPages > 1" style="display:flex; justify-content:center; gap:0.5rem; margin-top:0.75rem;">
          <Button icon="pi pi-chevron-left"  text rounded size="small" :disabled="page <= 1"          @click="page--; fetchList()" />
          <span style="font-size:0.8rem; line-height:2;">Trang {{ page }} / {{ totalPages }}</span>
          <Button icon="pi pi-chevron-right" text rounded size="small" :disabled="page >= totalPages" @click="page++; fetchList()" />
        </div>
      </div>

      <!-- ── CỘT PHẢI: Chi tiết ── -->
      <div>
        <!-- Placeholder khi chưa chọn -->
        <div v-if="!detail && !detailLoad" class="card" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);">
          <i class="pi pi-arrow-left" style="font-size:1.2rem; opacity:.3;"></i>
          <p style="font-size:0.85rem; margin-top:0.5rem;">Chọn một doanh nghiệp để xem chi tiết</p>
        </div>

        <div v-else-if="detailLoad" class="card" style="text-align:center; padding:2.5rem;">
          <i class="pi pi-spin pi-spinner" style="font-size:1.5rem; color:var(--primary);"></i>
        </div>

        <div v-else-if="detail">
          <!-- Thông tin cơ bản -->
          <div class="card" style="margin-bottom:0.75rem;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.75rem;">
              <div>
                <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">{{ detail.ten }}</div>
                <div v-if="detail.ma_so_thue" style="font-size:0.75rem; color:var(--text-muted);">MST: {{ detail.ma_so_thue }}</div>
              </div>
              <Tag :value="detail.active ? 'Hoạt động' : 'Không HĐ'" :severity="detail.active ? 'success' : 'danger'" />
            </div>
            <div style="display:grid; gap:4px; font-size:0.8rem;">
              <div v-if="detail.dien_thoai"><span style="color:var(--text-muted); width:80px; display:inline-block;">SĐT:</span> {{ detail.dien_thoai }}</div>
              <div v-if="detail.dia_chi"><span style="color:var(--text-muted); width:80px; display:inline-block;">Địa chỉ:</span> {{ detail.dia_chi }}</div>
              <div v-if="detail.ghi_chu"><span style="color:var(--text-muted); width:80px; display:inline-block;">Ghi chú:</span> {{ detail.ghi_chu }}</div>
            </div>
          </div>


          <!-- Danh sách thành viên -->
          <div class="card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
              <span style="font-size:0.85rem; font-weight:700;">
                <i class="pi pi-users" style="margin-right:4px;"></i>
                Thành viên ({{ detail.thanh_vien?.length ?? 0 }})
              </span>
              <Button
                icon="pi pi-user-plus" label="Thêm KH" size="small" severity="success"
                @click="showAddMember = !showAddMember"
              />
            </div>

            <!-- Form thêm thành viên -->
            <div v-if="showAddMember" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:0.6rem 0.75rem; margin-bottom:0.75rem; display:flex; gap:6px; align-items:flex-start; flex-wrap:wrap;">
              <div style="flex:1; min-width:180px;">
                <AutoComplete
                  v-model="memberQuery"
                  :suggestions="memberSuggests"
                  field="ten_don_vi"
                  @complete="searchMember"
                  placeholder="Tìm tên KH hoặc SĐT..."
                  class="p-inputtext-sm"
                  style="width:100%;"
                >
                  <template #option="{ option }">
                    <div style="font-size:0.8rem;">
                      <div style="font-weight:600;">{{ option.ten_don_vi }}</div>
                      <div style="color:#64748b; font-size:0.72rem;">{{ option.dien_thoai }}</div>
                    </div>
                  </template>
                </AutoComplete>
              </div>
              <Button icon="pi pi-check" label="Gán" size="small" :loading="memberLoading" @click="addMember" />
              <Button icon="pi pi-times" text rounded size="small" severity="secondary" @click="showAddMember = false; memberQuery = null" />
            </div>

            <!-- Danh sách thành viên hiện tại -->
            <div v-if="detail.thanh_vien?.length === 0" style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.8rem;">
              Chưa có thành viên nào
            </div>
            <div v-else>
              <div
                v-for="kh in detail.thanh_vien"
                :key="kh.id"
                style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--border-light);"
              >
                <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,#2a4f8a,#1e3a5f); color:white; display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:700; flex-shrink:0;">
                  {{ kh.ten_don_vi?.[0]?.toUpperCase() || 'K' }}
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:0.8rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ kh.ten_don_vi }}</div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">{{ kh.ma_kh }}{{ kh.dien_thoai ? ' · ' + kh.dien_thoai : '' }}</div>
                </div>
                <Tag
                  :value="kh.loai_kh === 'doanh_nghiep' ? 'DN' : 'CN'"
                  :severity="kh.loai_kh === 'doanh_nghiep' ? 'info' : 'secondary'"
                  style="font-size:0.65rem;"
                />
                <Button
                  icon="pi pi-user-minus" text rounded size="small" severity="danger"
                  @click="removeMember(kh)"
                  v-tooltip.top="'Gỡ khỏi doanh nghiệp'"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Dialog Tạo / Sửa DN ── -->
    <Dialog v-model:visible="showFormDlg" :header="formMode === 'create' ? 'Thêm doanh nghiệp' : 'Sửa doanh nghiệp'" modal style="width:440px;">
      <div style="display:grid; gap:0.75rem; padding-top:0.25rem;">

        <div>
          <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:3px;">
            Tên doanh nghiệp <span style="color:#ef4444;">*</span>
          </label>
          <InputText v-model="formData.ten" class="p-inputtext-sm" style="width:100%;" :class="{ 'p-invalid': formErrors.ten }" placeholder="Công ty TNHH..." />
          <small v-if="formErrors.ten" style="color:#ef4444; font-size:0.72rem;">{{ formErrors.ten }}</small>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div>
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:3px;">Mã số thuế</label>
            <InputText v-model="formData.ma_so_thue" class="p-inputtext-sm" style="width:100%;" placeholder="0123456789" />
          </div>
          <div>
            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:3px;">Điện thoại</label>
            <InputText v-model="formData.dien_thoai" class="p-inputtext-sm" style="width:100%;" placeholder="0909..." />
          </div>
        </div>

        <div>
          <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:3px;">Địa chỉ</label>
          <InputText v-model="formData.dia_chi" class="p-inputtext-sm" style="width:100%;" placeholder="123 Đường..." />
        </div>

        <div>
          <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:3px;">Ghi chú</label>
          <InputText v-model="formData.ghi_chu" class="p-inputtext-sm" style="width:100%;" placeholder="Ghi chú tuỳ ý..." />
        </div>
      </div>

      <template #footer>
        <Button label="Huỷ" text @click="showFormDlg = false" />
        <Button :label="formMode === 'create' ? 'Tạo' : 'Lưu'" icon="pi pi-check" :loading="formLoading" @click="saveForm" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.row-selected {
  background: rgba(42, 79, 138, 0.12) !important;
}
.row-selected td {
  font-weight: 600;
}
</style>
