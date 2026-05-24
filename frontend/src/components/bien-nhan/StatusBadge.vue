<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps({
  value: String,
  type: { type: String, default: 'trang_thai' }, // 'trang_thai' | 'thu' | 'giao' | 'cod'
});

const trangThaiMap = {
  cho_vc:        { label: 'Chờ vận chuyển',   severity: 'warn',      icon: 'pi pi-box' },
  dang_vc:       { label: 'Đang vận chuyển',  severity: 'info',      icon: 'pi pi-truck' },
  da_den_kho:    { label: 'Đã đến kho',        severity: 'secondary', icon: 'pi pi-building' },
  da_bao_khach:  { label: 'Đã báo khách',      severity: 'contrast',  icon: 'pi pi-phone' },
  dang_giao:     { label: 'Đang giao hàng',   severity: 'warn',      icon: 'pi pi-car' },
  da_giao_chanh: { label: 'Đã giao Chành',    severity: 'info',      icon: 'pi pi-send' },
  khach_da_nhan: { label: 'Khách đã nhận',     severity: 'success',   icon: 'pi pi-check-circle' },
};


const thuMap = {
  da_thu:   { label: 'Đã thu',    severity: 'success', icon: 'pi pi-check-circle' },
  chua_thu: { label: 'Chưa thu',  severity: 'warn',    icon: 'pi pi-clock' },
  cong_no:  { label: 'Công nợ',   severity: 'danger',  icon: 'pi pi-exclamation-triangle' },
};

const giaoMap = {
  tan_noi:  { label: 'Tận nơi',      severity: 'info',      icon: 'pi pi-map-marker' },
  goi_dien: { label: 'Gọi điện',     severity: 'secondary', icon: 'pi pi-phone' },
  tu_toi:   { label: 'Tự tới',       severity: 'contrast',  icon: 'pi pi-user' },
};

const codMap = {
  cho_thu:   { label: 'COD: Chờ thu',   severity: 'warn',    icon: 'pi pi-clock' },
  da_thu:    { label: 'COD: Đã thu',    severity: 'info',    icon: 'pi pi-money-bill' },
  da_chuyen: { label: 'COD: Đã chuyển', severity: 'help',    icon: 'pi pi-send' },
  da_tra:    { label: 'COD: Hoàn tất',  severity: 'success', icon: 'pi pi-check-circle' },
  khong_co:  null, // ẩn badge
};

const maps = { trang_thai: trangThaiMap, thu: thuMap, giao: giaoMap, cod: codMap };

const config = computed(() => {
  const map = maps[props.type] || trangThaiMap;
  const entry = map[props.value];
  if (entry === null) return null; // ẩn (vd: cod = 'khong_co')
  return entry || { label: props.value, severity: 'secondary' };
});
</script>

<template>
  <Tag v-if="config" :value="config.label" :severity="config.severity" :icon="config.icon" />
</template>
