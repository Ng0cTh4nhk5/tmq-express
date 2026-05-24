// Trạng thái cước nhận
export const CUOC_NHAN_STATUS = {
  cho_thu:    { label: 'Chờ thu',    severity: 'warn',    icon: 'pi-clock' },
  da_thu:     { label: 'Đã thu',     severity: 'info',    icon: 'pi-check' },
  cho_chuyen: { label: 'Chờ chuyển',severity: 'help',    icon: 'pi-send' },
  da_nhan:    { label: 'Hoàn tất',   severity: 'success', icon: 'pi-check-circle' },
};

export const CUOC_NHAN_STATUS_OPTIONS = [
  { label: 'Tất cả',      value: '' },
  { label: 'Chờ thu',     value: 'cho_thu' },
  { label: 'Đã thu',      value: 'da_thu' },
  { label: 'Chờ chuyển', value: 'cho_chuyen' },
  { label: 'Hoàn tất',   value: 'da_nhan' },
];

export const PHIEU_CHUYEN_CUOC_STATUS_OPTIONS = [
  { label: 'Tất cả',      value: '' },
  { label: 'Chờ chuyển', value: 'cho_chuyen' },
  { label: 'Đã chuyển',  value: 'da_chuyen' },
  { label: 'Đã nhận',    value: 'da_nhan' },
];

export const HINH_THUC_OPTIONS = [
  { label: 'Tiền mặt',     value: 'tien_mat' },
  { label: 'Chuyển khoản', value: 'chuyen_khoan' },
];
