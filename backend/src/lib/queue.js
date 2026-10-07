import { Queue } from 'bullmq';
import { getQueueConnection } from '../db/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Job queues.
 *
 * The contract callers rely on: `enqueue()` never throws and never blocks the
 * request. It returns { queued: true } when Redis accepted the job and
 * { queued: false } when it did not. Callers persist that outcome so the
 * outbox sweeper (src/workers/index.js) can retry later — a notification that
 * cannot be enqueued must not become a lost lead, which is exactly the failure
 * mode this backend replaces.
 *
 * Without Redis (dev/test) jobs run inline so the code path stays exercised.
 */
export const QUEUE_NAMES = {
  notifications: 'notifications',
  maintenance: 'maintenance',
};

export const JOB_NAMES = {
  leadAdminAlert: 'lead.admin-alert',
  leadCustomerEmail: 'lead.customer-confirmation',
  newsletterOptIn: 'newsletter.opt-in',
  newsletterWelcome: 'newsletter.welcome',
  sweepOutbox: 'maintenance.sweep-outbox',
  retention: 'maintenance.retention',
};

/* Exponential backoff with a long tail: a provider outage of ~30 min is
 * survivable without operator involvement. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 6,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 3600, count: 5_000 },
  removeOnFail: { age: 14 * 24 * 3600 },
};

const queues = new Map();
let inlineHandler = null;

export function getQueue(name) {
  if (!env.redisEnabled) return null;
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getQueueConnection(name),
        prefix: `${env.REDIS_KEY_PREFIX}:bull`,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    );
  }
  return queues.get(name);
}

/*
 * Registered by the worker entrypoint and by tests so that the no-Redis path
 * still performs the work, synchronously, after the response is sent.
 */
export function setInlineHandler(handler) {
  inlineHandler = handler;
}

export async function enqueue(queueName, jobName, data, options = {}) {
  const queue = getQueue(queueName);

  if (!queue) {
    if (!inlineHandler) return { queued: false, reason: 'no-redis-no-inline-handler' };
    try {
      await inlineHandler({ name: jobName, data });
      return { queued: true, inline: true };
    } catch (error) {
      logger.error({ err: error, jobName }, 'inline job failed');
      return { queued: false, reason: error.message };
    }
  }

  try {
    const job = await queue.add(jobName, data, { ...options });
    return { queued: true, jobId: job.id };
  } catch (error) {
    // Deliberately swallowed: the caller records the failure and the sweeper
    // retries. Losing the alert is recoverable; losing the request is not.
    logger.error({ err: error, queueName, jobName }, 'enqueue failed');
    return { queued: false, reason: error.message };
  }
}

/* Repeatable maintenance jobs. Idempotent: BullMQ dedupes by repeat key. */
export async function scheduleRepeatableJobs() {
  const queue = getQueue(QUEUE_NAMES.maintenance);
  if (!queue) return false;
  await queue.add(
    JOB_NAMES.sweepOutbox,
    {},
    { repeat: { pattern: '*/5 * * * *' }, jobId: 'repeat:sweep-outbox' },
  );
  await queue.add(
    JOB_NAMES.retention,
    {},
    { repeat: { pattern: '30 3 * * *' }, jobId: 'repeat:retention' },
  );
  logger.info('repeatable maintenance jobs scheduled');
  return true;
}

export async function queueHealth() {
  if (!env.redisEnabled) return { ok: true, enabled: false };
  try {
    const counts = await getQueue(QUEUE_NAMES.notifications).getJobCounts(
      'waiting',
      'active',
      'failed',
      'delayed',
    );
    return { ok: true, enabled: true, counts };
  } catch (error) {
    return { ok: false, enabled: true, error: error.message };
  }
}

export async function closeQueues() {
  await Promise.all([...queues.values()].map((queue) => queue.close().catch(() => {})));
  queues.clear();
}
