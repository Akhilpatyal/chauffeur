import pino from 'pino';
import { env } from './env.js';

/*
 * Structured JSON logs on one line per event, which is what every aggregator
 * (Better Stack, Datadog, CloudWatch) expects. pino-pretty is only loaded in
 * development, where human-readable output matters more than machine parsing.
 */
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
  ...(env.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service,env' },
        },
      }
    : {}),
});

export default logger;
