import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { logger } from '../../config/logger.js';
import { badRequest } from '../../lib/errors.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { verifyRecaptcha } from '../../services/recaptcha.js';
import { assertWritesAllowed } from '../../services/flags.js';

/*
 * Double opt-in, for two reasons that both matter commercially:
 *   - Mailbox providers throttle or blocklist senders whose lists are built
 *     from unconfirmed addresses, which degrades every other email you send,
 *     including the lead confirmations.
 *   - The confirmation timestamp plus IP is the evidence you need if consent
 *     is ever disputed.
 */
const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export async function subscribe(input, requestMeta) {
  await assertWritesAllowed('newsletter_enabled');

  const { website, recaptchaToken, email, name, sourcePage, utm } = input;

  if (website && website.trim().length > 0) {
    logger.info({ ipHash: requestMeta.ipHash }, 'newsletter signup rejected: honeypot');
    return { statusCode: 202, body: { data: { status: 'pending' } } };
  }

  const captcha = await verifyRecaptcha(recaptchaToken, requestMeta.ip);
  if (!captcha.ok) {
    logger.warn({ reason: captcha.reason }, 'newsletter signup rejected: recaptcha');
    return { statusCode: 202, body: { data: { status: 'pending' } } };
  }

  const existing = await NewsletterSubscriber.findOne({ email }).lean();

  if (existing?.status === 'confirmed') {
    // Already subscribed. Say so plainly rather than sending another opt-in
    // email, which reads as spam to someone who is already on the list.
    return { statusCode: 200, body: { data: { status: 'already_subscribed' } } };
  }

  if (existing?.status === 'unsubscribed') {
    // A re-subscribe is a fresh consent event and needs a fresh confirmation.
    logger.info({ email }, 'previously unsubscribed address is re-subscribing');
  }

  /* Rate-limit opt-in emails per address, independently of the IP limiter, so
   * one address cannot be used to mail-bomb someone. */
  if (
    existing?.status === 'pending' &&
    existing.updatedAt &&
    Date.now() - new Date(existing.updatedAt).getTime() < RESEND_COOLDOWN_MS
  ) {
    return { statusCode: 202, body: { data: { status: 'pending' } } };
  }

  const token = randomToken(32);

  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        status: 'pending',
        confirmTokenHash: sha256(token),
        confirmTokenExpiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
        'consent.requestedAt': new Date(),
        'consent.ipHash': requestMeta.ipHash,
        'consent.userAgent': requestMeta.userAgent,
        'consent.sourcePage': sourcePage,
        unsubscribedAt: null,
        utm: utm ?? {},
      },
      $setOnInsert: { email },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const queued = await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.newsletterOptIn, {
    subscriberId: String(subscriber._id),
    token,
  });

  if (!queued.queued) {
    logger.error({ email, reason: queued.reason }, 'opt-in email could not be queued');
  }

  return { statusCode: 202, body: { data: { status: 'pending' } } };
}

export async function confirm(token) {
  const subscriber = await NewsletterSubscriber.findOne({ confirmTokenHash: sha256(token) });

  if (!subscriber) throw badRequest('That confirmation link is not valid.');
  if (subscriber.status === 'confirmed') return { alreadyConfirmed: true };
  if (!subscriber.confirmTokenExpiresAt || subscriber.confirmTokenExpiresAt < new Date()) {
    throw badRequest('That confirmation link has expired. Please sign up again.');
  }

  const unsubscribeToken = randomToken(32);

  subscriber.status = 'confirmed';
  subscriber.consent.confirmedAt = new Date();
  subscriber.confirmTokenHash = null;
  subscriber.confirmTokenExpiresAt = null;
  subscriber.unsubscribeTokenHash = sha256(unsubscribeToken);
  await subscriber.save();

  await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.newsletterWelcome, {
    subscriberId: String(subscriber._id),
    unsubscribeToken,
  });

  logger.info({ email: subscriber.email }, 'newsletter subscription confirmed');
  return { alreadyConfirmed: false };
}

export async function unsubscribe(token, reason) {
  const subscriber = await NewsletterSubscriber.findOne({ unsubscribeTokenHash: sha256(token) });
  if (!subscriber) throw badRequest('That unsubscribe link is not valid.');

  // Unsubscribing twice is not an error; the desired state is already true.
  if (subscriber.status !== 'unsubscribed') {
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    subscriber.unsubscribeReason = reason;
    await subscriber.save();
    logger.info({ email: subscriber.email }, 'newsletter unsubscribed');
  }

  return { email: subscriber.email };
}
