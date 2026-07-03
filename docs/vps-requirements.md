# Báo Cáo Yêu Cầu Cấu Hình VPS — TMQ Express ERP

**Ngày phân tích:** 2026-07-02 (v1.1 — cập nhật theo quy mô thực tế)
**Phạm vi:** Backend (Fastify + Prisma + PostgreSQL) + Frontend (Vue 3 SPA)
**Quy mô thực tế:** 3 chi nhánh × tối đa 5 người = **≤ 15 users đồng thời**

---

## 📋 TÓM TẮT EXECUTIVE

### Kết luận nhanh

Với quy mô **≤ 15 users** và 3 chi nhánh nhỏ, hệ thống TMQ Express **không cần VPS lớn**. Một VPS cỡ nhỏ là đủ để chạy ổn định nhiều năm, miễn là cấu hình đúng cách.

| Giai đoạn | CPU | RAM | Storage | Băng thông | Chi phí ước tính |
|-----------|-----|-----|---------|------------|------------------|
| **Hiện tại (≤15 users)** | 2 vCPU | 4 GB | 40 GB SSD | 1 TB/tháng | **~$5/tháng** |
| **Mở rộng thêm chi nhánh (≤40 users)** | 4 vCPU | 8 GB | 80 GB SSD | 2 TB/tháng | ~$17/tháng |

> **Khuyến nghị cụ thể:** Hetzner CX22 (2 vCPU, 4GB RAM, 40GB SSD) — €4.35/tháng (~$5). Đây là lựa chọn tốt nhất về giá/hiệu năng, đủ để hệ thống chạy ổn định nhiều năm.

### Tại sao không cần VPS lớn?

- Fastify Node.js với 15 users đồng thời tốn rất ít CPU (< 10% idle).
- PostgreSQL với 15 connections cùng lúc chỉ cần ~100-200MB RAM.
- PDF/Excel generation đã chạy trên Worker Threads — không block main thread.
- Nghiệp vụ chính là CRUD đơn giản (tạo biên nhận, tra cứu, xuất PDF) — I/O bound.

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

```
[Frontend: Vue 3 SPA]
       ↓ HTTPS
[nginx — SSL termination + Static file serving + Rate limiting]
       ↓
[Fastify Backend — Node.js 20, PM2 single instance]
       ↓
[PostgreSQL 15 — max 30 connections, bind 127.0.0.1]
```

### Workload thực tế (15 users)

| Tình huống | Concurrent requests | CPU | RAM spike |
|------------|---------------------|-----|-----------|
| CRUD thông thường | 5–10 | < 5% | Không đáng kể |
| Xuất PDF biên nhận | 1–2 cùng lúc | 20–40% (Worker Thread) | +50–100 MB |
| Xuất Excel báo cáo | 1 user | 10–20% | +30–50 MB |
| Tất cả 15 users cùng dùng | 15 | < 40% | < 600 MB tổng |

---

## 💾 PHÂN TÍCH TÀI NGUYÊN

### Memory breakdown (15 users, VPS 4GB)

| Thành phần | RAM sử dụng |
|------------|-------------|
| Node.js process (idle) | 150–200 MB |
| Prisma Client + connection pool | 30–50 MB |
| Peak khi 15 users đồng thời | +150–200 MB |
| PostgreSQL (15 connections) | 100–200 MB |
| OS + Nginx + system buffer | 200–300 MB |
| **Tổng thực tế** | **~600–950 MB** |
| **Headroom trên 4GB RAM** | > 3 GB (> 75%) |

### Storage thực tế

| Thành phần | Dung lượng |
|------------|------------|
| Source code + node_modules | ~400 MB |
| Frontend build | ~4 MB |
| PostgreSQL fresh install | ~200 MB |
| Dữ liệu 2 năm (~60,000 biên nhận) | ~1–2 GB |
| Logs (rotated 7 ngày) | ~100–300 MB |
| **Tổng 2 năm** | **~2–3 GB** |

40 GB SSD là đủ cho 5+ năm vận hành ở quy mô hiện tại.

### Băng thông

15 users làm việc 8h/ngày ước tính ~10–20 GB/tháng. 1 TB/tháng (tiêu chuẩn VPS nhỏ) là dư sức.

---

## ⚙️ CẤU HÌNH KHUYẾN NGHỊ

### VPS Provider

