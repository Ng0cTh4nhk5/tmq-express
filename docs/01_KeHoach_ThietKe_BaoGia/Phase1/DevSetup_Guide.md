# Hướng Dẫn Cài Đặt & Quy Ước Dev — Phase 1

> **Mục đích**: Giúp dev mới có thể chạy project ngay ngày đầu tiên. Bao gồm setup môi trường, cấu trúc project, coding standards, và Git workflow.

---

## 1. Yêu Cầu Môi Trường

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| **Node.js** | 20 LTS+ | Dùng `nvm` để quản lý phiên bản |
| **npm** | 10+ | Đi kèm Node.js |
| **PostgreSQL** | 16+ | Database chính |
| **Git** | 2.40+ | Version control |
| **VS Code** | Latest | IDE khuyến nghị (xem extensions bên dưới) |

### VS Code Extensions Khuyến Nghị

```
dbaeumer.vscode-eslint           — ESLint
esbenp.prettier-vscode           — Prettier
vue.volar                        — Vue 3 (Volar)
prisma.prisma                    — Prisma ORM
ckolkman.vscode-postgres         — PostgreSQL Explorer
humao.rest-client                — Test API ngay trong VS Code
```

---

## 2. Cấu Trúc Project

```
tmq-express/
├── docs/                         ← Tài liệu (thư mục hiện tại)
├── backend/                      ← Node.js + Fastify API
│   ├── src/
│   │   ├── server.js             ← Entry point
│   │   ├── config/
│   │   │   ├── database.js       ← PostgreSQL connection
│   │   │   ├── auth.js           ← JWT config
│   │   │   └── env.js            ← Environment validation
│   │   ├── plugins/
│   │   │   ├── auth.js           ← Auth middleware (JWT verify)
│   │   │   ├── rbac.js           ← Role-based access control
│   │   │   └── error-handler.js  ← Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── van-phong.routes.js
│   │   │   ├── khach-hang.routes.js
│   │   │   ├── bien-nhan.routes.js
│   │   │   ├── bang-ke.routes.js
│   │   │   ├── nhan-vien.routes.js
│   │   │   ├── phieu-thu.routes.js
│   │   │   ├── phieu-chi.routes.js
│   │   │   ├── cong-no.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   └── bao-cao.routes.js
│   │   ├── services/             ← Business logic
│   │   │   ├── auth.service.js
│   │   │   ├── bien-nhan.service.js
│   │   │   ├── pdf.service.js    ← pdfmake + qrcode
│   │   │   ├── excel.service.js  ← ExcelJS
│   │   │   └── ...
│   │   ├── schemas/              ← Fastify JSON Schema validation
│   │   │   ├── bien-nhan.schema.js
│   │   │   └── ...
│   │   └── utils/
│   │       ├── ma-so-generator.js ← Sinh mã BN, PT, PC, BK
│   │       ├── pagination.js
│   │       └── format.js          ← Format tiền, ngày
│   ├── prisma/
│   │   ├── schema.prisma         ← Database schema
│   │   ├── migrations/           ← Auto-generated migrations
│   │   └── seed.js               ← Seed data (3 VP, admin, mẫu)
│   ├── .env.example              ← Template biến môi trường
│   ├── package.json
│   └── nodemon.json
├── frontend/                     ← Vue.js 3 + Vite
│   ├── src/
│   │   ├── main.js               ← Entry point
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.js          ← Vue Router (14 routes)
│   │   ├── stores/               ← Pinia stores
│   │   │   ├── auth.store.js
│   │   │   ├── bien-nhan.store.js
│   │   │   └── ...
│   │   ├── views/                ← Page components (14 màn hình)
│   │   │   ├── LoginView.vue
│   │   │   ├── HomeView.vue
│   │   │   ├── BienNhanListView.vue
│   │   │   ├── BienNhanFormView.vue
│   │   │   ├── KhachHangListView.vue
│   │   │   └── ...
│   │   ├── components/           ← Reusable components
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.vue
│   │   │   │   ├── AppHeader.vue
│   │   │   │   └── MainLayout.vue
│   │   │   ├── common/
│   │   │   │   ├── DataTable.vue
│   │   │   │   ├── SearchInput.vue
│   │   │   │   ├── DateRangePicker.vue
│   │   │   │   ├── ConfirmDialog.vue
│   │   │   │   └── Toast.vue
│   │   │   └── bien-nhan/
│   │   │       ├── BienNhanForm.vue
│   │   │       └── StatusBadge.vue
│   │   ├── composables/          ← Vue composables
│   │   │   ├── useApi.js         ← Axios wrapper
│   │   │   ├── useAuth.js
│   │   │   └── usePagination.js
│   │   ├── api/                  ← API client modules
│   │   │   ├── client.js         ← Axios instance + interceptors
│   │   │   ├── bien-nhan.api.js
│   │   │   └── ...
│   │   └── assets/
│   │       ├── styles/
│   │       │   ├── variables.css ← CSS Custom Properties
│   │       │   ├── base.css     ← Reset + typography
│   │       │   └── components.css
│   │       └── images/
│   │           └── logo-tmq.png
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 3. Cài Đặt & Chạy Lần Đầu

### 3.1 Clone & Install

```bash
git clone <repo-url> tmq-express
cd tmq-express

