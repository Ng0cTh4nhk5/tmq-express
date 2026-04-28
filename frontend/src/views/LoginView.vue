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
    if (err.response?.status === 423) {
      const lockedUntil = err.response?.data?.error?.locked_until;
      if (lockedUntil) {
        const remaining = Math.ceil((new Date(lockedUntil) - Date.now()) / 60000);
        error.value = `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${remaining} phút.`;
      } else {
        error.value = err.response?.data?.error?.message || 'Tài khoản đã bị khóa tạm thời.';
      }
    } else {
      error.value = err.response?.data?.error?.message || 'Đăng nhập thất bại';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Animated background shapes -->
    <div class="bg-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

    <div class="login-container">
      <!-- Left branding panel -->
      <div class="login-branding">
        <div class="branding-content">
          <img src="/logo.png" alt="TMQ Express" class="branding-logo" />
          <h1 class="branding-title">TMQ Express</h1>
          <p class="branding-tagline">Hệ thống Quản lý Vận chuyển & Tài chính</p>
          <div class="branding-features">
            <div class="feature-item">
              <i class="pi pi-truck"></i>
              <span>Quản lý vận chuyển liên tỉnh</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-chart-line"></i>
              <span>Báo cáo doanh thu thời gian thực</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-shield"></i>
              <span>Bảo mật & kiểm soát truy cập</span>
            </div>
          </div>
        </div>
        <div class="branding-footer">
          <small>© 2026 TMQ Express · Tất cả quyền được bảo lưu</small>
        </div>
      </div>

      <!-- Right login form -->
      <div class="login-card">
        <div class="login-header">
          <img src="/logo.png" alt="TMQ Express" class="login-logo-mobile" />
          <h2>Đăng nhập</h2>
          <p>Nhập thông tin tài khoản để truy cập hệ thống</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="username" class="form-label">
              <i class="pi pi-user"></i> Tài khoản
            </label>
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
            <label for="password" class="form-label">
              <i class="pi pi-lock"></i> Mật khẩu
            </label>
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
            <i class="pi pi-exclamation-triangle"></i>
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
          <small>Liên hệ quản trị viên nếu bạn quên mật khẩu</small>
        </div>
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
  background: linear-gradient(135deg, #0a1628 0%, #132042 40%, #0d1b33 100%);
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

/* Animated background */
.bg-shapes {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.07;
  filter: blur(60px);
}

.shape-1 {
  width: 500px;
  height: 500px;
  background: #f97316;
  top: -10%;
  right: -5%;
  animation: float1 20s ease-in-out infinite;
}

.shape-2 {
  width: 400px;
  height: 400px;
  background: #2563eb;
  bottom: -15%;
  left: -5%;
  animation: float2 25s ease-in-out infinite;
}

.shape-3 {
  width: 300px;
  height: 300px;
  background: #7c3aed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float3 18s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-40px, 30px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -40px); }
}
@keyframes float3 {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.15); }
}

.login-container {
  display: flex;
  max-width: 880px;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.5s ease;
  position: relative;
  z-index: 1;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Left branding panel */
.login-branding {
  width: 420px;
  flex-shrink: 0;
  background: linear-gradient(160deg, #1e40af 0%, #1d4ed8 30%, #2563eb 60%, #1e3a8a 100%);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.login-branding::before {
  content: '';
  position: absolute;
  top: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: rgba(249, 115, 22, 0.15);
  border-radius: 50%;
  filter: blur(40px);
}

.login-branding::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  filter: blur(30px);
}

.branding-content {
  position: relative;
  z-index: 1;
}

.branding-logo {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  margin-bottom: 1.25rem;
  background: white;
  padding: 4px;
}

.branding-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: white;
  margin-bottom: 0.35rem;
  letter-spacing: -0.5px;
}

.branding-tagline {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.branding-features {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
}

.feature-item i {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.branding-footer {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Right login form */
.login-card {
  flex: 1;
  background: #ffffff;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-logo-mobile {
  display: none;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  margin-bottom: 0.75rem;
}

.login-header {
  margin-bottom: 1.75rem;
}

.login-header h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.3rem;
}

.login-header p {
  color: #64748b;
  font-size: 0.85rem;
}

.login-form .form-group {
  margin-bottom: 1.15rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.form-label i {
  font-size: 0.75rem;
  color: #94a3b8;
}

.error-msg {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  border: 1px solid #fecaca;
}

.login-btn {
  margin-top: 0.5rem;
  height: 42px;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .login-branding {
    display: none;
  }
  .login-logo-mobile {
    display: block;
  }
  .login-card {
    border-radius: 20px;
  }
  .login-container {
    max-width: 420px;
  }
}
</style>