| Provider | Gói | CPU | RAM | SSD | Giá/tháng |
|----------|-----|-----|-----|-----|-----------|
| **Hetzner** ⭐ | CX22 | 2 vCPU | 4 GB | 40 GB | ~€4.35 ($5) |
| Vultr | Cloud Compute | 1 vCPU | 2 GB | 55 GB | $6 |
| DigitalOcean | Basic Droplet | 1 vCPU | 2 GB | 50 GB | $12 |
| VNG Cloud (VN) | Basic | 2 vCPU | 4 GB | 40 GB | ~200k VNĐ |
| Viettel IDC (VN) | Starter | 2 vCPU | 4 GB | 40 GB | ~200k VNĐ |

> Ưu tiên datacenter Singapore hoặc Việt Nam để giảm latency. Nếu cần hóa đơn VAT Việt Nam, dùng VNG Cloud hoặc Viettel IDC.

---

### PostgreSQL (cho VPS 4 GB RAM)

```ini
# /etc/postgresql/15/main/postgresql.conf

# Memory
shared_buffers = 1GB                # 25% của 4GB RAM
effective_cache_size = 3GB          # 75% của 4GB RAM
work_mem = 8MB                      # 30 connections × 8MB = 240MB max
maintenance_work_mem = 256MB

# Connections — giới hạn chặt (chỉ 15 users)
max_connections = 30                # Prisma pool 10 + dư cho admin/migration

# WAL
wal_buffers = 8MB
checkpoint_completion_target = 0.9

# SSD optimization
random_page_cost = 1.1
effective_io_concurrency = 100

# Log slow queries
log_min_duration_statement = 2000   # Log query > 2 giây
```

### PM2 Config

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'tmq-backend',
    script: './src/server.js',
    instances: 1,                    // Không cần cluster với 15 users
    exec_mode: 'fork',               // Fork mode đơn giản hơn, đủ dùng
    max_memory_restart: '512M',      // Restart nếu vượt 512MB (dấu hiệu memory leak)
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/tmq/error.log',
    out_file: '/var/log/tmq/access.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
  }],
};
```

> Không cần `exec_mode: 'cluster'` ở quy mô này. Cluster mode phức tạp hơn và không mang lại lợi ích gì cho 15 users.

### Nginx Config

```nginx
# /etc/nginx/sites-available/tmq-express

limit_req_zone $binary_remote_addr zone=api_limit:5m rate=20r/s;

