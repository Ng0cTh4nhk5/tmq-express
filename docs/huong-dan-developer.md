# TMQ Express ERP — Hướng dẫn cho Lập trình viên

> **Phiên bản:** 1.2
> **Ngày cập nhật:** 05/04/2026
> **Đối tượng:** Developer, DevOps

---

## Phần 1: Chạy chương trình ở Local

### 1.1. Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| **Node.js** | 20.x trở lên | Khuyến nghị LTS |
| **npm** | 10.x trở lên | Đi kèm Node.js |
| **PostgreSQL** | 15.x trở lên | Hoặc dùng Docker |
| **Git** | 2.x | Quản lý source code |

### 1.2. Cấu trúc dự án

```
TMQ-Express/
├── backend/                        # Fastify + Prisma API
│   ├── fonts/                      # Font Roboto cho PDF (4 files .ttf)
│   ├── prisma/
│   │   ├── schema.prisma           # Mô hình dữ liệu (12 bảng, 8 enums)
│   │   ├── migrations/             # Lịch sử migration
│   │   └── seed.js                 # Dữ liệu mẫu (3 VP, 4 NV, 10 KH)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         # Prisma client singleton
│   │   │   └── env.js              # Validate & export biến môi trường
│   │   ├── plugins/
│   │   │   ├── auth.js             # JWT authentication + token_version verify
│   │   │   ├── rbac.js             # Role-based access control
│   │   │   ├── error-handler.js    # Centralized error response
│   │   │   ├── request-context.js  # AsyncLocalStorage for audit log context
│   │   │   └── audit-log.js        # Audit logging utility (writeAuditLog)
│   │   ├── routes/                 # 12 route files
│   │   │   ├── auth.routes.js      # POST /login
│   │   │   ├── bien-nhan.routes.js # CRUD + trạng thái + batch + PDF
│   │   │   ├── khach-hang.routes.js
│   │   │   ├── van-phong.routes.js
│   │   │   ├── nhan-vien.routes.js
│   │   │   ├── phieu-thu.routes.js # CRUD + PDF + hủy
│   │   │   ├── phieu-chi.routes.js # CRUD + PDF + hủy
│   │   │   ├── cong-no.routes.js   # List + xác nhận thanh toán
│   │   │   ├── bang-ke.routes.js   # BN chờ + xuất Excel + download
│   │   │   ├── dashboard.routes.js # 4 thống kê + 3 biểu đồ
│   │   │   ├── bao-cao.routes.js   # 4 loại báo cáo
│   │   │   └── scan.routes.js      # Public QR tracking
│   │   ├── services/               # 12 service files (business logic)
│   │   │   ├── auth.service.js
│   │   │   ├── bien-nhan.service.js
│   │   │   ├── khach-hang.service.js
│   │   │   ├── van-phong.service.js
│   │   │   ├── nhan-vien.service.js
│   │   │   ├── phieu-thu.service.js
│   │   │   ├── phieu-chi.service.js
│   │   │   ├── cong-no.service.js
│   │   │   ├── bang-ke.service.js  # Xuất Excel (ExcelJS)
│   │   │   ├── dashboard.service.js
│   │   │   ├── bao-cao.service.js
│   │   │   └── pdf.service.js      # Biên nhận A5 ngang, Phiếu thu/chi PDF
│   │   ├── utils/
│   │   │   └── ma-so-generator.js  # Auto-generate mã BN, PT, PC, BK
│   │   └── server.js               # Entry point (Fastify bootstrap)
│   ├── tests/
│   │   ├── generate-postman.cjs    # Script tạo Postman collection
│   │   └── collections/            # Postman collection + test results
│   ├── nodemon.json                # Nodemon config (watch src/)
│   ├── .env.example                # Mẫu biến môi trường
│   └── package.json
├── frontend/                       # Vue 3 + PrimeVue 4 SPA
│   ├── public/                     # Static assets
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Axios instance (baseURL: /api, JWT interceptor)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppHeader.vue   # Header bar (user info, logout)
│   │   │   │   ├── AppSidebar.vue  # Navigation menu (role-based)
│   │   │   │   └── MainLayout.vue  # Sidebar + Header wrapper
│   │   │   └── bien-nhan/
│   │   │       ├── PdfViewer.vue   # PDF.js viewer component
│   │   │       └── StatusBadge.vue # Trạng thái badge (color-coded)
│   │   ├── router/
│   │   │   └── index.js            # 16 routes + auth guards
│   │   ├── stores/
│   │   │   └── auth.store.js       # Pinia auth (login, logout, isAdmin)
│   │   ├── utils/
│   │   │   └── error-handler.js    # handleApiError — PrimeVue toast
│   │   ├── views/                  # 16 page views
│   │   │   ├── LoginView.vue
│   │   │   ├── HomeView.vue
│   │   │   ├── DashboardView.vue   # 4 cards + 3 ECharts + auto-refresh
│   │   │   ├── BienNhanListView.vue
│   │   │   ├── BienNhanFormView.vue # Tạo/Sửa BN + auto-complete KH
│   │   │   ├── KhachHangListView.vue
│   │   │   ├── KhachHangFormView.vue
│   │   │   ├── PhieuThuView.vue
│   │   │   ├── PhieuChiView.vue
│   │   │   ├── CongNoView.vue
│   │   │   ├── BangKeView.vue      # Tab BN chờ + Tab lịch sử
│   │   │   ├── BaoCaoView.vue      # 4 loại báo cáo
│   │   │   ├── VanPhongView.vue
│   │   │   ├── NhanVienView.vue
│   │   │   ├── ScanView.vue        # Public QR tracking (no auth)
│   │   │   └── PdfViewerPage.vue   # PDF preview page
│   │   ├── assets/                 # CSS styles
│   │   ├── App.vue
│   │   └── main.js                 # Vue app bootstrap
│   ├── .env                        # VITE_API_URL, VITE_APP_TITLE
│   ├── index.html
│   ├── vite.config.js              # Vite + Vue plugin + API proxy
│   └── package.json
└── docs/                           # Tài liệu dự án
    ├── 01_KeHoach_ThietKe_BaoGia/  # Tài liệu thiết kế & báo giá
    ├── 02_KhaoSat_YeuCau/          # Khảo sát yêu cầu nghiệp vụ
    ├── database-schema.md          # Mô tả database schema
    ├── mo-ta-chuc-nang.md          # Mô tả chức năng hệ thống
    ├── huong-dan-su-dung.md        # Hướng dẫn cho end-user
    ├── quy-trinh-nghiep-vu.md      # Quy trình nghiệp vụ thực tế
    └── huong-dan-developer.md      # (File này)
```

