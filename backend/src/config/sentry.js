import * as Sentry from '@sentry/node';
import { env } from './env.js';
import { logger } from './logger.js';

/*
 * Sentry is initialised before anything else imports it so its instrumentation
 * can patch http/mongo clients. With no DSN configured every call below is a
 * no-op, which keeps the call sites free of `if (sentryEnabled)` noise.
 */
let initialised = false;

export function initSentry() {
  if (initialised || !env.SENTRY_DSN) return false;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    /* Never ship request bodies: they contain names, emails and phone
     * numbers. The lead id in the tags is enough to find the record. */
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });

  initialised = true;
  logger.info('sentry initialised');
  return true;
}

export function captureError(error, context = {}) {
  if (!initialised) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) scope.setTag(key, String(value));
    Sentry.captureException(error);
  });
}

export const sentryEnabled = () => initialised;
export { Sentry };
