<script setup>
// ============================================================================
// MARK: - IMPORTS & SEARCH LOGIC
// ============================================================================
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const maSo = ref('');
const error = ref('');

function search() {
  const code = maSo.value.trim().toUpperCase();
  if (!code) {
    error.value = 'Vui lòng nhập mã biên nhận';
    return;
  }
  error.value = '';
  router.push({ name: 'Scan', params: { ma_so: code } });
}
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - BRANDING HEADER                                               -->
  <!-- ===================================================================== -->
  <div class="scan-home-page">
    <div class="scan-home-card">
      <!-- Brand header -->
      <div class="scan-home-header">
        <img src="/logo.png" alt="TMQ Express" class="brand-logo" />
        <div class="brand-info">
          <span class="brand-name">TMQ <span class="brand-accent">Express</span></span>
          <span class="brand-sub">Tra cứu biên nhận</span>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MARK: - SEARCH INPUT BOX                                              -->
      <!-- ===================================================================== -->
      <!-- Body -->
      <div class="scan-home-body">
        <div class="icon-wrapper">
          <i class="pi pi-search" style="font-size: 3rem; color: #2563eb;"></i>
        </div>
        <h2 class="scan-title">Tra cứu hàng hóa</h2>
        <p class="scan-desc">Nhập mã biên nhận để kiểm tra trạng thái vận chuyển</p>

        <div class="search-box">
          <input
            v-model="maSo"
            class="search-input"
            placeholder="VD: SGCT-0001"
            @keyup.enter="search"
            autofocus
          />
          <button class="search-btn" @click="search">
            <i class="pi pi-arrow-right"></i>
          </button>
        </div>

        <p v-if="error" class="search-error">{{ error }}</p>

        <div class="scan-hint">
          <i class="pi pi-info-circle"></i>
          Mã biên nhận có dạng <strong>VPXX-XXXX</strong> — in trên phiếu giao hàng
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- MARK: - FOOTER INFO                                                   -->
      <!-- ===================================================================== -->
      <div class="scan-home-footer">
        © 2026 TMQ Express · Hệ thống quản lý vận chuyển & tài chính
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================================
   MARK: - STYLES
   ============================================================================ */
.scan-home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2044 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  font-family: 'Inter', sans-serif;
}

.scan-home-card {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Header */
.scan-home-header {
  background: linear-gradient(135deg, #1e40af, #7c3aed);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  background: white;
  padding: 3px;
}

.brand-info { display: flex; flex-direction: column; }

.brand-name {
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.3px;
}

.brand-accent { color: #fbbf24; }

.brand-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 1px;
}

/* Body */
.scan-home-body {
  padding: 2rem 1.75rem 1.5rem;
  text-align: center;
}

.icon-wrapper {
  width: 72px;
  height: 72px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.scan-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.4rem;
}

.scan-desc {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

/* Search box */
.search-box {
  display: flex;
  gap: 0;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-input {
  flex: 1;
  padding: 0.8rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  outline: none;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #1e293b;
}

.search-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.search-btn {
  padding: 0 1.2rem;
  background: #2563eb;
  border: none;
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
}

.search-btn:hover { background: #1d4ed8; }

/* Error */
.search-error {
  color: #ef4444;
  font-size: 0.83rem;
  margin-top: 0.5rem;
  text-align: left;
}

/* Hint */
.scan-hint {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #64748b;
  font-size: 0.8rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  margin-top: 1rem;
  text-align: left;
}

.scan-hint i { color: #2563eb; flex-shrink: 0; }

/* Footer */
.scan-home-footer {
  text-align: center;
  color: #94a3b8;
  font-size: 0.72rem;
  padding: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

/* Responsive */
@media (max-width: 480px) {
  .scan-home-card { border-radius: 16px; }
  .scan-home-body { padding: 1.5rem 1.25rem 1.25rem; }
}
</style>