### 1.3. Tech Stack

| Layer | Công nghệ | Phiên bản | Mục đích |
|---|---|---|---|
| **Backend** | Fastify | 5.3 | HTTP server, routing, validation |
| | Prisma ORM | 6.5 | Database access, migration, schema |
| | bcryptjs | 2.4 | Hash password |
| | @fastify/jwt | 9.0 | JWT authentication |
| | @fastify/rate-limit | 10.3 | Chống brute-force |
| | pdfmake | 0.2 | Xuất PDF (BN, PT, PC) |
| | ExcelJS | 4.4 | Xuất Excel (Bảng kê HĐĐT) |
| | qrcode | 1.5 | Tạo QR code trên PDF |
| **Frontend** | Vue 3 | 3.5 | UI framework |
| | PrimeVue | 4.5 | UI component library |
| | Pinia | 3.0 | State management |
| | Vue Router | 4.6 | SPA routing |
| | Axios | 1.14 | HTTP client |
| | ECharts / vue-echarts | 6.0 / 8.0 | Biểu đồ Dashboard |
| | pdfjs-dist | 5.6 | Hiển thị PDF trong browser |
| **Database** | PostgreSQL | 15+ | 12 bảng, 8 enums |
| **Dev Tools** | nodemon | 3.1 | Auto-reload backend |
| | Vite | 8.0 | Frontend dev server + HMR |

