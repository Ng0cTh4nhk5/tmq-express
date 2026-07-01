/**
 * Centralized error handler cho frontend.
 */
export function handleApiError(err, toast, fallbackMessage = 'Có lỗi xảy ra') {
  const errData = err.response?.data?.error;
  let message =
    errData?.message ||
    err.response?.data?.message ||
    err.message ||
    fallbackMessage;

  // Dịch các lỗi thường gặp của axios sang tiếng Việt
  if (message === 'Network Error') message = 'Lỗi kết nối mạng';
  else if (message.includes('timeout')) message = 'Hết thời gian kết nối';
  else if (message.includes('Request failed with status code')) {
    message = message.replace('Request failed with status code', 'Yêu cầu thất bại với mã lỗi');
  }

  // Nếu có validation details, hiển thị field cụ thể bị lỗi
  let detail = message;
  if (errData?.details?.length) {
    const fieldErrors = errData.details
      .filter((d) => d.field || d.message)
      .map((d) => (d.field ? `[${d.field}] ${d.message}` : d.message))
      .join('; ');
    if (fieldErrors) detail = `${message}: ${fieldErrors}`;
  }

  toast.add({
    severity: 'error',
    summary: 'Lỗi',
    detail,
    life: 6000,
  });
}
