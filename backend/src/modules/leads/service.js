import crypto from 'node:crypto';
import { Lead } from '../../models/Lead.js';
import { IdempotencyKey } from '../../models/IdempotencyKey.js';
import { logger } from '../../config/logger.js';
import { conflict } from '../../lib/errors.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';
import { contactKeyFor } from '../../utils/identity.js';
import { verifyRecaptcha } from '../../services/recaptcha.js';
import { assertWritesAllowed } from '../../services/flags.js';

/*
 * Two different protections, often confused:
 *
 *  - IDEMPOTENCY stops the *same* submission being stored twice (double-click,
 *    retry after a timeout). Keyed on a client-supplied Idempotency-Key, with
 *    a short-window fallback for clients that do not send one.
 *  - DUPLICATE DETECTION links *different* submissions from the same person
 *    into one contact thread, so a sales agent sees one person who enquired
 *    three times rather than three unrelated rows.
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const FALLBACK_DEDUPE_WINDOW_MS = 60 * 1000;
const THREAD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const hashBody = (body) =>
  crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');

/*
 * Reserves the key. Returns the stored response when this exact request has
 * already completed, so a retry is a read rather than a second insert.
 */
async function reserveIdempotency(key, scope, body) {
  if (!key) return { reserved: false };

  const requestHash = hashBody(body);
  try {
    await IdempotencyKey.create({
      key,
      scope,
      requestHash,
      status: 'in_progress',
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    });
    return { reserved: true, requestHash };
  } catch (error) {
    if (error?.code !== 11000) throw error;

    const existing = await IdempotencyKey.findOne({ key }).lean();
    if (!existing) return { reserved: true, requestHash };

    if (existing.requestHash !== requestHash) {
      throw conflict('That idempotency key was already used with a different payload.', {
        field: 'Idempotency-Key',
      });
    }
    if (existing.status === 'completed') {
      return { reserved: false, replay: true, response: existing.response, statusCode: existing.statusCode };
    }
    // Still in flight: the first request will answer. Telling the client to
    // retry is better than racing it and creating a second lead.
    throw conflict('This submission is still being processed. Please wait a moment.');
  }
}

async function completeIdempotency(key, statusCode, response) {
  if (!key) return;
  await IdempotencyKey.updateOne(
    { key },
    { $set: { status: 'completed', statusCode, response } },
  ).catch((error) => logger.warn({ err: error, key }, 'failed to persist idempotent response'));
}

/*
 * Finds a recent lead from the same person. Used both as the last-ditch
 * duplicate guard for clients that sent no key, and to build contact threads.
 */
async function findRecentLead(contactKey, windowMs) {
  return Lead.findOne({
    contactKey,
    createdAt: { $gte: new Date(Date.now() - windowMs) },
  })
    .sort({ createdAt: -1 })
    .lean();
}

/*
 * Notifications are fired after the lead is committed, never before, and their
 * outcome is written back onto the lead. If the queue is unreachable the lead
 * still exists with its alerts marked `pending`, and the sweeper retries.
 * This ordering is the whole point: persistence first, delivery second.
 */
async function dispatchNotifications(lead) {
  const [adminAlert, customerEmail] = await Promise.all([
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.leadAdminAlert, { leadId: String(lead._id) }),
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.leadCustomerEmail, { leadId: String(lead._id) }),
  ]);

  const now = new Date();
  const update = {};
  if (adminAlert.queued && !adminAlert.inline) {
    update['notifications.adminEmail.status'] = 'queued';
    update['notifications.adminEmail.queuedAt'] = now;
    update['notifications.adminWhatsapp.status'] = 'queued';
    update['notifications.adminWhatsapp.queuedAt'] = now;
  } else if (!adminAlert.queued) {
    update['notifications.adminEmail.status'] = 'pending';
    update['notifications.adminEmail.lastError'] = adminAlert.reason;
  }

  if (customerEmail.queued && !customerEmail.inline) {
    update['notifications.customerEmail.status'] = 'queued';
    update['notifications.customerEmail.queuedAt'] = now;
  } else if (!customerEmail.queued) {
    update['notifications.customerEmail.status'] = 'pending';
    update['notifications.customerEmail.lastError'] = customerEmail.reason;
  }

  if (Object.keys(update).length > 0) {
    await Lead.updateOne({ _id: lead._id }, { $set: update }).catch((error) =>
      logger.error({ err: error, leadId: lead._id }, 'failed to record notification state'),
    );
  }

  if (!adminAlert.queued || !customerEmail.queued) {
    logger.error(
      { leadId: String(lead._id), adminAlert, customerEmail },
      'lead saved but notifications could not be queued; sweeper will retry',
    );
  }
}