### 1.4. Cài đặt từng bước

#### Bước 1: Clone & cài dependencies

```bash
# Clone repo
git clone <repo-url> TMQ-Express
cd TMQ-Express

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### Bước 2: Tạo database PostgreSQL

```bash
# Dùng psql CLI
psql -U postgres
```

```sql
CREATE DATABASE tmq_express;
CREATE USER tmq_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tmq_express TO tmq_user;
-- Trên PostgreSQL 15+, cần thêm:
\c tmq_express
GRANT ALL ON SCHEMA public TO tmq_user;
```

**Hoặc dùng Docker (nhanh hơn):**

```bash
docker run -d \
  --name tmq-postgres \
  -e POSTGRES_DB=tmq_express \
  -e POSTGRES_USER=tmq_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16-alpine
```

#### Bước 3: Cấu hình Backend (.env)

```bash
cd backend
cp .env.example .env
```

Mở file `.env` và chỉnh sửa:

```env
# Bắt buộc — Connection string PostgreSQL
DATABASE_URL=postgresql://tmq_user:your_password@localhost:5432/tmq_express

# Bắt buộc — JWT secret (tối thiểu 16 ký tự)
JWT_SECRET=my-super-secret-key-for-dev-1234

# Tùy chọn (giá trị mặc định)
JWT_EXPIRES_IN=8h
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

> **Quan trọng:**
> - `DATABASE_URL` và `JWT_SECRET` là **bắt buộc** — backend sẽ crash nếu thiếu
> - `JWT_SECRET` phải ≥ 16 ký tự
> - `CORS_ORIGIN` phải khớp với URL frontend dev server

#### Bước 4: Khởi tạo database (Migration + Seed)

```bash
cd backend

# Chạy migration — tạo 10 bảng
npx prisma migrate dev

# Seed dữ liệu mẫu
npm run db:seed
```

**Seed tạo ra:**

| Dữ liệu | Chi tiết |
|---|---|
| 3 Văn phòng | `SG` (VP Tp.HCM), `CT` (VP Cần Thơ), `RG` (VP Rạch Giá) |
| 4 Nhân viên | `admin` (Admin), `staff_ct` (Staff), `staff_rg` (Staff), `ketoan` (Accountant) |
| Mật khẩu chung | `Tmq@1234` cho tất cả |
| 10 Khách hàng | `KH-001` → `KH-010` |

#### Bước 5: Chạy ứng dụng

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Output: `🚀 TMQ Express API running at http://0.0.0.0:3000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Output: `Local: http://localhost:5173/`

#### Bước 6: Kiểm tra

- **Backend health:** Mở `http://localhost:3000/api/health` → `{"success":true}`
- **Frontend:** Mở `http://localhost:5173` → Trang đăng nhập
- **Đăng nhập:** `admin` / `Tmq@1234`

### 1.5. Proxy & API Flow (Local)

```
Browser → http://localhost:5173/api/*
                   ↓ (Vite proxy)
        http://localhost:3000/api/*
                   ↓
            Fastify Backend
                   ↓
            PostgreSQL
```

Frontend dùng `baseURL: '/api'` (relative), Vite dev server proxy `/api/*` tới backend port 3000:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

### 1.6. API Endpoints

