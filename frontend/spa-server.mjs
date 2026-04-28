// spa-server.mjs — SPA server with /api proxy to backend :3000
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = 5173;
const BACKEND = { host: '127.0.0.1', port: 3000 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  // Proxy /api/* → backend :3000
  if (req.url.startsWith('/api/') || req.url.startsWith('/api')) {
    const options = {
      hostname: BACKEND.host,
      port: BACKEND.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` },
    };

    const proxy = http.request(options, (backendRes) => {
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res, { end: true });
    });

    proxy.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502);
      res.end('Backend unavailable');
    });

    req.pipe(proxy, { end: true });
    return;
  }

  // Serve static files
  res.setHeader('Access-Control-Allow-Origin', '*');
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath);

  // SPA fallback: if not a real file → serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`[SPA Server] Frontend: http://localhost:${PORT}`);
  console.log(`[SPA Server] API proxy: /api/* → http://${BACKEND.host}:${BACKEND.port}`);
});
