<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

const router = useRouter();
const auth = useAuthStore();

// ============================================================================
// MARK: - STATE VARIABLES
// ============================================================================
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// ============================================================================
// MARK: - API: HANDLE LOGIN
// ============================================================================
async function handleLogin() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = 'Vui lòng nhập tài khoản và mật khẩu';
    return;
  }

  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    // Nếu user cần đổi MK lần đầu → redirect về trang đổi MK
    if (auth.user?.require_password_change) {
      router.push('/doi-mat-khau');
    } else {
      router.push('/');
    }
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
  <!-- ===================================================================== -->
  <!-- MARK: - BRANDING & BACKGROUND                                         -->
  <!-- ===================================================================== -->
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
        <!-- Top: Logo + Title -->
        <div class="branding-content">
          <img src="/logo.png" alt="TMQ Express" class="branding-logo" />
          <h1 class="branding-title">TMQ Express</h1>
          <p class="branding-tagline">App vận hành nội bộ</p>
        </div>

        <!-- Center: SVG Illustration -->
        <div class="branding-illustration">
          <svg viewBox="0 0 380 280" fill="none" xmlns="http://www.w3.org/2000/svg" class="illus-svg">
            <!-- Defs -->
            <defs>
              <linearGradient id="truckBodyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f0b429"/>
                <stop offset="100%" stop-color="#c98c00"/>
              </linearGradient>
              <linearGradient id="cargoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffd05b"/>
                <stop offset="100%" stop-color="#e8960a"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <!-- Road / route base -->
            <rect x="20" y="195" width="340" height="8" rx="4" fill="rgba(255,255,255,0.08)"/>

            <!-- Dashed route line (animated) -->
            <path d="M 30 191 Q 140 160 200 191 Q 260 222 340 185"
              stroke="#f0b429" stroke-width="2.5" fill="none"
              stroke-dasharray="10 8"
              stroke-linecap="round"
              class="route-path"/>

            <!-- Location pin 1 (left) -->
            <g class="pin pin-1">
              <circle cx="55" cy="148" r="10" fill="#f0b429" filter="url(#glow)" opacity="0.9"/>
              <circle cx="55" cy="148" r="5" fill="#fff"/>
              <line x1="55" y1="158" x2="55" y2="191" stroke="#f0b429" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.6"/>
            </g>

            <!-- Location pin 2 (mid) -->
            <g class="pin pin-2">
              <circle cx="200" cy="132" r="10" fill="#f0b429" filter="url(#glow)" opacity="0.9"/>
              <circle cx="200" cy="132" r="5" fill="#fff"/>
              <line x1="200" y1="142" x2="200" y2="191" stroke="#f0b429" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.6"/>
            </g>

            <!-- Location pin 3 (right) -->
            <g class="pin pin-3">
              <circle cx="330" cy="138" r="10" fill="#f0b429" filter="url(#glow)" opacity="0.9"/>
              <circle cx="330" cy="138" r="5" fill="#fff"/>
              <line x1="330" y1="148" x2="330" y2="184" stroke="#f0b429" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.6"/>
            </g>

            <!-- Floating parcels (background) -->
            <g class="parcel parcel-bg-1">
              <rect x="290" y="70" width="28" height="24" rx="4" fill="url(#cargoGrad)" opacity="0.7"/>
              <line x1="290" y1="82" x2="318" y2="82" stroke="#a06000" stroke-width="1" opacity="0.5"/>
              <line x1="304" y1="70" x2="304" y2="94" stroke="#a06000" stroke-width="1" opacity="0.5"/>
            </g>
            <g class="parcel parcel-bg-2">
              <rect x="48" y="80" width="22" height="19" rx="3" fill="url(#cargoGrad)" opacity="0.5"/>
              <line x1="48" y1="89.5" x2="70" y2="89.5" stroke="#a06000" stroke-width="1" opacity="0.4"/>
              <line x1="59" y1="80" x2="59" y2="99" stroke="#a06000" stroke-width="1" opacity="0.4"/>
            </g>

            <!-- TRUCK GROUP (animated slide-in) -->
            <g class="truck-group">
              <!-- Cargo container -->
              <rect x="105" y="154" width="100" height="44" rx="4" fill="url(#truckBodyGrad)"/>
              <!-- Container door lines -->
              <line x1="155" y1="154" x2="155" y2="198" stroke="#a06000" stroke-width="1.5" opacity="0.5"/>
              <line x1="133" y1="165" x2="133" y2="198" stroke="#a06000" stroke-width="1" opacity="0.3"/>
              <line x1="177" y1="165" x2="177" y2="198" stroke="#a06000" stroke-width="1" opacity="0.3"/>
              <!-- Container highlight -->
              <rect x="108" y="157" width="94" height="6" rx="2" fill="rgba(255,255,255,0.18)"/>

              <!-- Cab body -->
              <rect x="200" y="161" width="58" height="37" rx="6" fill="url(#truckBodyGrad)"/>
              <!-- Windshield -->
              <rect x="215" y="164" width="36" height="22" rx="4" fill="rgba(160,220,255,0.35)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
              <!-- Cab highlight -->
              <rect x="202" y="163" width="54" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
              <!-- Front bumper -->
              <rect x="252" y="190" width="10" height="8" rx="2" fill="#c98c00"/>
              <!-- Headlight -->
              <rect x="254" y="174" width="7" height="5" rx="2" fill="#fff9c4" opacity="0.9"/>
              <!-- Headlight glow -->
              <ellipse cx="265" cy="176.5" rx="6" ry="3" fill="rgba(255,249,150,0.3)"/>

              <!-- Connector between cab & cargo -->
              <rect x="198" y="165" width="8" height="28" rx="2" fill="#a06000" opacity="0.6"/>

              <!-- Wheels -->
              <!-- Rear axle -->
              <circle cx="135" cy="200" r="14" fill="#1a2a4a" stroke="#4a6fa5" stroke-width="3"/>
              <circle cx="135" cy="200" r="7" fill="#2d4a7a"/>
              <circle cx="135" cy="200" r="3" fill="#f0b429"/>
              <!-- Front rear -->
              <circle cx="175" cy="200" r="14" fill="#1a2a4a" stroke="#4a6fa5" stroke-width="3"/>
              <circle cx="175" cy="200" r="7" fill="#2d4a7a"/>
              <circle cx="175" cy="200" r="3" fill="#f0b429"/>
              <!-- Front wheel -->
              <circle cx="233" cy="200" r="14" fill="#1a2a4a" stroke="#4a6fa5" stroke-width="3"/>
              <circle cx="233" cy="200" r="7" fill="#2d4a7a"/>
              <circle cx="233" cy="200" r="3" fill="#f0b429"/>

              <!-- Small parcel on roof -->
              <rect x="130" y="146" width="22" height="18" rx="3" fill="url(#cargoGrad)"/>
              <line x1="130" y1="155" x2="152" y2="155" stroke="#a06000" stroke-width="1" opacity="0.5"/>
              <line x1="141" y1="146" x2="141" y2="164" stroke="#a06000" stroke-width="1" opacity="0.5"/>
            </g>

            <!-- Speed lines -->
            <g class="speed-lines" opacity="0.4">
              <line x1="50" y1="170" x2="100" y2="170" stroke="#f0b429" stroke-width="2" stroke-linecap="round"/>
              <line x1="60" y1="178" x2="98" y2="178" stroke="#f0b429" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="70" y1="186" x2="98" y2="186" stroke="#f0b429" stroke-width="1" stroke-linecap="round"/>
            </g>

            <!-- Stars / sparkles -->
            <g opacity="0.6">
              <circle cx="90" cy="60" r="2" fill="#f0b429" class="sparkle s1"/>
              <circle cx="310" cy="50" r="1.5" fill="#f0b429" class="sparkle s2"/>
              <circle cx="350" cy="100" r="2" fill="#fff" class="sparkle s3"/>
              <circle cx="30" cy="120" r="1.5" fill="#fff" class="sparkle s4"/>
              <circle cx="260" cy="60" r="1" fill="#f0b429" class="sparkle s5"/>
            </g>
          </svg>
        </div>

        <!-- Footer -->
        <div class="branding-footer">
          <small>© 2026 TMQ Express · Tất cả quyền được bảo lưu</small>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MARK: - LOGIN FORM CARD                                               -->
      <!-- ===================================================================== -->
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
/* ============================================================================
   MARK: - STYLES
   ============================================================================ */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #091428 0%, #0f1f3d 40%, #0c1830 100%);
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
  background: var(--gold-400, #d4a829);
  top: -10%;
  right: -5%;
  animation: float1 20s ease-in-out infinite;
}

