# Hướng dẫn Deploy TMQ Express lên VPS (Demo)

> **Mục đích:** Deploy nhanh để demo cho khách hàng, truy cập qua địa chỉ IP.  
> **Không cần:** Domain, Nginx, HTTPS, SSL certificate.  
> **Kiến trúc:**
> ```
> Khách hàng (trình duyệt)
>        ↓  http://<IP_VPS>
> [serve - port 80]   ← frontend static files
>        ↓  proxy /api → localhost:3000
> [Fastify - port 3000]  ← backend API
>        ↓
> [PostgreSQL - port 5432]
> ```

---

## Yêu cầu VPS

| Thông số | Tối thiểu |
|---|---|
| OS | Ubuntu 22.04 LTS |
| RAM | 1 GB |
| CPU | 1 vCPU |
| Disk | 20 GB |
| Mở port | **80** (HTTP), **22** (SSH) |

> Port 3000 (backend) **không cần mở ra ngoài** — chỉ cần nội bộ trong VPS.

---

## Bước 1: Kết nối VPS

```bash
ssh root@<IP_VPS>
# hoặc nếu dùng user khác:
ssh ubuntu@<IP_VPS>
```

---

## Bước 2: Cài đặt phần mềm cần thiết

```bash
# Cập nhật hệ thống
apt update && apt upgrade -y

# Cài Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Kiểm tra
node -v   # phải >= 20.x
npm -v

# Cài PM2 (trình quản lý tiến trình)
npm install -g pm2

# Cài serve (web server cho static files)
npm install -g serve

# Cài PostgreSQL
apt install -y postgresql postgresql-contrib

# Kiểm tra PostgreSQL đang chạy
systemctl status postgresql
```

---

## Bước 3: Tạo database PostgreSQL

```bash
# Đăng nhập vào PostgreSQL
sudo -u postgres psql

# Tạo user và database
CREATE USER tmq_user WITH PASSWORD 'TmqDemo@2026';
CREATE DATABASE tmq_express OWNER tmq_user;
GRANT ALL PRIVILEGES ON DATABASE tmq_express TO tmq_user;
\q
```

---

## Bước 4: Tải code lên VPS

### Cách A — Dùng Git (khuyến nghị)

```bash
# Nếu repo trên GitHub/GitLab
cd /opt
git clone https://github.com/<user>/TMQ-Express.git
cd TMQ-Express
```

### Cách B — Upload thủ công (dùng SCP từ máy Windows)

Mở PowerShell trên máy của bạn, chạy:

```powershell
# Upload toàn bộ project (bỏ qua node_modules)
scp -r d:\Working\TMQ-Express root@<IP_VPS>:/opt/TMQ-Express
```

> **Lưu ý:** Nếu upload thủ công, cần xóa `node_modules` trước khi scp để tránh to file:
> ```powershell
> # Tạo bản copy không có node_modules
> xcopy d:\Working\TMQ-Express d:\Working\TMQ-Express-deploy /E /I /EXCLUDE:exclude-list.txt
> ```
> Hoặc đơn giản hơn: dùng Git là nhanh nhất.

---

## Bước 5: Cài đặt & cấu hình Backend

```bash
cd /opt/TMQ-Express/backend

# Cài dependencies
npm install

# Tạo file .env
cp .env.example .env
nano .env
```

Nội dung file `.env` trên VPS:

```env
DATABASE_URL=postgresql://tmq_user:TmqDemo@2026@localhost:5432/tmq_express

# Đổi thành chuỗi random mạnh hơn!
JWT_SECRET=TmqExpress-Demo-Secret-Key-2026-XyZ

JWT_EXPIRES_IN=8h
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# CORS: cho phép frontend gọi API
# Điền IP VPS vào đây (port 80)
CORS_ORIGIN=http://<IP_VPS>
```

> **Lưu ý `CORS_ORIGIN`:** Điền đúng IP VPS của bạn, ví dụ `http://103.200.1.50`  
> Nếu không chắc IP, mở cửa sổ khác và chạy: `curl ifconfig.me`

```bash
# Chạy migration database
npx prisma migrate deploy

# Seed dữ liệu mẫu (tuỳ chọn — để demo có sẵn dữ liệu)
node prisma/seed.js
```

---

## Bước 6: Build Frontend

```bash
cd /opt/TMQ-Express/frontend

# Cài dependencies
npm install

# Build production — frontend sẽ dùng /api (relative path)
# Không cần thay đổi gì vì client.js dùng baseURL: '/api'
npm run build
```

Sau khi build xong, thư mục `dist/` chứa toàn bộ static files.

---

## Bước 7: Khởi động các dịch vụ với PM2

### 7.1. Khởi động Backend

```bash
cd /opt/TMQ-Express/backend

pm2 start npm --name "tmq-backend" -- start

# Kiểm tra log
pm2 logs tmq-backend
```

Kết quả mong đợi trong log:
```
🚀 TMQ Express API running at http://0.0.0.0:3000
```

### 7.2. Khởi động Frontend (serve static files)

```bash
# Serve thư mục dist trên port 80
# --single: cần thiết cho Vue Router (SPA)
pm2 start serve --name "tmq-frontend" -- --single /opt/TMQ-Express/frontend/dist --listen 80

# Kiểm tra log
pm2 logs tmq-frontend
```

> **Nếu bị lỗi "permission denied" ở port 80:**
> ```bash
> # Cấp quyền cho Node.js dùng port < 1024
> apt install -y libcap2-bin
> setcap cap_net_bind_service=+ep $(which node)
> ```
> Sau đó chạy lại lệnh PM2.

### 7.3. Lưu PM2 để tự khởi động khi VPS reboot

