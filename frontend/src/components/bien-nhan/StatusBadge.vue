<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps({
  value: String,
  type: { type: String, default: 'trang_thai' }, // 'trang_thai' | 'thu' | 'giao'
});

const trangThaiMap = {
  cho_vc: { label: 'Chờ vận chuyển', severity: 'warn', icon: 'pi pi-box' },
  dang_vc: { label: 'Đang vận chuyển', severity: 'info', icon: 'pi pi-truck' },
  da_den_kho: { label: 'Đã đến kho', severity: 'secondary', icon: 'pi pi-building' },
  da_bao_khach: { label: 'Đã báo khách', severity: 'contrast', icon: 'pi pi-phone' },
  khach_da_nhan: { label: 'Khách đã nhận', severity: 'success', icon: 'pi pi-check-circle' },
};

const thuMap = {
  da_thu: { label: 'Đã thu', severity: 'success' },
  chua_thu: { label: 'Chưa thu', severity: 'warn' },
  cong_no: { label: 'Công nợ', severity: 'danger' },
};

const giaoMap = {
  tan_noi: { label: 'Tận nơi', severity: 'info' },
  goi_dien: { label: 'Gọi điện', severity: 'secondary' },
  tu_toi: { label: 'Tự tới', severity: 'contrast' },
};

const maps = { trang_thai: trangThaiMap, thu: thuMap, giao: giaoMap };

const config = computed(() => {
  const map = maps[props.type] || trangThaiMap;
  return map[props.value] || { label: props.value, severity: 'secondary' };
});
</script>

<template>
  <Tag :value="config.label" :severity="config.severity" :icon="config.icon" />
</template>
