<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

const router = useRouter();
const auth = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = 'Vui lòng nhập tài khoản và mật khẩu';
    return;
  }

  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Đăng nhập thất bại';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <i class="pi pi-truck"></i>
        </div>
        <h1>TMQ Express</h1>
        <p>Hệ thống quản lý vận chuyển</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">Tài khoản</label>
          <InputText
            id="username"
            v-model="username"
            placeholder="Nhập tài khoản"
            :class="{ 'p-invalid': error }"
            autocomplete="username"
            fluid
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Mật khẩu</label>
          <Password
            id="password"
            v-model="password"
            placeholder="Nhập mật khẩu"
            :feedback="false"
            toggleMask
            :class="{ 'p-invalid': error }"
            autocomplete="current-password"
            fluid
          />
        </div>

        <div v-if="error" class="error-msg">
          <i class="pi pi-exclamation-circle"></i>
          {{ error }}
        </div>

        <Button
          type="submit"
          label="Đăng nhập"
          icon="pi pi-sign-in"
          :loading="loading"
          class="login-btn"
          fluid
        />
      </form>

      <div class="login-footer">
        <small>© 2026 TMQ Express · Phiên bản 1.0</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0c1222 0%, #1a2332 40%, #0c1222 100%);
  padding: 1rem;
}

.login-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 2rem;
  width: 100%;
  max-width: 380px;
  animation: fadeIn 0.4s ease;
}

.login-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-logo {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
  color: white;
  font-size: 1.4rem;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
}

.login-header h1 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--secondary);
  margin-bottom: 0.15rem;
}

.login-header p {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.login-form .form-group {
  margin-bottom: 1rem;
}

.error-msg {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
  border: 1px solid #fecaca;
}

.login-btn {
  margin-top: 0.25rem;
}

.login-footer {
  text-align: center;
  margin-top: 1.25rem;
  color: var(--text-light);
  font-size: 0.75rem;
}
</style>