server {
    listen 443 ssl http2;
    server_name app.tmq-express.io.vn;

    ssl_certificate /etc/letsencrypt/live/app.tmq-express.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.tmq-express.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /var/www/tmq-frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
    }

    # API proxy
    location /api/ {
        limit_req zone=api_limit burst=30 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;    # Tăng 60s để đủ cho xuất PDF lớn
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    server_name app.tmq-express.io.vn;
    return 301 https://$host$request_uri;
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Bước 1: Cài đặt môi trường

```bash
# Cập nhật OS
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2

# UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Fail2ban (chặn brute-force tự động)
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

### Bước 2: Tạo user và database PostgreSQL

```bash
sudo -u postgres psql << 'EOF'
CREATE USER tmq_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE tmq_db OWNER tmq_user;
GRANT ALL PRIVILEGES ON DATABASE tmq_db TO tmq_user;
EOF

# Cấu hình chỉ listen localhost
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" \
    /etc/postgresql/15/main/postgresql.conf
sudo systemctl restart postgresql
```

### Bước 3: Deploy ứng dụng

```bash
# Tạo user riêng cho app (không dùng root)
sudo useradd -m -s /bin/bash tmq_app

# Clone code
sudo mkdir -p /var/www && cd /var/www
sudo git clone <repo-url> tmq-express
sudo chown -R tmq_app:tmq_app /var/www/tmq-express

# Chuyển sang user tmq_app
sudo su - tmq_app
cd /var/www/tmq-express

# Backend
cd backend
npm ci --production
npx prisma generate
npx prisma migrate deploy

# Frontend build
cd ../frontend
npm ci
npm run build
sudo cp -r dist/ /var/www/tmq-frontend/

# Cấu hình .env
cp backend/.env.example backend/.env
nano backend/.env
# Điền đầy đủ:
#   DATABASE_URL=postgresql://tmq_user:password@127.0.0.1:5432/tmq_db
#   JWT_SECRET=<48+ ký tự ngẫu nhiên — dùng: openssl rand -hex 48>
#   NODE_ENV=production
#   APP_PUBLIC_URL=https://app.tmq-express.io.vn
#   CORS_ORIGIN=https://app.tmq-express.io.vn

# Khởi chạy PM2
cd backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Bước 4: SSL Certificate

```bash
sudo certbot --nginx -d app.tmq-express.io.vn
```

### Security Checklist trước Go-Live

- [ ] `JWT_SECRET` ≥ 48 ký tự ngẫu nhiên (`openssl rand -hex 48`)
- [ ] `CORS_ORIGIN` = domain chính xác, không dùng `*`
- [ ] PostgreSQL: `listen_addresses = 'localhost'`
- [ ] UFW chỉ mở port 22, 80, 443
- [ ] SSH: disable password login, chỉ dùng SSH key
- [ ] Fail2ban đang chạy (`sudo systemctl status fail2ban`)
- [ ] SSL certificate đã cài và tự renew (`certbot renew --dry-run`)

---

## 📊 MONITORING ĐƠN GIẢN

Với 15 users, không cần Prometheus/Grafana phức tạp:

### UptimeRobot (Free — kiểm tra uptime 5 phút/lần)

- Monitor: `https://app.tmq-express.io.vn/api/health`
- Alert: Email/SMS khi server down
- Free plan đủ dùng

### Netdata (lightweight, xem real-time)

```bash
bash <(curl -Ss https://get.netdata.cloud/kickstart.sh)
# Truy cập qua SSH tunnel: ssh -L 19999:localhost:19999 user@vps
```

### PM2 (có sẵn)

```bash
pm2 monit     # Real-time CPU/RAM
pm2 logs      # Xem logs
pm2 status    # Trạng thái process
```

**Ngưỡng cần theo dõi:**

| Metric | Cảnh báo | Hành động |
|--------|----------|-----------|
| CPU > 70% sustained | Kiểm tra log | Tìm query chậm hoặc vòng lặp |
| RAM > 80% (> 3.2 GB / 4 GB) | `pm2 monit` | Restart PM2, tìm memory leak |
| Disk > 80% | Dọn log | `pm2 flush`, xóa log cũ |
| App không response | UptimeRobot alert | `pm2 restart tmq-backend` |

---

## 🛡️ BACKUP

```bash
# Tạo thư mục backup
sudo mkdir -p /backup && sudo chown tmq_app:tmq_app /backup

# Thêm vào crontab của user tmq_app
crontab -e

# Nội dung:
# Backup DB lúc 2h sáng mỗi ngày
0 2 * * * pg_dump -U tmq_user tmq_db | gzip > /backup/tmq_$(date +\%Y\%m\%d).sql.gz
# Xóa backup cũ hơn 7 ngày
0 3 * * * find /backup -name "tmq_*.sql.gz" -mtime +7 -delete
```

**Backup offsite miễn phí:** Dùng `rclone` sync thư mục `/backup` lên Google Drive 15GB. Đủ lưu hàng năm backup cho hệ thống ở quy mô này.

---

## ⚠️ KNOWN ISSUES (từ Code Review)

### Phải fix trước khi go-live

| ID | Vấn đề | Mức độ |
|----|--------|--------|
| C-01 | Race condition trong batch COD/Cước auto-thu | Cao — ảnh hưởng data integrity |
| C-02 | In-memory aggregation không giới hạn record | Trung bình — nguy cơ timeout |

### Hoãn sang sau go-live

| ID | Vấn đề | Lý do hoãn |
|----|--------|------------|
| M-08 | PII encryption at rest (`so_cccd`) | Cần schema migration + re-encrypt data |

---

## 💰 CHI PHÍ THỰC TẾ

| Hạng mục | Chi tiết | Chi phí/tháng |
|----------|----------|---------------|
| VPS (Hetzner CX22) | 2 vCPU, 4GB, 40GB SSD | ~$5 |
| Domain | `.io.vn` hoặc `.vn` | ~$1 |
| SSL | Let's Encrypt | **Miễn phí** |
| Monitoring | UptimeRobot Free + Netdata | **Miễn phí** |
| Backup offsite | Google Drive 15GB | **Miễn phí** |
| **TỔNG** | | **~$6/tháng** |

Chỉ nâng VPS khi: thêm chi nhánh mới (> 30 users), hoặc CPU sustained > 70% trong giờ làm việc. Với 3 chi nhánh hiện tại, VPS này có thể chạy ổn định **3–5 năm**.

---

## 🎬 KẾT LUẬN

**Cấu hình cho 3 chi nhánh, ≤ 15 users:**

```
VPS: Hetzner CX22  →  2 vCPU | 4 GB RAM | 40 GB NVMe SSD | ~$5/tháng
```

**5 bước go-live:**
1. Cấu hình `.env` production (JWT_SECRET, CORS_ORIGIN, DATABASE_URL)
2. Chạy `npx prisma migrate deploy` trên production DB
3. Bật UFW + Fail2ban + SSL Certbot
4. Thiết lập backup tự động (crontab + rclone)
5. Fix C-01 (race condition) trước khi go-live

**📅 Review lại khi:** thêm chi nhánh mới, hoặc số biên nhận/ngày vượt 500.
