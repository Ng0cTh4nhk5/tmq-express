/**
 * usePhoneInput — Composable Vue xử lý ô nhập số điện thoại.
 *
 * Tính năng:
 *  - Tự động format 4-3-3 khi user gõ (real-time)
 *  - Giữ đúng vị trí cursor sau khi format (tránh cursor nhảy về cuối)
 *
 * Cách dùng:
 * ```vue
 * <script setup>
 * import { usePhoneInput } from '@/composables/usePhoneInput';
 * const { handlePhoneInput } = usePhoneInput();
 *
 * const form = ref({ dien_thoai: '' });
 * </script>
 *
 * <template>
 *   <InputText
 *     v-model="form.dien_thoai"
 *     @input="handlePhoneInput(form, 'dien_thoai', $event)"
 *     placeholder="0901 234 567"
 *     maxlength="13"
 *   />
 * </template>
 * ```
 */
import { nextTick } from 'vue';
import { applyPhoneFormat } from '../utils/phone';

export function usePhoneInput() {
  /**
   * Handler cho sự kiện @input của ô SĐT.
   *
   * Thuật toán giữ cursor:
   *  1. Lưu số digits trước cursor trong chuỗi chưa format
   *  2. Apply format 4-3-3
   *  3. Sau nextTick, đếm lại vị trí digit đó trong chuỗi đã format → đặt cursor
   *
   * @param {import('vue').Ref<object> | object} formObj — ref hoặc reactive object chứa form
   * @param {string} field     — tên field trong formObj (VD: 'dien_thoai_gui')
   * @param {Event}  event     — DOM input event từ @input
   */
  function handlePhoneInput(formObj, field, event) {
    const input = event.target;
    // Đếm số digits trước vị trí cursor hiện tại
    const cursorBefore = input.selectionStart;
    const rawBefore = input.value.slice(0, cursorBefore).replace(/\D/g, '').length;

    // Format và ghi vào form
    const formatted = applyPhoneFormat(input.value);

    // Ghi vào formObj: hỗ trợ cả Ref<object> và reactive object
    const target = formObj?.value !== undefined ? formObj.value : formObj;
    target[field] = formatted;

    // Đặt lại cursor về đúng vị trí sau format
    nextTick(() => {
      input.value = formatted;
      let digitCount = 0;
      let newPos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitCount++;
        if (digitCount === rawBefore) {
          newPos = i + 1;
          break;
        }
      }
      input.setSelectionRange(newPos, newPos);
    });
  }

  return { handlePhoneInput };
}
