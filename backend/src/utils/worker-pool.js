/**
 * Worker Pool utility — chạy CPU-intensive tasks trên Worker Thread
 * để tránh block event loop của Fastify.
 *
 * Sử dụng:
 *   import { renderPDFInWorker } from '../utils/worker-pool.js';
 *   const buffer = await renderPDFInWorker(docDefinition);
 */
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_PATH = join(__dirname, '../workers/pdf-render.worker.js');
const FONTS_DIR = join(__dirname, '../../fonts');

/**
 * Render PDF document definition trong Worker Thread.
 * @param {object} docDefinition — pdfmake document definition (phải JSON-serializable)
 * @returns {Promise<Buffer>} PDF buffer
 */
export function renderPDFInWorker(docDefinition) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { docDefinition, fontsDir: FONTS_DIR },
    });

    worker.on('message', (result) => {
      if (result?.error) {
        reject(new Error(`[PDFWorker] ${result.error}`));
      } else {
        resolve(Buffer.from(result));
      }
      worker.terminate();
    });

    worker.on('error', (err) => {
      reject(new Error(`[PDFWorker] ${err.message}`));
      worker.terminate();
    });

    // Timeout 30s — PDF generation không nên quá lâu
    const timeout = setTimeout(() => {
      reject(new Error('[PDFWorker] Timeout after 30s'));
      worker.terminate();
    }, 30_000);

    worker.on('exit', () => clearTimeout(timeout));
  });
}