| Prefix | Method | Endpoints chính | Auth | Role |
|---|---|---|---|---|
| `/api/auth` | POST | `/login` | — | — |
| `/api/bien-nhan` | GET, POST, PUT | CRUD + `/next-ma-so` + `/:id/pdf` + `/:id/pdf-preview` | ✅ | admin, staff |
| `/api/bien-nhan` | PATCH | `/:id/trang-thai` + `/batch-trang-thai` | ✅ | admin, staff |
| `/api/khach-hang` | GET, POST, PUT, PATCH | CRUD + `/search` + `/:id/toggle-active` | ✅ | admin, staff |
| `/api/van-phong` | GET, POST, PUT, PATCH | CRUD + `/:id/toggle-active` | ✅ | admin |
| `/api/nhan-vien` | GET, POST, PUT, PATCH | CRUD + `/:id/toggle-active` + `/:id/reset-password` | ✅ | admin |
| `/api/phieu-thu` | GET, POST, PUT, PATCH | CRUD + `/:id/pdf` + `/:id/huy` | ✅ | admin, accountant |
| `/api/phieu-chi` | GET, POST, PUT, PATCH | CRUD + `/:id/pdf` + `/:id/huy` | ✅ | admin, accountant |
| `/api/cong-no` | GET, PATCH | List + `/:id/xac-nhan` | ✅ | admin, accountant |
| `/api/bang-ke` | GET, POST | `/bien-nhan-cho` + `/xuat` + `/:id/download` | ✅ | admin |
| `/api/dashboard` | GET | `/stats` + `/doanh-thu-7-ngay` + `/ty-le-tuyen` + `/thu-chi-theo-thang` | ✅ | all |
| `/api/bao-cao` | GET | `/doanh-thu` + `/so-quy` + `/bien-nhan` + `/cong-no` | ✅ | admin, accountant |
| `/api/scan` | GET | `/:ma_so` (public QR tracking) | — | — |
| `/api/health` | GET | Health check | — | — |

### 1.7. Các lệnh hữu ích

| Lệnh | Thư mục | Mô tả |
|---|---|---|
| `npm run dev` | `backend/` | Start backend (nodemon, auto-reload khi sửa `src/`) |
| `npm run start` | `backend/` | Start backend production mode |
| `npm run dev` | `frontend/` | Start frontend (Vite HMR) |
| `npm run build` | `frontend/` | Build production → `dist/` |
| `npm run preview` | `frontend/` | Preview production build locally |
| `npx prisma migrate dev` | `backend/` | Tạo + chạy migration mới |
| `npx prisma migrate deploy` | `backend/` | Chạy migration (production, không tạo mới) |
| `npx prisma studio` | `backend/` | Mở GUI xem database (port 5555) |
| `npm run db:seed` | `backend/` | Chạy seed data (upsert — an toàn chạy nhiều lần) |
| `npx prisma generate` | `backend/` | Regenerate Prisma Client (sau khi sửa schema) |
| `npm run lint` | `backend/` | Lint source code |
| `npm run format` | `backend/` | Format source code (Prettier) |

### 1.8. Kiến trúc Backend

```
Request → Fastify
           ├── @fastify/cors           (CORS)
           ├── @fastify/rate-limit     (100 req/min, login: 5/min)
           ├── @fastify/jwt            (sign + verify)
           ├── plugins/error-handler.js (standardized errors)
           ├── plugins/request-context.js (AsyncLocalStorage — user/IP/UA)
           ├── plugins/auth.js         (authenticate + token_version verify)
           ├── plugins/rbac.js         (authorize decorator)
           ↓
        routes/*.js                    (schema validation → handler)
           ↓
        services/*.js                  (business logic + Prisma + audit log)
           ↓
        Prisma Client → PostgreSQL
```

**Patterns quan trọng:**
- **State Machine:** Trạng thái BN chỉ chuyển tuần tự (`ALLOWED_TRANSITIONS` trong `bien-nhan.routes.js`)
- **Atomic Transactions:** Tạo BN + Công nợ, Xác nhận thu + Phiếu thu, Hủy PT + Revert CN đều dùng `prisma.$transaction`
- **Code Generation:** `ma-so-generator.js` dùng `createWithCode()` với retry pattern tránh race condition trên unique constraint
- **Soft Delete:** Phiếu thu/chi chỉ đánh dấu `da_huy = true`, không xóa
- **Audit Logging:** Mọi CREATE/UPDATE/DELETE trên entities chính được ghi vào `audit_log` qua `writeAuditLog()`, sử dụng `AsyncLocalStorage` để truyền request context
- **JWT Revocation:** Mỗi request verify `token_version` từ DB — cho phép force logout ngay lập tức khi deactivate NV hoặc đổi mật khẩu
- **Whitelist Updates:** `updateBienNhan` chỉ cho phép sửa 17 fields cụ thể, chống field injection

