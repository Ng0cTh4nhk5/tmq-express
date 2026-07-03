/**
 * Worker Thread cho PDF rendering — chạy pdfmake ngoài main thread
 * để tránh block event loop khi generate PDF lớn (Sổ biên nhận, v.v.)
 *
 * Input:  { docDefinition, fontsDir }
 * Output: Buffer (Uint8Array) chứa nội dung PDF
 */
import { parentPort, workerData } from 'worker_threads';
import PdfPrinter from 'pdfmake/src/printer.js';
import { join } from 'path';

const { docDefinition, fontsDir } = workerData;

const fonts = {
  Roboto: {
    normal: join(fontsDir, 'Roboto-Regular.ttf'),
    bold: join(fontsDir, 'Roboto-Medium.ttf'),
    italics: join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
};

const printer = new PdfPrinter(fonts);

try {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    parentPort.postMessage(buffer);
  });
  pdfDoc.on('error', (err) => {
    parentPort.postMessage({ error: err.message });
  });
  pdfDoc.end();
} catch (err) {
  parentPort.postMessage({ error: err.message });
}