# Backend
cd backend
cp .env.example .env        # Sửa DB credentials trong .env
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 3.2 Tạo Database

```bash
# Tạo database trong PostgreSQL
psql -U postgres -c "CREATE DATABASE tmq_express ENCODING 'UTF8';"

# Chạy migration (Prisma)
cd backend
npx prisma migrate dev

# Seed dữ liệu mẫu
npx prisma db seed
```

### 3.3 Chạy Dev Server

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Truy cập: `http://localhost:5173`
API: `http://localhost:3000/api`

### 3.4 Biến Môi Trường

**Backend `.env`:**
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/tmq_express

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=8h

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=TMQ Express
```

---

## 4. Seed Data (Dữ Liệu Mẫu)

Script `prisma/seed.js` sẽ tạo sẵn:

| Dữ liệu | Nội dung |
|---|---|
| **3 Văn phòng** | SG (Tp.HCM), CT (Cần Thơ), RG (Rạch Giá) |
| **4 Nhân viên** | 1 admin (SG), 2 staff (CT, RG), 1 accountant (SG) |
| **10 Khách hàng** | Dữ liệu mẫu để test autocomplete |
| **20 Biên nhận** | Các tuyến SG↔CT, SG↔RG, CT↔RG với đủ trạng thái |
| **5 Phiếu thu/chi** | Dữ liệu mẫu |
| **3 Công nợ** | 1 chưa thu, 1 quá hạn, 1 đã thu |

**Tài khoản test:**

| Username | Password | Role | VP |
|---|---|---|---|
| `admin` | `Tmq@1234` | admin | SG |
| `staff_ct` | `Tmq@1234` | staff | CT |
| `staff_rg` | `Tmq@1234` | staff | RG |
| `ketoan` | `Tmq@1234` | accountant | SG |

---

## 5. Coding Standards

### 5.1 Naming Convention

| Ngữ cảnh | Convention | Ví dụ |
|---|---|---|
| **Biến / Hàm (JS)** | camelCase | `bienNhanId`, `getTongCuoc()` |
| **File component (Vue)** | PascalCase | `BienNhanForm.vue`, `AppSidebar.vue` |
| **File route/service** | kebab-case | `bien-nhan.routes.js`, `pdf.service.js` |
| **CSS class** | kebab-case | `.btn-primary`, `.card-stats` |
| **Database column** | snake_case | `van_phong_id`, `trang_thai_thu` |
| **API endpoint** | kebab-case | `/api/bien-nhan`, `/api/khach-hang` |
| **Const / Enum** | UPPER_SNAKE | `TRANG_THAI.CHO_VC`, `MAX_AUTOCOMPLETE` |

### 5.2 ESLint & Prettier

**Backend:** `eslint.config.js`
```js
// Extends: @eslint/js recommended
// Rules: no-unused-vars (warn), no-console (warn), semi (always)
```

**Frontend:** Vue 3 + Volar rules

**Prettier:** `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