### 1.9. Kiến trúc Frontend

```
App.vue → router/index.js
             ├── /login        → LoginView.vue        (no auth)
             ├── /scan/:maSo   → ScanView.vue         (no auth, public)
             ├── /pdf/:type/:id → PdfViewerPage.vue   (no auth)
             └── MainLayout.vue (auth required)
                  ├── /          → HomeView.vue
                  ├── /dashboard → DashboardView.vue
                  ├── /bien-nhan → BienNhanListView.vue
                  ├── /bien-nhan/tao → BienNhanFormView.vue
                  ├── /bien-nhan/:id → BienNhanFormView.vue (edit)
                  ├── /khach-hang    → KhachHangListView.vue
                  ├── /khach-hang/*  → KhachHangFormView.vue
                  ├── /bang-ke       → BangKeView.vue
                  ├── /phieu-thu     → PhieuThuView.vue
                  ├── /phieu-chi     → PhieuChiView.vue
                  ├── /cong-no       → CongNoView.vue
                  ├── /bao-cao       → BaoCaoView.vue
                  ├── /van-phong     → VanPhongView.vue
                  └── /nhan-vien     → NhanVienView.vue
```

**Patterns quan trọng:**
- **Auth:** `auth.store.js` lưu token vào `localStorage`, expose `isAdmin`, `hasRole()`
- **API Client:** `api/client.js` — Axios instance, auto-attach JWT, auto-redirect 401/TOKEN_REVOKED
- **Error Handling:** Mọi view dùng `handleApiError(error)` từ `utils/error-handler.js` → PrimeVue Toast
- **Role-based UI:** `AppSidebar.vue` ẩn/hiện menu theo role, các nút nhạy cảm check `isAdmin`
- **Account Lock UI:** `LoginView.vue` xử lý HTTP 423 và hiển thị thời gian còn lại

### 1.10. Troubleshooting Local

| Lỗi | Nguyên nhân | Giải pháp |
|---|---|---|
| `❌ DATABASE_URL is required` | Thiếu file `.env` | Copy `.env.example` → `.env` và điền giá trị |
| `❌ JWT_SECRET must be set and at least 16 characters` | JWT secret quá ngắn | Đặt chuỗi ≥ 16 ký tự trong `.env` |
| `P1001: Can't reach database server` | PostgreSQL chưa chạy | Start PostgreSQL service hoặc Docker container |
| `EADDRINUSE: port 3000` | Port bị chiếm | Kill process đang dùng port hoặc đổi `PORT` trong `.env` |
| Frontend trắng, console lỗi CORS | `CORS_ORIGIN` sai | Set `CORS_ORIGIN=http://localhost:5173` trong `.env` |
| PDF lỗi font | Thiếu thư mục `fonts/` | Kiểm tra `backend/fonts/` có 4 file Roboto `.ttf` |
| `Cannot find module '@prisma/client'` | Chưa generate | Chạy `npx prisma generate` trong `backend/` |

---

## Phần 2: Triển khai lên VPS

### 2.1. Yêu cầu VPS

| Tài nguyên | Tối thiểu | Khuyến nghị |
|---|---|---|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 1 GB | 2 GB |
| **Disk** | 20 GB SSD | 40 GB SSD |
| **OS** | Ubuntu 22.04+ | Ubuntu 24.04 LTS |
| **Network** | Public IPv4 | + Domain name |

### 2.2. Cài đặt môi trường VPS

#### 2.2.1. SSH vào VPS

```bash
ssh root@YOUR_VPS_IP
```

#### 2.2.2. Cập nhật & cài packages

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw
```

#### 2.2.3. Cài Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v    # 10.x
```

#### 2.2.4. Cài PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Tạo database
sudo -u postgres psql << 'EOF'
CREATE USER tmq_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE tmq_express OWNER tmq_user;
\c tmq_express
GRANT ALL ON SCHEMA public TO tmq_user;
EOF
```

> **Cảnh báo:** Thay `STRONG_PASSWORD_HERE` bằng mật khẩu mạnh thật sự!

#### 2.2.5. Cài PM2 (Process Manager)

```bash
npm install -g pm2
```

### 2.3. Deploy ứng dụng

#### 2.3.1. Clone source code

```bash
cd /opt
git clone <repo-url> tmq-express
cd tmq-express
```

#### 2.3.2. Setup Backend

```bash
cd /opt/tmq-express/backend
npm install --production