```bash
pm2 save
pm2 startup
# Chạy lệnh mà pm2 startup in ra màn hình (dạng: sudo env PATH=...)
```

---

## Bước 8: Kiểm tra hoạt động

```bash
# Kiểm tra backend API
curl http://localhost:3000/api/health
# Kết quả mong đợi: {"success":true,"data":{"status":"ok",...}}

# Kiểm tra tất cả tiến trình PM2
pm2 list
```

Mở trình duyệt và truy cập: **`http://<IP_VPS>`**

---

## Tài khoản đăng nhập mặc định (sau khi seed)

| Username | Role | Văn phòng |
|---|---|---|
| `admin` | Admin | VP Tp.HCM |
| `ketoan` | Kế toán | VP Tp.HCM |
| `staff_sg` | Nhân viên | VP Tp.HCM |
| `staff_ct` | Nhân viên | VP Cần Thơ |
| `ketoan_ct` | Kế toán | VP Cần Thơ |
| `staff_rg` | Nhân viên | VP Rạch Giá |

**Mật khẩu chung:** `Tmq@1234`

---

## Các lệnh quản lý thường dùng

```bash
# Xem trạng thái tất cả dịch vụ
pm2 list

# Xem log realtime
pm2 logs              # tất cả
pm2 logs tmq-backend  # chỉ backend

# Restart
pm2 restart tmq-backend
pm2 restart tmq-frontend

# Stop
pm2 stop all

# Khi có code mới (git pull)
cd /opt/TMQ-Express
git pull

# Update backend
cd backend
npm install
npx prisma migrate deploy
pm2 restart tmq-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart tmq-frontend
```

---

## Xử lý sự cố thường gặp

### ❌ Frontend hiển thị trang trắng hoặc lỗi 404 khi reload

**Nguyên nhân:** Thiếu flag `--single` khi chạy `serve` (cần thiết cho Vue Router).

```bash
# Dừng và khởi động lại với flag --single
pm2 stop tmq-frontend
pm2 delete tmq-frontend
pm2 start serve --name "tmq-frontend" -- --single /opt/TMQ-Express/frontend/dist --listen 80
pm2 save
```

### ❌ Frontend không gọi được API (lỗi CORS hoặc Network Error)

**Nguyên nhân:** `CORS_ORIGIN` trong `.env` backend chưa đúng, hoặc frontend gọi sai địa chỉ.

Kiểm tra `backend/.env`:
```env
CORS_ORIGIN=http://<IP_VPS>  # đúng IP của VPS bạn đang dùng
```

```bash
pm2 restart tmq-backend
```

> **Lý do frontend hoạt động được mà không cần cấu hình proxy:**  
> File `src/api/client.js` dùng `baseURL: '/api'` (relative path). Khi trình duyệt gọi `http://<IP_VPS>/api/...`, `serve` sẽ không biết xử lý → trả 404. Xem giải pháp ở Lưu ý quan trọng bên dưới.

---

## ⚠️ Lưu ý quan trọng: Proxy /api

Vì frontend (port 80) và backend (port 3000) chạy trên 2 port khác nhau, cần một bước proxy `/api` từ port 80 → port 3000. Trong môi trường dev, Vite tự làm việc này. Trên production có 2 cách:

### Cách 1 — Backend serve luôn cả frontend (đơn giản nhất ✅)

Thêm plugin `@fastify/static` để backend serve thư mục `dist`:

```bash
cd /opt/TMQ-Express/backend
npm install @fastify/static
```

Thêm vào cuối `src/server.js` (trước phần `fastify.listen`):

```js
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
  // SPA fallback: mọi route không phải /api đều trả index.html
  wildcard: false,
});

// SPA fallback
fastify.setNotFoundHandler(async (request, reply) => {
  if (!request.url.startsWith('/api')) {
    return reply.sendFile('index.html');
  }
  return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND' } });
});
```

Sau đó chỉ cần **1 tiến trình** chạy trên port 80:

```bash
# Sửa .env: đổi PORT=80
nano /opt/TMQ-Express/backend/.env
# PORT=80
# HOST=0.0.0.0

# Restart backend (không cần tmq-frontend nữa)
pm2 stop tmq-frontend
pm2 delete tmq-frontend
pm2 restart tmq-backend
pm2 save
```

Truy cập: `http://<IP_VPS>` → Vào thẳng app.

### Cách 2 — Dùng `http-proxy` đơn giản (không sửa code)

```bash
npm install -g http-server http-proxy-middleware
```

Tạo file `/opt/proxy-server.js`:

```js
const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const proxy = httpProxy.createProxyServer({});
const DIST_DIR = '/opt/TMQ-Express/frontend/dist';

http.createServer((req, res) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/scan')) {
    proxy.web(req, res, { target: 'http://localhost:3000' });
  } else {
    // Serve static file
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(DIST_DIR, filePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      fs.createReadStream(fullPath).pipe(res);
    } else {
      // SPA fallback
      fs.createReadStream(path.join(DIST_DIR, 'index.html')).pipe(res);
    }
  }
}).listen(80, () => console.log('Proxy running on port 80'));
```

**→ Khuyến nghị dùng Cách 1** (backend serve frontend) vì đơn giản, ít tiến trình hơn.

---

## Tóm tắt nhanh (sau khi đã cài đặt lần đầu)

```
1. SSH vào VPS
2. cd /opt/TMQ-Express && git pull
3. cd backend  → npm install → npx prisma migrate deploy → pm2 restart tmq-backend
4. cd frontend → npm install → npm run build
5. Mở trình duyệt → http://<IP_VPS>
```
