import 'dotenv/config';

// ---- Validate required environment variables ----
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is required. Set it in .env file.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  throw new Error('❌ JWT_SECRET must be set and at least 16 characters. Set it in .env file.');
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

// ---- Production safety warnings ----
if (env.NODE_ENV === 'production') {
  const EXAMPLE_SECRETS = ['your-secret-key-here-change-me', 'change-me', 'secret', 'password'];
  if (EXAMPLE_SECRETS.some(s => env.JWT_SECRET.toLowerCase().includes(s))) {
    console.error('🚨 [SECURITY] JWT_SECRET looks like a placeholder. Use a strong random string in production!');
    process.exit(1);
  }
  if (env.HOST === '0.0.0.0') {
    console.warn('⚠️  [SECURITY] HOST=0.0.0.0 binds all network interfaces. In production, place behind a reverse proxy (nginx/caddy) and consider binding to 127.0.0.1.');
  }
  const expiresHours = env.JWT_EXPIRES_IN.endsWith('h')
    ? parseInt(env.JWT_EXPIRES_IN, 10)
    : null;
  if (expiresHours && expiresHours > 4) {
    console.warn(`⚠️  [SECURITY] JWT_EXPIRES_IN=${env.JWT_EXPIRES_IN} — consider reducing to ≤4h in production to limit token exposure window.`);
  }
}

export default env;