# Tạo file .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://tmq_user:STRONG_PASSWORD_HERE@localhost:5432/tmq_express
JWT_SECRET=GENERATE_A_RANDOM_64_CHAR_STRING_HERE
JWT_EXPIRES_IN=8h
PORT=3000
HOST=127.0.0.1
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
EOF
```

**Tạo JWT Secret mạnh:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Copy output → paste vào JWT_SECRET
```

**Chạy migration & seed:**
```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

> **Lưu ý:**
> - Production dùng `migrate deploy` (không phải `migrate dev`) — chỉ chạy migration, không tạo mới
> - `prisma generate` cần chạy trước khi start app (tạo Prisma Client)

#### 2.3.3. Build Frontend

```bash
cd /opt/tmq-express/frontend
npm install
npm run build
```

Output build nằm trong `frontend/dist/` — static files, served bởi Nginx.

#### 2.3.4. Start Backend với PM2

```bash
cd /opt/tmq-express/backend
pm2 start src/server.js --name tmq-api
pm2 save
pm2 startup   # tự start khi VPS reboot
```

**Kiểm tra:**
```bash
pm2 status          # Xem trạng thái
pm2 logs tmq-api    # Xem logs
curl http://127.0.0.1:3000/api/health   # Test API
```

### 2.4. Cấu hình Nginx (Reverse Proxy)

#### 2.4.1. Tạo file config

```bash
cat > /etc/nginx/sites-available/tmq-express << 'NGINX'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend — serve static files từ Vite build
    root /opt/tmq-express/frontend/dist;
    index index.html;

    # SPA fallback — mọi route trả về index.html để Vue Router xử lý
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API — proxy tới Fastify backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
    }

    # Nén response
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX
```

#### 2.4.2. Enable site

```bash
ln -sf /etc/nginx/sites-available/tmq-express /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # Xóa default site
nginx -t                                 # Test config
systemctl reload nginx
```

### 2.5. SSL Certificate (HTTPS)

```bash
certbot --nginx -d your-domain.com
```

Certbot sẽ:
- Tự động xin chứng chỉ Let's Encrypt (miễn phí)
- Tự cấu hình Nginx redirect HTTP → HTTPS
- Tự renew (cron job)

**Sau khi cài SSL, cập nhật:**
```bash
# Backend .env
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://your-domain.com|' /opt/tmq-express/backend/.env
pm2 restart tmq-api
```

### 2.6. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Verify
ufw status
```

> **Quan trọng:** KHÔNG mở port 3000 ra ngoài. Backend chỉ listen `127.0.0.1` — chỉ Nginx truy cập được.

### 2.7. Kiến trúc Production

```
Internet
   ↓
[your-domain.com:443 — HTTPS]
   ↓
┌─────────────────────────────────────┐
│              Nginx                  │
│  ┌──────────┐    ┌───────────────┐  │
│  │ /        │    │ /api/*        │  │
│  │ Static   │    │ Reverse Proxy │  │
│  │ (dist/)  │    │ → 127.0.0.1  │  │
│  │          │    │   :3000       │  │
│  └──────────┘    └───────┬───────┘  │
└──────────────────────────┼──────────┘
                           ↓
                    ┌──────────────┐
                    │  Fastify     │
                    │  (PM2)       │
                    │  Port 3000   │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │ PostgreSQL   │
                    │  Port 5432   │
                    └──────────────┘
```

### 2.8. Quy trình cập nhật (Update/Redeploy)

Khi có code mới:

