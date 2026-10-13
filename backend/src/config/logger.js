import { createRequire } from 'node:module';
import pino from 'pino';
import { env } from './env.js';

/*
 * Structured JSON logs on one line per event, which is what every aggregator
 * (Better Stack, Datadog, CloudWatch) expects. pino-pretty is only used in
 * development, where human-readable output matters more than machine parsing.
 */

/*
 * pino-pretty is a devDependency, and the Docker image installs production
 * dependencies only. Asking for the transport when the package is absent does
 * not degrade — pino throws "unable to determine transport target" at import
 * time and the process dies before it can log why.
 *
 * That turned any container started with NODE_ENV=development into a crash
 * loop whose only symptom was a stack trace about transports. Checking that
 * the package actually resolves means the logger falls back to JSON instead,
 * which is the correct behaviour everywhere it is missing.
 */
const require = createRequire(import.meta.url);

function prettyAvailable() {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

const usePretty = env.isDevelopment && prettyAvailable();
const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.recaptchaToken',
    'password',
    'passwordHash',
    'refreshToken',
    '*.password',
    '*.passwordHash',
  ],
  censor: '[redacted]',
};

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact,
  base: { service: 'taifer-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  ...(usePretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service,env' },
        },
      }
    : {}),
});

export default logger;
