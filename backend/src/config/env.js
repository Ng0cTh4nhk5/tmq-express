import 'dotenv/config';

// ---- Validate required environment variables ----
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is required. Set it in .env file.');
}

// [C-SEC-01] JWT_SECRET phải đủ dài VÀ đủ phức tạp
// 32+ ký tự để đảm bảo ≥ 128-bit entropy, bảo vệ khỏi brute-force
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    '❌ JWT_SECRET phải được thiết lập và có ít nhất 32 ký tự để đảm bảo bảo mật. ' +
    'Tạo secret ngẫu nhiên bằng: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// ---- Production safety checks ----
if (env.NODE_ENV === 'production') {
  // [C-SEC-01] Kiểm tra JWT_SECRET không phải placeholder
  const WEAK_SECRETS = [
    'your-secret-key-here-change-me', 'change-me', 'secret', 'password',
    'tmq', '12345', 'abcdef', 'qwerty',
  ];
  if (WEAK_SECRETS.some(s => env.JWT_SECRET.toLowerCase().includes(s))) {
    console.error('🚨 [SECURITY] JWT_SECRET trông giống placeholder. Dùng string ngẫu nhiên mạnh trên production!');
    process.exit(1);
  }

  // [C-SEC-02] CORS_ORIGIN không được là wildcard '*' trên production
  // Wildcard cho phép bất kỳ website nào gọi API với credentials của nhân viên
  if (env.CORS_ORIGIN === '*') {
    console.error('🚨 [SECURITY] CORS_ORIGIN=* không được phép trên production. Chỉ định domain cụ thể (VD: https://app.tmq.vn).');
    process.exit(1);
  }

  if (env.HOST === '0.0.0.0') {
    console.warn('⚠️  [SECURITY] HOST=0.0.0.0 bind all interfaces. Trên production, đặt sau reverse proxy (nginx/caddy) và cân nhắc bind 127.0.0.1.');
  }

  const expiresHours = env.JWT_EXPIRES_IN.endsWith('h')
    ? parseInt(env.JWT_EXPIRES_IN, 10)
    : null;
  if (expiresHours && expiresHours > 4) {
    console.warn(`⚠️  [SECURITY] JWT_EXPIRES_IN=${env.JWT_EXPIRES_IN} — cân nhắc giảm xuống ≤4h trên production để giới hạn cửa sổ lộ token.`);
  }
}

export default env;
