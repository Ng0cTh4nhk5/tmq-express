/**
 * Centralized error handler cho frontend.
 * Thay the tat ca catch-ignore pattern.
 */
export function handleApiError(err, toast, fallbackMessage = 'Có lỗi xảy ra') {
  const message =
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message ||
    fallbackMessage;

  toast.add({
    severity: 'error',
    summary: 'Lỗi',
    detail: message,
    life: 5000,
  });
}
