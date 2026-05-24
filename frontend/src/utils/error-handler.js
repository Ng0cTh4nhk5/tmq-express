/**
 * Centralized error handler cho frontend.
 */
export function handleApiError(err, toast, fallbackMessage = 'Có lỗi xảy ra') {
  const errData = err.response?.data?.error;
  const message =
    errData?.message ||
    err.response?.data?.message ||
    err.message ||
    fallbackMessage;

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
