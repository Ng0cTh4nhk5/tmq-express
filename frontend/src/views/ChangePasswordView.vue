<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth.store';
import Password from 'primevue/password';
import Button from 'primevue/button';
import PageHeader from '../components/shared/PageHeader.vue';
import api from '../api/client';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

// Nếu đến do require_password_change thì ẩn nút "Bỏ qua"
const isMandatory = computed(() => auth.user?.require_password_change === true);

const form = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
});
const saving = ref(false);
const errors = ref({});

function validate() {
  errors.value = {};
  if (!form.value.current_password) {
    errors.value.current_password = 'Vui lòng nhập mật khẩu hiện tại';
  }
  if (!form.value.new_password || form.value.new_password.length < 6) {
    errors.value.new_password = 'Mật khẩu mới phải có ít nhất 6 ký tự';
  }
  if (form.value.new_password !== form.value.confirm_password) {
    errors.value.confirm_password = 'Mật khẩu xác nhận không khớp';
  }
  if (form.value.new_password === form.value.current_password) {
    errors.value.new_password = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  }
  return Object.keys(errors.value).length === 0;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    await api.post('/auth/change-password', {
      current_password: form.value.current_password,
      new_password: form.value.new_password,
    });
    toast.add({ severity: 'success', summary: 'Đổi mật khẩu thành công', detail: 'Vui lòng đăng nhập lại', life: 3000 });
    // Logout và về trang đăng nhập
    auth.logout();
    router.push('/login');
  } catch (err) {
    const msg = err.response?.data?.error?.message || 'Không thể đổi mật khẩu';
    toast.add({ severity: 'error', summary: 'Lỗi', detail: msg, life: 4000 });
  } finally {
    saving.value = false;
  }
}

function cancel() {
  router.push('/');
}
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="Đổi mật khẩu" icon="pi pi-key">
      <template #actions>
        <Button
          v-if="!isMandatory"
          label="Quay lại"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          size="small"
          @click="cancel"
        />
      </template>
    </PageHeader>

    <!-- Banner bắt buộc đổi MK -->
    <div v-if="isMandatory" class="mandatory-banner">
      <i class="pi pi-exclamation-triangle"></i>
      <div>
        <strong>Bạn cần đổi mật khẩu trước khi sử dụng hệ thống.</strong>
        <span>Tài khoản của bạn được cấp mật khẩu tạm. Vui lòng đặt mật khẩu mới để tiếp tục.</span>
      </div>
    </div>

    <div class="card change-pw-card">
      <div class="form-section-title">
        <i class="pi pi-lock"></i>
        Thông tin mật khẩu
      </div>

      <div class="form-group">
        <label class="form-label">Mật khẩu hiện tại <span class="required">*</span></label>
        <Password
          v-model="form.current_password"
          :feedback="false"
          toggleMask
          placeholder="Nhập mật khẩu hiện tại"
          :class="{ 'p-invalid': errors.current_password }"
          fluid
        />
        <small v-if="errors.current_password" class="field-error">{{ errors.current_password }}</small>
      </div>

      <div class="form-group">
        <label class="form-label">Mật khẩu mới <span class="required">*</span></label>
        <Password
          v-model="form.new_password"
          toggleMask
          placeholder="Tối thiểu 6 ký tự"
          :class="{ 'p-invalid': errors.new_password }"
          fluid
          promptLabel="Nhập mật khẩu mới"
          weakLabel="Yếu"
          mediumLabel="Trung bình"
          strongLabel="Mạnh"
        />
        <small v-if="errors.new_password" class="field-error">{{ errors.new_password }}</small>
      </div>

      <div class="form-group">
        <label class="form-label">Xác nhận mật khẩu mới <span class="required">*</span></label>
        <Password
          v-model="form.confirm_password"
          :feedback="false"
          toggleMask
          placeholder="Nhập lại mật khẩu mới"
          :class="{ 'p-invalid': errors.confirm_password }"
          fluid
        />
        <small v-if="errors.confirm_password" class="field-error">{{ errors.confirm_password }}</small>
      </div>

      <div class="form-actions">
        <Button
          label="Xác nhận đổi mật khẩu"
          icon="pi pi-check"
          :loading="saving"
          @click="save"
        />
        <Button
          v-if="!isMandatory"
          label="Hủy"
          severity="secondary"
          text
          @click="cancel"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mandatory-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  color: #92400e;
}

.mandatory-banner i {
  font-size: 1.1rem;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.mandatory-banner strong {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.mandatory-banner span {
  font-size: 0.8rem;
  opacity: 0.85;
}

.change-pw-card {
  max-width: 480px;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.form-group {
  margin-bottom: 1.1rem;
}

.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.35rem;
}

.required {
  color: var(--danger, #ef4444);
}

.field-error {
  color: #ef4444;
  font-size: 0.73rem;
  margin-top: 0.25rem;
  display: block;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
