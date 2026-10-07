/*
 * Runs before the module registry is loaded, which is the only point at which
 * config/env.js can still be influenced (it reads and freezes process.env on
 * import).
 *
 * REDIS_URL is forced empty so tests exercise the no-Redis degradation path and
 * never touch a developer's local Redis. dotenv does not override values that
 * are already present, so a .env file cannot put it back.
 */
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = '';
process.env.LOG_LEVEL = 'silent';
process.env.EMAIL_PROVIDER = 'console';
process.env.WHATSAPP_PROVIDER = 'none';
process.env.LEAD_ALERT_EMAILS = 'sales@taifer.test';
process.env.RECAPTCHA_SECRET = '';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-000000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-00000';
process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough-000000';
process.env.CORS_ORIGINS = 'http://localhost:5173';
/* High enough that functional tests do not trip the limiter; the limiter has
 * its own dedicated test that sets its own ceiling. */
process.env.RATE_LIMIT_GLOBAL_MAX = '10000';
process.env.RATE_LIMIT_LEADS_MAX = '1000';
process.env.RATE_LIMIT_LOGIN_MAX = '1000';

/*
 * The in-memory mongod can take well over the library's 10s default to launch
 * the first time on a machine where a virus scanner inspects the binary, which
 * shows up as a confusing "Instance failed to start" across every test.
 */
process.env.MONGOMS_INSTANCE_START_TIMEOUT ??= '60000';
