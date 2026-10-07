import { Lead } from '../models/Lead.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { JOB_NAMES } from '../lib/queue.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { sendEmail } from './mailer.js';
import { sendLeadAlert, isWhatsappEnabled } from './whatsapp.js';
import {
  leadAdminAlert,
  leadCustomerConfirmation,
  newsletterOptIn,
  newsletterWelcome,
} from './emailTemplates.js';

/*
 * Job handlers, shared by the BullMQ worker and by the inline fallback used
 * when Redis is absent. Each one updates the outbox field on the source
 * document so the delivery state is queryable from the dashboard and the
 * sweeper can find anything still stuck.
 *
 * Throwing is meaningful: it is how a handler asks BullMQ for a retry.
 */
async function markDelivery(leadId, channel, patch) {
  const prefix = `notifications.${channel}`;
  const set = Object.fromEntries(Object.entries(patch).map(([key, value]) => [`${prefix}.${key}`, value]));
  await Lead.updateOne({ _id: leadId }, { $set: set, $inc: { [`${prefix}.attempts`]: 1 } });
}

/*
 * A channel that already reported `sent` or `skipped` is done. Handlers are
 * retried by BullMQ and re-queued by the sweeper, so every one of them has to
 * be safe to run twice.
 */
function alreadyDelivered(doc, channel) {
  const status = doc?.notifications?.[channel]?.status;
  return status === 'sent' || status === 'skipped';
}

async function handleLeadAdminAlert({ leadId }) {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) {
    logger.warn({ leadId }, 'admin alert skipped: lead no longer exists');
    return;
  }

  /*
   * This job covers two channels, and each is skipped if it has already gone
   * out. That matters because a retry is triggered by *either* channel
   * failing: without the check, a WhatsApp outage would mail the sales desk
   * six times about one lead.
   */
  const deliver = async (channel, send) => {
    if (alreadyDelivered(lead, channel)) return;
    try {
      const result = await send();
      await markDelivery(leadId, channel, {
        status: result.skipped ? 'skipped' : 'sent',
        sentAt: new Date(),
        providerMessageId: result.messageId ?? null,
        lastError: null,
      });
    } catch (error) {
      await markDelivery(leadId, channel, { status: 'failed', lastError: error.message });
      throw error;
    }
  };

  const { subject, html, replyTo } = leadAdminAlert(lead);
  await deliver('adminEmail', () =>
    sendEmail({ to: env.LEAD_ALERT_EMAILS, subject, html, replyTo }),
  );

  if (!isWhatsappEnabled()) {
    if (!alreadyDelivered(lead, 'adminWhatsapp')) {
      await markDelivery(leadId, 'adminWhatsapp', { status: 'skipped' });
    }
    return;
  }

  await deliver('adminWhatsapp', () => sendLeadAlert(lead));
}

async function handleLeadCustomerEmail({ leadId }) {
  const lead = await Lead.findById(leadId).lean();
  if (!lead || lead.anonymisedAt) return;
  if (alreadyDelivered(lead, 'customerEmail')) return;

  const { subject, html } = leadCustomerConfirmation(lead);
  try {
    const result = await sendEmail({ to: lead.email, subject, html });
    await markDelivery(leadId, 'customerEmail', {
      status: result.skipped ? 'skipped' : 'sent',
      sentAt: new Date(),
      providerMessageId: result.messageId ?? null,
      lastError: null,
    });
  } catch (error) {
    await markDelivery(leadId, 'customerEmail', { status: 'failed', lastError: error.message });
    throw error;
  }
}

async function handleNewsletterOptIn({ subscriberId, token }) {
  const subscriber = await NewsletterSubscriber.findById(subscriberId).lean();
  if (!subscriber || subscriber.status !== 'pending') return;

  const { subject, html } = newsletterOptIn({ email: subscriber.email, token });
  await sendEmail({ to: subscriber.email, subject, html });
  await NewsletterSubscriber.updateOne(
    { _id: subscriberId },
    { $inc: { confirmationsSent: 1 } },
  );
}

async function handleNewsletterWelcome({ subscriberId, unsubscribeToken }) {
  const subscriber = await NewsletterSubscriber.findById(subscriberId).lean();
  if (!subscriber || subscriber.status !== 'confirmed') return;
  if (subscriber.welcomeEmail?.status === 'sent') return;

  /*
   * Only the hash of the unsubscribe token is stored, so a retry queued by the
   * sweeper (which has no plaintext) mints a fresh one and replaces the hash.
   * Any link from an earlier attempt stops working, which is correct: the
   * earlier attempt never reached the subscriber.
   */
  let token = unsubscribeToken;
  if (!token) {
    token = randomToken(32);
    await NewsletterSubscriber.updateOne(
      { _id: subscriberId },
      { $set: { unsubscribeTokenHash: sha256(token) } },
    );
  }

  const { subject, html } = newsletterWelcome({ email: subscriber.email, unsubscribeToken: token });
  try {
    const result = await sendEmail({ to: subscriber.email, subject, html });
    await NewsletterSubscriber.updateOne(
      { _id: subscriberId },
      {
        $set: {
          'welcomeEmail.status': result.skipped ? 'skipped' : 'sent',
          'welcomeEmail.sentAt': new Date(),
          'welcomeEmail.lastError': null,
        },
        $inc: { 'welcomeEmail.attempts': 1 },
      },
    );
  } catch (error) {
    await NewsletterSubscriber.updateOne(
      { _id: subscriberId },
      {
        $set: { 'welcomeEmail.status': 'failed', 'welcomeEmail.lastError': error.message },
        $inc: { 'welcomeEmail.attempts': 1 },
      },
    );
    throw error;
  }
}

const HANDLERS = {
  [JOB_NAMES.leadAdminAlert]: handleLeadAdminAlert,
  [JOB_NAMES.leadCustomerEmail]: handleLeadCustomerEmail,
  [JOB_NAMES.newsletterOptIn]: handleNewsletterOptIn,
  [JOB_NAMES.newsletterWelcome]: handleNewsletterWelcome,
};

export async function processNotificationJob(job) {
  const handler = HANDLERS[job.name];
  if (!handler) {
    logger.warn({ jobName: job.name }, 'no handler for job');
    return;
  }
  await handler(job.data ?? {});
}

export { markDelivery };