### 5.3 Commit Message Convention

Dùng **Conventional Commits**:

```
<type>(<scope>): <description>

feat(bien-nhan): add autocomplete for sender/receiver
fix(auth): handle expired token redirect
docs(api): add phieu-thu endpoints
style(frontend): fix sidebar alignment
refactor(service): extract PDF generation to separate module
```

| Type | Ý nghĩa |
|---|---|
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `docs` | Tài liệu |
| `style` | UI / CSS (không ảnh hưởng logic) |
| `refactor` | Tái cấu trúc code |
| `test` | Thêm / sửa test |
| `chore` | Config, dependency, build |

---

## 6. Git Workflow

### Branch Strategy: **Trunk-Based + Feature Branches**

```
main ────────────────────────────────────────────────→ (production)
  └─ feat/bien-nhan-crud ──PR──→ merge vào main
  └─ feat/pdf-qr-print ───PR──→ merge vào main
  └─ fix/login-error ──────PR──→ merge vào main
```

**Quy tắc:**
1. **Branch từ `main`**, tên branch: `feat/xxx`, `fix/xxx`, `refactor/xxx`
2. **Commit thường xuyên**, mỗi commit có ý nghĩa riêng
3. **Pull Request** trước khi merge — tự review hoặc nhờ review
4. **Không commit trực tiếp** lên `main`
5. **Rebase** trước khi merge để giữ history sạch

### Quy Trình Làm Việc

```mermaid
flowchart LR
    A["git checkout -b\nfeat/bien-nhan"] --> B["Code + Commit"]
    B --> C["git push origin\nfeat/bien-nhan"]
    C --> D["Tạo Pull Request"]
    D --> E["Review + Test"]
    E --> F["Merge vào main"]
    F --> G["Delete branch"]
```

---

## 7. Thứ Tự Dev Khuyến Nghị

Dựa trên [KeHoach_Phase1.md](./KeHoach_Phase1.md), thứ tự dev nên theo dependency:

| Sprint | Backend | Frontend | Phụ thuộc |
|---|---|---|---|
| **1** | DB setup, Auth API, Middleware RBAC | Login, Layout (Sidebar/Header), Router guards | — |
| **2** | Văn phòng CRUD, KH CRUD + Autocomplete | SCR-VP, SCR-KH, Autocomplete component | Sprint 1 |
| **3** | Biên nhận CRUD, Mã BN generator | SCR-BN-NEW, SCR-BN-LIST, SCR-BN-EDIT | Sprint 2 |
| **4** | PDF service (pdfmake+QR), Scan endpoint | PDF viewer, QR mobile page | Sprint 3 |
| **5** | Bảng kê HĐĐT, Excel export | SCR-BANGKE | Sprint 3 |
| **6** | Phiếu thu/chi CRUD, PDF | SCR-PT, SCR-PC | Sprint 1 |
| **7** | Công nợ, auto-tạo từ BN | SCR-CONGNO | Sprint 3+6 |
| **8** | Dashboard stats, Charts API, Reports | SCR-DASHBOARD, ECharts, export | Sprint 3+6+7 |
| **9** | Data migration script | — | Cần data PM cũ |
| **10** | Testing, bug fix, deploy | UAT, polishing | All sprints |

> [!TIP]
> Frontend và Backend có thể **dev song song** từ Sprint 2 trở đi nhờ có [API Specification](./API_Specification.md). Frontend mock API response trong khi chờ backend.

---

## Tài Liệu Liên Quan

| Tài liệu | Mô tả |
|---|---|
| [API_Specification.md](./API_Specification.md) | 53 API endpoints chi tiết |
| [DatabaseSchema_Phase1.md](./DatabaseSchema_Phase1.md) | Schema database |
| [NghiepVu_ChiTiet_Phase1.md](./NghiepVu_ChiTiet_Phase1.md) | 14 nghiệp vụ + quy tắc NV |
| [Wireframes_Phase1.md](./Wireframes_Phase1.md) | 14 màn hình giao diện |
| [TechStack_Architecture.md](./TechStack_Architecture.md) | Công nghệ & kiến trúc |
