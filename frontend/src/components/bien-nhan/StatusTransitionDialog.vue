<script setup>
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';

const props = defineProps({
  visible: Boolean,
  // Đơn lẻ
  bienNhan: { type: Object, default: null },
  // Batch
  batchIds: { type: Array, default: null },
  batchCount: { type: Number, default: 0 },
  // Trạng thái mới (đích)
  newStatus: { type: String, required: true },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:visible', 'confirm']);

const ghiChu = ref('');

// Map thông tin trạng thái
const TRANG_THAI_MAP = {
  cho_vc:        { label: 'Chờ vận chuyển', severity: 'warn',      icon: 'pi pi-inbox',        ghiChuPlaceholder: 'Ghi chú (tùy chọn)...' },
  dang_vc:       { label: 'Đang vận chuyển', severity: 'info',     icon: 'pi pi-truck',        ghiChuPlaceholder: 'VD: Xe 51C-12345, chuyến 14h...' },
  da_den_kho:    { label: 'Đã đến kho',      severity: 'secondary', icon: 'pi pi-building',     ghiChuPlaceholder: 'VD: Nhập kho lúc 15:30...' },
  da_bao_khach:  { label: 'Đã báo khách',    severity: 'contrast',  icon: 'pi pi-phone',        ghiChuPlaceholder: 'VD: Đã gọi điện cho khách...' },
  khach_da_nhan: { label: 'Khách đã nhận',   severity: 'success',   icon: 'pi pi-check-circle', ghiChuPlaceholder: 'VD: Khách ký nhận lúc 9:00...' },
};

const newStatusInfo = computed(() => TRANG_THAI_MAP[props.newStatus] || { label: props.newStatus, severity: 'secondary', icon: 'pi pi-arrow-right', ghiChuPlaceholder: 'Ghi chú (tùy chọn)...' });

const currentStatusInfo = computed(() => {
  if (props.bienNhan) {
    return TRANG_THAI_MAP[props.bienNhan.trang_thai] || { label: props.bienNhan.trang_thai, severity: 'secondary' };
  }
  return null;
});

const dialogHeader = computed(() => {
  if (props.batchIds?.length || props.batchCount) {
    const count = props.batchIds?.length || props.batchCount;
    return `Cập nhật trạng thái — ${count} biên nhận`;
  }
  return `Cập nhật trạng thái — ${props.bienNhan?.ma_so || '...'}`;
});

function handleConfirm() {
  emit('confirm', { ghiChu: ghiChu.value.trim() || null });
}

function handleClose() {
  ghiChu.value = '';
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="handleClose"
    :header="dialogHeader"
    :modal="true"
    :style="{ width: '420px' }"
    :closable="!loading"
    class="status-transition-dialog"
  >
    <!-- Sender info (single) -->
    <div v-if="bienNhan" class="dialog-meta">
      <div class="meta-row">
        <span class="meta-label">Người gửi</span>
        <span class="meta-value">{{ bienNhan.don_vi_gui || bienNhan.nguoi_gui || '—' }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Hàng hóa</span>
        <span class="meta-value">{{ bienNhan.ten_hang_hoa || '—' }}</span>
      </div>
    </div>

    <!-- Batch info -->
    <div v-else-if="batchIds?.length || batchCount" class="dialog-batch-info">
      <i class="pi pi-list-check" />
      <span>{{ batchIds?.length || batchCount }} biên nhận đã được chọn</span>
    </div>

    <!-- Transition arrow -->
    <div class="transition-row">
      <Tag
        v-if="currentStatusInfo"
        :value="currentStatusInfo.label"
        :severity="currentStatusInfo.severity"
        :icon="currentStatusInfo.icon"
        class="status-tag"
      />
      <i class="pi pi-arrow-right transition-arrow" />
      <Tag
        :value="newStatusInfo.label"
        :severity="newStatusInfo.severity"
        :icon="newStatusInfo.icon"
        class="status-tag status-tag-new"
      />
    </div>

    <!-- Ghi chú -->
    <div class="ghi-chu-group">
      <label class="ghi-chu-label">Ghi chú <span class="optional">(tùy chọn)</span></label>
      <Textarea
        v-model="ghiChu"
        :placeholder="newStatusInfo.ghiChuPlaceholder"
        rows="2"
        autoResize
        fluid
        :disabled="loading"
      />
    </div>

    <template #footer>
      <Button
        label="Hủy"
        severity="secondary"
        text
        size="small"
        :disabled="loading"
        @click="handleClose"
      />
      <Button
        :label="loading ? 'Đang xử lý...' : 'Xác nhận'"
        :icon="loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
        severity="success"
        size="small"
        :loading="loading"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialog-meta {
  background: var(--surface-hover, #f8fafc);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meta-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.83rem;
}

.meta-label {
  color: var(--text-muted, #94a3b8);
  min-width: 70px;
  flex-shrink: 0;
}

.meta-value {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.dialog-batch-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 0.88rem;
  color: #2563eb;
}

.transition-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.status-tag {
  font-size: 0.8rem;
}

.status-tag-new {
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.transition-arrow {
  color: #94a3b8;
  font-size: 1rem;
}

.ghi-chu-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ghi-chu-label {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-secondary, #475569);
}

.optional {
  font-weight: 400;
  color: var(--text-muted, #94a3b8);
  font-size: 0.78rem;
}
</style>
