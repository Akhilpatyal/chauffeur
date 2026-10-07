import { Lead } from '../models/Lead.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { logger } from '../config/logger.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../lib/queue.js';

/*
 * Outbox sweeper.
 *
 * This is the safety net under the whole notification path. A lead is always
 * persisted before its alerts are queued, so if Redis was unreachable at that
 * moment the lead exists with its alerts still marked `pending`. Every five
 * minutes this finds those and queues them.
 *
 * It also picks up leads left `queued` for an implausibly long time, which is
 * what a worker crashing mid-job looks like from the outside.
 */
const STALE_QUEUED_MS = 30 * 60 * 1000;
const BATCH = 200;

/* Leaves recent rows alone so the sweeper never races the request that is
 * still in the middle of enqueuing. */
const SETTLE_MS = 60 * 1000;

function stuckFilter(channel) {
  const now = Date.now();
  return {
    $or: [
      {
        [`notifications.${channel}.status`]: { $in: ['pending', 'failed'] },
        createdAt: { $lt: new Date(now - SETTLE_MS) },
      },
      {
        [`notifications.${channel}.status`]: 'queued',
        [`notifications.${channel}.queuedAt`]: { $lt: new Date(now - STALE_QUEUED_MS) },
      },
    ],
    anonymisedAt: null,
  };
}

async function sweepChannel(channel, jobName) {
  const stuck = await Lead.find(stuckFilter(channel))
    .select('_id')
    .sort({ createdAt: 1 })
    .limit(BATCH)
    .lean();

  let requeued = 0;
  for (const lead of stuck) {
    const result = await enqueue(QUEUE_NAMES.notifications, jobName, { leadId: String(lead._id) });
    if (!result.queued) continue;

    await Lead.updateOne(
      { _id: lead._id },
      { $set: { [`notifications.${channel}.status`]: 'queued', [`notifications.${channel}.queuedAt`]: new Date() } },
    );
    requeued += 1;
  }

  if (requeued > 0) {
    logger.warn({ channel, requeued, found: stuck.length }, 'outbox sweeper re-queued notifications');
  }
  return requeued;
}

async function sweepWelcomeEmails() {
  const stuck = await NewsletterSubscriber.find({
    status: 'confirmed',
    'welcomeEmail.status': { $in: ['pending', 'failed'] },
    'welcomeEmail.attempts': { $lt: 8 },
  })
    .select('_id')
    .limit(BATCH)
    .lean();

  let requeued = 0;
  for (const subscriber of stuck) {
    // No token is passed: the handler mints a fresh unsubscribe token when it
    // has none, because only the hash was ever stored.
    const result = await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.newsletterWelcome, {
      subscriberId: String(subscriber._id),
    });
    if (result.queued) requeued += 1;
  }
  return requeued;
}

export async function sweepOutbox() {
  const [adminEmail, adminWhatsapp, customerEmail, welcome] = await Promise.all([
    sweepChannel('adminEmail', JOB_NAMES.leadAdminAlert),
    sweepChannel('adminWhatsapp', JOB_NAMES.leadAdminAlert),
    sweepChannel('customerEmail', JOB_NAMES.leadCustomerEmail),
    sweepWelcomeEmails(),
  ]);

  const summary = { adminEmail, adminWhatsapp, customerEmail, welcome };
  logger.debug(summary, 'outbox sweep complete');
  return summary;
}
