/**
 * Shared COD constants — dùng chung cho ThuHoView và PhieuChuyenCodView
 */

export const COD_STATUS = {
  khong_co:           { label: 'Không có COD',       severity: 'secondary', icon: 'pi pi-minus' },
  cho_thu:            { label: 'Chờ thu',             severity: 'warn',      icon: 'pi pi-clock' },
  da_thu_chanh:       { label: 'Chành đã thu',        severity: 'secondary', icon: 'pi pi-map-marker' },
  da_thu:             { label: 'Đã thu',              severity: 'info',      icon: 'pi pi-check' },
  cho_chuyen_pending: { label: 'Chờ chuyển',          severity: 'help',      icon: 'pi pi-hourglass' },
  da_chuyen:          { label: 'Đã chuyển',           severity: 'help',      icon: 'pi pi-send' },
  da_tra:             { label: 'Hoàn tất',            severity: 'success',   icon: 'pi pi-check-circle' },
};

export const COD_STATUS_OPTIONS = [
  { label: 'Tất cả trạng thái',    value: '' },
  { label: 'Chờ thu',              value: 'cho_thu' },
  { label: 'Chành đã thu',         value: 'da_thu_chanh' },
  { label: 'Đã thu',               value: 'da_thu' },
  { label: 'Chờ chuyển (Đã gom)',  value: 'cho_chuyen_pending' },
  { label: 'Đã chuyển',            value: 'da_chuyen' },
  { label: 'Hoàn tất',             value: 'da_tra' },
];

export const HINH_THUC_OPTIONS = [
  { label: 'Tiền mặt',     value: 'tien_mat' },
  { label: 'Chuyển khoản', value: 'chuyen_khoan' },
];