.shape-2 {
  width: 400px;
  height: 400px;
  background: var(--navy-400, #2a4f8a);
  bottom: -15%;
  left: -5%;
  animation: float2 25s ease-in-out infinite;
}

.shape-3 {
  width: 300px;
  height: 300px;
  background: var(--navy-300, #5a7db0);
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
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2.5rem;
  background: linear-gradient(155deg, #091428 0%, #0f2347 55%, #0a1a38 100%);
}

.branding-content {
  position: relative;
  z-index: 2;
}

/* === ILLUSTRATION === */
.branding-illustration {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0;
  position: relative;
  min-height: 0; /* important: allow flex child to shrink */
}

.illus-svg {
  width: 100%;
  height: 100%;
  max-height: 320px;
  overflow: visible;
}

/* Truck slides in from left */
.truck-group {
  animation: truckSlideIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes truckSlideIn {
  from { transform: translateX(-120px); opacity: 0; }
  to   { transform: translateX(0);      opacity: 1; }
}

/* Speed lines fade in after truck */
.speed-lines {
  animation: fadeInLines 0.6s 0.8s ease both;
}
@keyframes fadeInLines {
  from { opacity: 0; }
  to   { opacity: 0.4; }
}

/* Route path draws itself */
.route-path {
  stroke-dasharray: 10 8;
  animation: routeDraw 2s 0.3s linear infinite;
}
@keyframes routeDraw {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -36; }
}

/* Location pins bounce in */
.pin-1 { animation: pinBounce 0.6s 1.0s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.pin-2 { animation: pinBounce 0.6s 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.pin-3 { animation: pinBounce 0.6s 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes pinBounce {
  from { transform: translateY(-12px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}

/* Floating parcels */
.parcel-bg-1 { animation: floatParcel 4s 0.5s ease-in-out infinite; }
.parcel-bg-2 { animation: floatParcel 5s 1.5s ease-in-out infinite; }
@keyframes floatParcel {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

/* Sparkle twinkle */
.sparkle { animation: twinkle 3s ease-in-out infinite; }
.s1 { animation-delay: 0s; }
.s2 { animation-delay: 0.8s; }
.s3 { animation-delay: 1.5s; }
.s4 { animation-delay: 2.2s; }
.s5 { animation-delay: 0.4s; }
@keyframes twinkle {
  0%, 100% { opacity: 0.6; r: 2; }
  50%       { opacity: 1;   r: 3; }
}



.branding-logo {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
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
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.branding-tagline {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.branding-footer {
  position: relative;
  z-index: 2;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
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
