<template>
  <div class="not-found-wrapper">
    <div class="not-found-card">
      <div class="error-code">404</div>
      <div class="divider"></div>
      <h1 class="error-title">Trang không tồn tại</h1>
      <p class="error-desc">
        Đường dẫn bạn truy cập không được tìm thấy.<br />
        Có thể trang đã bị xóa hoặc địa chỉ không chính xác.
      </p>
      <RouterLink to="/" class="home-btn">
        <span class="btn-icon">🏠</span>
        Về trang chủ
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.not-found-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eef9 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.not-found-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 56px 64px;
  text-align: center;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
  max-width: 480px;
  width: 90%;
}

.error-code {
  font-size: 100px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -4px;
}

.divider {
  width: 60px;
  height: 4px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 2px;
  margin: 20px auto;
}

.error-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px;
}

.error-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.7;
  margin: 0 0 32px;
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #ffffff;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 50px;
  font-size: 15px;
  font-weight: 600;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.home-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.home-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 18px;
}
</style>
