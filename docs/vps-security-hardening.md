# Hướng dẫn Bảo mật và Chống phá hoại khi Deploy VPS (Production)

Tài liệu này tổng hợp các phương pháp và cấu hình cần thiết để bảo vệ hệ thống TMQ Express khi triển khai lên môi trường Production (VPS), nhằm chống lại các cuộc tấn công DDoS, SQL Injection, rò rỉ dữ liệu, và các rủi ro vận hành khác.

## 1. Bảo mật cấp độ Hệ điều hành (VPS)

### 1.1. Cấu hình Tường lửa (Firewall - UFW)
Chỉ mở các port cần thiết ra public, block toàn bộ các port khác.
- Mở Port **80** (HTTP) và **443** (HTTPS) cho web traffic.
- Mở Port **22** (SSH) - Khuyến nghị đổi port SSH mặc định (VD: 2222) để tránh bot scan.
- Database (Port 5432) tuyệt đối **KHÔNG MỞ PUBLIC**, chỉ cho phép truy cập từ localhost.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # Hoặc port SSH custom
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 1.2. Phân quyền User (Chạy bằng Non-Root User)
Tuyệt đối **KHÔNG** chạy ứng dụng Node.js bằng user `root`.
- Tạo một user riêng biệt (VD: `tmq_deploy`) không có quyền `sudo` (trừ khi cần thiết) để chạy ứng dụng và PM2.
- Việc này giúp hạn chế thiệt hại nếu backend bị khai thác, hacker sẽ chỉ có quyền của user `tmq_deploy`.

## 2. Bảo vệ thông qua Nginx (Reverse Proxy)

Nginx là lớp phòng thủ đầu tiên trước khi request chạm vào backend Node.js.

### 2.1. Rate Limiting (Chống Spam / DoS)
Cấu hình giới hạn số lượng request từ một IP để ngăn chặn DDoS lớp Application và brute-force.
```nginx
# Thêm vào http block
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Thêm vào location block /api/
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
```

### 2.2. Giới hạn kích thước Body (Chống Payload Bloat)
Ngăn chặn các payload JSON khổng lồ làm treo RAM của server.
```nginx
server {
    client_max_body_size 5M; # Chỉ cho phép tối đa 5MB mỗi request
}
```

## 3. Bảo mật Database (PostgreSQL)

- **Không mở port ra Internet:** File `postgresql.conf` cần cấu hình `listen_addresses = 'localhost'` hoặc `127.0.0.1`.
- **Phân quyền Database:** Không sử dụng user `postgres` cho ứng dụng. Hãy tạo một user riêng biệt chỉ có quyền truy cập đúng vào database `tmq_express_db`.
- **Backup tự động:** Set up cron job dump database mỗi ngày 1 lần và đẩy file backup sang một cloud storage khác (VD: AWS S3 hoặc Google Drive) thông qua Rclone.

## 4. Bảo mật tại Backend (Node.js & PM2)

### 4.1. Cấu hình Môi trường (.env)
- `JWT_SECRET` phải là một chuỗi ngẫu nhiên có độ dài tối thiểu 32 ký tự, không dùng chung với môi trường Dev.
- `NODE_ENV=production` để Fastify/Express bật các tối ưu hóa và không in ra log debug chi tiết.
- `CORS_ORIGIN`: Chỉ định đích danh domain của frontend (VD: `https://tmq.vn`), tuyệt đối **KHÔNG** dùng `*` trên production.

### 4.2. Cấu hình PM2 (Tự phục hồi)
Sử dụng `ecosystem.config.cjs` để cấu hình giới hạn tài nguyên và tự động khởi động lại nếu bị memory leak:
```javascript
module.exports = {
  apps: [{
    name: 'tmq-express-api',
    script: 'src/server.js',
    instances: 'max', // Chạy chế độ cluster tận dụng đa nhân CPU
    exec_mode: 'cluster',
    max_memory_restart: '1G', // Tự restart nếu RAM vượt quá 1GB
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

## 5. Tổng kết Check-list khi lên Prod
- [ ] SSH Key only (Disable Password Authentication).
- [ ] Đổi port SSH, cấu hình UFW Firewall.
- [ ] Cài đặt Fail2Ban để chặn tự động các IP scan/brute-force.
- [ ] Chạy App bằng Non-root User.
- [ ] Nginx: Rate limit + `client_max_body_size` + Cấu hình SSL/TLS (Let's Encrypt).
- [ ] PostgreSQL bind `127.0.0.1`, user riêng.
- [ ] PM2 chạy mode Cluster + `max_memory_restart`.
- [ ] Kiểm tra lại `.env` (Strong `JWT_SECRET`, Strict `CORS_ORIGIN`).
