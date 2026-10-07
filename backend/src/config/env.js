import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

/* Comma-separated list -> trimmed array, empty entries dropped. */
const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

const int = (fallback) =>
  z.coerce.number().int().nonnegative().default(fallback);

/*
 * Secrets are only length-checked outside production so that `npm test` and a
 * fresh clone both boot without ceremony. In production a short secret is a
 * real vulnerability, so the refinement below hard-fails instead.
 */
const secret = z.string().default('dev-only-insecure-secret-value-change-me-please');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  SITE_PUBLIC_URL: z.string().url().default('http://localhost:5173'),

  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/taifer_dev'),
  MONGODB_MAX_POOL_SIZE: int(20),
  MONGODB_MIN_POOL_SIZE: int(2),

  REDIS_URL: z.string().default(''),
  REDIS_KEY_PREFIX: z.string().default('taifer'),
  CACHE_TTL_SECONDS: int(300),

  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: int(30),
  COOKIE_SECRET: secret,
  COOKIE_DOMAIN: z.string().default(''),
  LOGIN_MAX_ATTEMPTS: int(5),
  LOGIN_LOCKOUT_MINUTES: int(15),

  FIELD_ENCRYPTION_KEY: z.string().default(''),

  CORS_ORIGINS: csv,

  RATE_LIMIT_GLOBAL_MAX: int(300),
  RATE_LIMIT_GLOBAL_WINDOW: z.string().default('1 minute'),
  RATE_LIMIT_LEADS_MAX: int(5),
  RATE_LIMIT_LEADS_WINDOW: z.string().default('10 minutes'),
  RATE_LIMIT_LOGIN_MAX: int(10),
  RATE_LIMIT_LOGIN_WINDOW: z.string().default('15 minutes'),

  RECAPTCHA_SECRET: z.string().default(''),
  RECAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5),

  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'postmark', 'console']).default('console'),
  EMAIL_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('Taifer <hello@taifer.com>'),
  EMAIL_REPLY_TO: z.string().default('hello@taifer.com'),
  LEAD_ALERT_EMAILS: csv,

  WHATSAPP_PROVIDER: z.enum(['meta', 'twilio', 'none']).default('none'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_TEMPLATE_NAME: z.string().default('new_lead_alert'),
  WHATSAPP_TEMPLATE_LANG: z.string().default('en'),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_FROM: z.string().default(''),
  LEAD_ALERT_PHONES: csv,

  S3_ENDPOINT: z.string().default(''),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_FORCE_PATH_STYLE: bool,
  S3_PUBLIC_BASE_URL: z.string().default(''),
  UPLOAD_MAX_BYTES: int(5 * 1024 * 1024),

  SENTRY_DSN: z.string().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  LEAD_RETENTION_DAYS: int(730),
  NEWSLETTER_UNCONFIRMED_RETENTION_DAYS: int(30),

  MAINTENANCE_MODE: bool,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // Nothing is logged through pino here: the logger itself depends on config.
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const raw = parsed.data;

/* Production-only guards. A misconfigured prod boot should fail loudly at
 * startup rather than quietly run with dev defaults. */
if (raw.NODE_ENV === 'production') {
  const problems = [];
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET']) {
    if (raw[key].length < 32) problems.push(`${key} must be at least 32 characters in production`);
    if (raw[key].startsWith('change-me') || raw[key].startsWith('dev-only')) {
      problems.push(`${key} still holds the placeholder value`);
    }
  }
  if (raw.JWT_ACCESS_SECRET === raw.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (!raw.REDIS_URL) {
    problems.push('REDIS_URL is required in production (rate limiting and queues depend on it)');
  }
  if (raw.CORS_ORIGINS.length === 0) {
    problems.push('CORS_ORIGINS must list your frontend origin(s) in production');
  }
  if (raw.CORS_ORIGINS.includes('*')) {
    problems.push('CORS_ORIGINS cannot contain "*"');
  }
  if (problems.length > 0) {
    console.error(`Refusing to start in production:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(1);
  }
}

export const env = Object.freeze({
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  redisEnabled: raw.REDIS_URL.length > 0,
  s3Enabled: Boolean(raw.S3_BUCKET && raw.S3_ACCESS_KEY_ID && raw.S3_SECRET_ACCESS_KEY),
  recaptchaEnabled: raw.RECAPTCHA_SECRET.length > 0,
});

export default env;
