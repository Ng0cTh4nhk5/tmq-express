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

export default env;
