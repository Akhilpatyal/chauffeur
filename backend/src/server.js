import { initSentry } from './config/sentry.js';

// Before any other import so Sentry can instrument the http and mongo clients.
initSentry();

const { env } = await import('./config/env.js');
const { logger } = await import('./config/logger.js');
const { buildApp } = await import('./app.js');
const { connectMongo, disconnectMongo } = await import('./db/mongoose.js');
const { disconnectRedis } = await import('./db/redis.js');
const { closeQueues, setInlineHandler } = await import('./lib/queue.js');
const { processNotificationJob } = await import('./services/notifications.js');

/*
 * API entrypoint.
 *
 * The API and the workers are separate processes on purpose: a slow email
 * provider must not consume the concurrency that is answering HTTP requests,
 * and the two scale on different signals (requests vs queue depth).
 *
 * The exception is a Redis-less environment, where jobs run inline so local
 * development still exercises the notification code path.
 */
if (!env.redisEnabled) {
  logger.warn('running without Redis: cache disabled, jobs execute inline');
  setInlineHandler(processNotificationJob);
}

const app = await buildApp();

async function start() {
  try {
    await connectMongo();
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(
      { port: env.PORT, docs: `${env.API_PUBLIC_URL}/api/docs` },
      'api listening',
    );
  } catch (error) {
    logger.fatal({ err: error }, 'failed to start');
    process.exit(1);
  }
}

/*
 * Graceful shutdown. Without this, a deploy drops the requests in flight, which
 * on this API means dropped enquiries.
 *
 * Order matters: stop accepting connections, finish what is in flight, then
 * close the database and Redis.
 */
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');

  const timer = setTimeout(() => {
    logger.error('graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15_000);
  timer.unref();

  try {
    await app.close();
    await closeQueues();
    await disconnectMongo();
    await disconnectRedis();
    clearTimeout(timer);
    logger.info('shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'error during shutdown');
    process.exit(1);
  }
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => shutdown(signal));
}

/*
 * A rejected promise nobody handled means state is now unknown; the process is
 * logged and replaced rather than left running in an undefined condition.
 */
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled promise rejection');
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  shutdown('uncaughtException');
});

await start();