export async function createLead(input, requestMeta) {
  await assertWritesAllowed('submissions_enabled');

  const { website, recaptchaToken, consent, ...payload } = input;

  /*
   * Honeypot hit. Respond exactly like a success: a bot that sees a rejection
   * learns the trap and adapts, whereas a fake 201 costs it nothing to keep
   * filling. Nothing is stored.
   */
  if (website && website.trim().length > 0) {
    logger.info({ ipHash: requestMeta.ipHash }, 'lead rejected: honeypot triggered');
    return {
      statusCode: 201,
      body: { data: { id: null, status: 'received' }, meta: { deduplicated: false } },
      spam: true,
    };
  }

  const captcha = await verifyRecaptcha(recaptchaToken, requestMeta.ip);
  if (!captcha.ok) {
    logger.warn({ reason: captcha.reason, score: captcha.score }, 'lead rejected: recaptcha');
    return {
      statusCode: 201,
      body: { data: { id: null, status: 'received' }, meta: { deduplicated: false } },
      spam: true,
    };
  }

  const contactKey = contactKeyFor(payload.email);

  /* Idempotency, if the client supplied a key. */
  const idempotency = await reserveIdempotency(requestMeta.idempotencyKey, 'leads:create', input);
  if (idempotency.replay) {
    return { statusCode: idempotency.statusCode ?? 201, body: idempotency.response, replayed: true };
  }

  /*
   * Fallback guard for clients with no key: an identical-looking submission
   * inside a one-minute window is a double-submit, not a second enquiry.
   */
  if (!requestMeta.idempotencyKey) {
    const recent = await findRecentLead(contactKey, FALLBACK_DEDUPE_WINDOW_MS);
    if (recent && recent.source === payload.source) {
      logger.info({ leadId: String(recent._id) }, 'lead deduplicated by short window');
      return {
        statusCode: 200,
        body: {
          data: { id: String(recent._id), status: 'received' },
          meta: { deduplicated: true },
        },
      };
    }
  }

  /* Contact threading: link to the person's earlier enquiry, if any. */
  const thread = await findRecentLead(contactKey, THREAD_WINDOW_MS);
  const threadRoot = thread ? thread.duplicateOf ?? thread._id : null;

  const lead = await Lead.create({
    ...payload,
    contactKey,
    tripPreferences: payload.tripPreferences ?? {},
    interest: payload.interest
      ? { ...payload.interest, kind: payload.interest.kind ?? null }
      : undefined,
    context: {
      ...(payload.context ?? {}),
      userAgent: requestMeta.userAgent,
      ipHash: requestMeta.ipHash,
    },
    consent: {
      marketing: consent?.marketing ?? false,
      termsAcceptedAt: consent?.terms ? new Date() : undefined,
      capturedAt: new Date(),
      ipHash: requestMeta.ipHash,
    },
    duplicateOf: threadRoot,
    lastEnquiryAt: new Date(),
    idempotencyKey: requestMeta.idempotencyKey ?? null,
    spamScore: captcha.score,
    statusHistory: [{ to: 'new', at: new Date() }],
  });

  if (threadRoot) {
    await Lead.updateOne(
      { _id: threadRoot },
      { $inc: { enquiryCount: 1 }, $set: { lastEnquiryAt: new Date() } },
    ).catch((error) => logger.warn({ err: error }, 'failed to update contact thread counter'));
  }

  logger.info(
    {
      leadId: String(lead._id),
      source: lead.source,
      threaded: Boolean(threadRoot),
      requestId: requestMeta.requestId,
    },
    'lead captured',
  );

  // Fire-and-forget would lose the outbox bookkeeping, so this is awaited; it
  // is two Redis writes and does not involve the email provider.
  await dispatchNotifications(lead);

  const body = {
    data: { id: String(lead._id), status: 'received' },
    meta: { deduplicated: false, threaded: Boolean(threadRoot) },
  };
  await completeIdempotency(requestMeta.idempotencyKey, 201, body);

  return { statusCode: 201, body };
}
