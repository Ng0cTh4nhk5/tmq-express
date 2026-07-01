#!/bin/bash
# =============================================================================
# Deploy script — TMQ Express Docs (VitePress)
# Chạy trên MÁY CỤC BỘ (Windows PowerShell) để upload lên VPS
# =============================================================================
#
# ĐIỀU KIỆN: Đã có VPS với Nginx + Certbot đang chạy tmq-express.io.vn
# SERVER: Ubuntu 24.04 LTS
# DOMAIN MỚI: docs.tmq-express.io.vn

# ─────────────────────────────────────────────
# BƯỚC 1 (Máy local) — Build static site
# ─────────────────────────────────────────────
# cd docs/
# npm run build
# Kết quả: docs/.vitepress/dist/  ← thư mục này sẽ upload lên server

# ─────────────────────────────────────────────
# BƯỚC 2 (Máy local) — Upload lên VPS
# ─────────────────────────────────────────────
# Chạy lệnh rsync hoặc scp từ PowerShell trên máy anh:

# rsync -avz --delete \
#   "docs/.vitepress/dist/" \
#   "root@<VPS_IP>:/var/www/tmq-docs/"

# Hoặc dùng scp:
# scp -r "docs/.vitepress/dist/*" root@<VPS_IP>:/var/www/tmq-docs/

# ─────────────────────────────────────────────
# BƯỚC 3 (Trên VPS) — Tạo thư mục và nginx config
# ─────────────────────────────────────────────

# SSH vào VPS:
# ssh root@<VPS_IP>

# Tạo thư mục serve:
# mkdir -p /var/www/tmq-docs

# ─────────────────────────────────────────────
# BƯỚC 4 (Trên VPS) — Tạo Nginx server block
# ─────────────────────────────────────────────

# nano /etc/nginx/sites-available/tmq-docs
# (paste nội dung nginx config bên dưới vào)
# ln -s /etc/nginx/sites-available/tmq-docs /etc/nginx/sites-enabled/
# nginx -t && systemctl reload nginx

# ─────────────────────────────────────────────
# BƯỚC 5 (Trên VPS) — Cấp HTTPS
# ─────────────────────────────────────────────

# certbot --nginx -d docs.tmq-express.io.vn

# ─────────────────────────────────────────────
# BƯỚC 6 (DNS) — Thêm A record
# ─────────────────────────────────────────────

# Trên trang quản lý DNS của nhà đăng ký (ví dụ: Tenten, VNPT...):
# Thêm record:
#   Type: A
#   Name: docs
#   Value: <địa chỉ IP của VPS>
#   TTL: 3600 (hoặc mặc định)

echo "Xem file nginx config ở: docs/deploy/nginx-tmq-docs.conf"
