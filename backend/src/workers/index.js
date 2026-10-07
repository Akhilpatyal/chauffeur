import { Worker } from 'bullmq';
import { initSentry, captureError } from '../config/sentry.js';

initSentry();

const { env } = await import('../config/env.js');
const { logger } = await import('../config/logger.js');
const { connectMongo, disconnectMongo } = await import('../db/mongoose.js');
const { getQueueConnection, disconnectRedis } = await import('../db/redis.js');
const { QUEUE_NAMES, JOB_NAMES, scheduleRepeatableJobs, closeQueues } = await import('../lib/queue.js');
const { processNotificationJob } = await import('../services/notifications.js');
const { sweepOutbox } = await import('./sweeper.js');
const { runRetention } = await import('../services/retention.js');

/*
 * Background worker process.
 *
 * Run at least one of these alongside the API. Concurrency is modest on purpose:
 * the work is almost entirely waiting on third-party HTTP, and every provider
 * here rate-limits, so more parallelism buys 429s rather than throughput.
 */
if (!env.redisEnabled) {
  logger.fatal('REDIS_URL is required to run the worker process');
  process.exit(1);
}

await connectMongo();

const workers = [];

workers.push(
  new Worker(
    QUEUE_NAMES.notifications,
    async (job) => processNotificationJob(job),
    {
      connection: getQueueConnection('notifications-worker'),
      prefix: `${env.REDIS_KEY_PREFIX}:bull`,
      concurrency: 5,
      // Provider-level protection: at most 30 outbound messages per second
      // across this worker, regardless of queue depth.
      limiter: { max: 30, duration: 1_000 },
    },
  ),
);

workers.push(
  new Worker(
    QUEUE_NAMES.maintenance,
    async (job) => {
      if (job.name === JOB_NAMES.sweepOutbox) return sweepOutbox();
      if (job.name === JOB_NAMES.retention) return runRetention();
      logger.warn({ jobName: job.name }, 'unknown maintenance job');
      return null;
    },
    {
      connection: getQueueConnection('maintenance-worker'),
      prefix: `${env.REDIS_KEY_PREFIX}:bull`,
      concurrency: 1,
    },
  ),
);

for (const worker of workers) {
  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, name: job.name }, 'job completed');
  });

  worker.on('failed', (job, error) => {
    const exhausted = job && job.attemptsMade >= (job.opts?.attempts ?? 1);
    logger.error(
      { jobId: job?.id, name: job?.name, attempt: job?.attemptsMade, exhausted, err: error },
      exhausted ? 'job failed permanently' : 'job failed, will retry',
    );
    // Only page a human once retries are exhausted; a transient 502 that the
    // next attempt fixes is not an incident.
    if (exhausted) captureError(error, { jobName: job?.name, jobId: job?.id });
  });

  worker.on('error', (error) => logger.error({ err: error }, 'worker error'));
}

await scheduleRepeatableJobs();
logger.info({ queues: Object.values(QUEUE_NAMES) }, 'workers ready');

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'worker shutting down');

  const timer = setTimeout(() => process.exit(1), 30_000);
  timer.unref();

  try {
    // close() waits for in-flight jobs to finish, so a deploy does not abandon
    // a half-sent notification.
    await Promise.all(workers.map((worker) => worker.close()));
    await closeQueues();
    await disconnectMongo();
    await disconnectRedis();
    clearTimeout(timer);
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'error during worker shutdown');
    process.exit(1);
  }
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => shutdown(signal));
}
