<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const props = defineProps({
  data: { type: ArrayBuffer, default: null },
});

const canvasContainer = ref(null);
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.5);
let pdfDoc = null;

async function renderPage(pageNum) {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: scale.value });

  // Tạo canvas cho page
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto 8px auto';
  canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function renderAll() {
  if (!props.data || !canvasContainer.value) return;

  // Clear
  canvasContainer.value.innerHTML = '';

  const typedArray = new Uint8Array(props.data);
  pdfDoc = await pdfjsLib.getDocument({ data: typedArray }).promise;
  totalPages.value = pdfDoc.numPages;

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const canvas = await renderPage(i);
    canvasContainer.value.appendChild(canvas);
  }
}

watch(() => props.data, async (val) => {
  if (val) {
    await nextTick();
    renderAll();
  }
});

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3);
  renderAll();
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.5);
  renderAll();
}

onUnmounted(() => {
  if (pdfDoc) pdfDoc.destroy();
});
</script>

<template>
  <div class="pdf-viewer">
    <div class="pdf-toolbar">
      <span>{{ totalPages }} trang</span>
      <div class="pdf-zoom">
        <button @click="zoomOut" title="Thu nhỏ">−</button>
        <span>{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" title="Phóng to">+</button>
      </div>
    </div>
    <div ref="canvasContainer" class="pdf-canvas-container"></div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pdf-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #475569;
}

.pdf-zoom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pdf-zoom button {
  width: 28px;
  height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  color: #334155;
}

.pdf-zoom button:hover {
  background: #e2e8f0;
}

.pdf-canvas-container {
  flex: 1;
  overflow: auto;
  background: #94a3b8;
  border-radius: 6px;
  padding: 8px;
}
</style>
