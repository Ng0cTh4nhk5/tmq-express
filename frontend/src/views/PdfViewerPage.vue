<script setup>
// ============================================================================
// MARK: - IMPORTS & CONFIG
// ============================================================================
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api/client';

const route = useRoute();
const id = route.params.id;

// ============================================================================
// MARK: - LIFECYCLE: LOAD PDF PREVIEW
// ============================================================================
onMounted(async () => {
  try {
    const { data: res } = await api.get(`/bien-nhan/${id}/pdf-preview`);

    const binaryStr = atob(res.data.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    // Mở PDF trong tab hiện tại (page này đã là _blank)
    window.location.replace(blobUrl);
    // Revoke sau 30s để tránh memory leak
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (e) {
    // Escape error message để tránh XSS
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#ef4444;';
    const inner = document.createElement('div');
    inner.style.textAlign = 'center';
    const h2 = document.createElement('h2');
    h2.textContent = 'Không thể tải PDF';
    const p = document.createElement('p');
    p.textContent = e.message || 'Lỗi không xác định';
    const btn = document.createElement('button');
    btn.textContent = 'Đóng';
    btn.style.cssText = 'margin-top:1rem;padding:8px 20px;cursor:pointer;';
    btn.onclick = () => window.close();
    inner.append(h2, p, btn);
    errorDiv.append(inner);
    document.body.innerHTML = '';
    document.body.append(errorDiv);
  }
});
</script>

<template>
  <!-- ===================================================================== -->
  <!-- MARK: - LOADING LAYOUT                                                -->
  <!-- ===================================================================== -->
  <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;">
    <div style="text-align:center">
      <div style="font-size:2rem;margin-bottom:0.5rem;">⏳</div>
      <p>Đang tải PDF...</p>
    </div>
  </div>
</template>