```bash
cd /opt/tmq-express

# 1. Pull code mới
git pull origin main

# 2. Update backend
cd backend
npm install --production
npx prisma generate
npx prisma migrate deploy    # Chạy migration mới (nếu có)
pm2 restart tmq-api

# 3. Rebuild frontend
cd ../frontend
npm install
npm run build

# 4. Nginx tự serve dist/ mới — không cần restart
```

**Script tự động (optional):**

```bash
cat > /opt/tmq-express/deploy.sh << 'SCRIPT'
#!/bin/bash
set -e
echo "📦 Pulling latest code..."
cd /opt/tmq-express && git pull origin main

echo "🔧 Updating backend..."
cd backend && npm install --production
npx prisma generate
npx prisma migrate deploy
pm2 restart tmq-api

echo "🎨 Building frontend..."
cd ../frontend && npm install && npm run build

echo "✅ Deploy complete!"
SCRIPT

chmod +x /opt/tmq-express/deploy.sh
```

Chạy: `/opt/tmq-express/deploy.sh`

### 2.9. Monitoring & Logs

```bash
# PM2 monitoring
pm2 monit              # Real-time CPU/RAM
pm2 logs tmq-api       # Xem logs backend
pm2 logs tmq-api --lines 100  # 100 dòng gần nhất

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*-main.log

# Disk usage
df -h
du -sh /opt/tmq-express/
```

### 2.10. Backup Database

**Backup thủ công:**
```bash
pg_dump -U tmq_user -h localhost tmq_express > /opt/backups/tmq_$(date +%Y%m%d_%H%M%S).sql
```

**Backup tự động (cron):**
```bash
# Tạo thư mục backup
mkdir -p /opt/backups

# Thêm cron job — backup mỗi ngày lúc 2:00 AM
crontab -e
```

Thêm dòng:
```
0 2 * * * pg_dump -U tmq_user -h localhost tmq_express | gzip > /opt/backups/tmq_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -mtime +30 -delete
```

Cron job này:
- Backup database mỗi ngày lúc 2 AM
- Nén file bằng gzip
- Tự xóa backup cũ hơn 30 ngày

### 2.11. Troubleshooting Production

| Triệu chứng | Kiểm tra | Giải pháp |
|---|---|---|
| 502 Bad Gateway | `pm2 status` → backend crashed? | `pm2 restart tmq-api` → check `pm2 logs` |
| 404 trên mọi route | Nginx config sai `root` | Kiểm tra path `dist/` đúng không |
| API timeout | Backend quá tải | Kiểm tra `pm2 monit` → tăng RAM nếu cần |
| CORS error | `CORS_ORIGIN` sai | Phải match domain (kể cả `https://`) |
| SSL hết hạn | `certbot renew --dry-run` | `certbot renew` → `systemctl reload nginx` |
| Database full | `df -h` | Dọn logs, xóa backup cũ, tăng disk |
| Login không được sau deploy | Seed chưa chạy | `cd backend && npm run db:seed` |
| PDF bị lỗi font trên VPS | Font files thiếu | Kiểm tra `backend/fonts/` có 4 file Roboto |

### 2.12. Checklist trước khi Go Live

- [ ] PostgreSQL password **mạnh** (không dùng default)
- [ ] `JWT_SECRET` đã generate random (≥ 48 ký tự)
- [ ] `NODE_ENV=production` trong `.env`
- [ ] `HOST=127.0.0.1` (không expose trực tiếp)
- [ ] `CORS_ORIGIN` đúng domain production (kèm `https://`)
- [ ] SSL certificate đã cài (HTTPS)
- [ ] Firewall chỉ mở port 22 (SSH), 80, 443
- [ ] Port 3000, 5432 **KHÔNG** mở ra ngoài
- [ ] PM2 đã `pm2 save` + `pm2 startup`
- [ ] `npx prisma generate` đã chạy
- [ ] Seed data đã chạy (có account admin)
- [ ] Backup cron job đã setup
- [ ] Test đăng nhập từ trình duyệt bên ngoài
- [ ] Test tạo biên nhận + in PDF (A5 ngang)
- [ ] Test xuất bảng kê Excel
- [ ] Đổi password admin mặc định sau khi đăng nhập lần đầu
