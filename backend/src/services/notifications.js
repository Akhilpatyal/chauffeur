import { Lead } from '../models/Lead.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { JOB_NAMES } from '../lib/queue.js';
import { Booking } from '../models/Booking.js';
import { Quotation } from '../models/Quotation.js';
import { Customer } from '../models/Customer.js';
import { recordEventQuietly } from './bookingEvents.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { sendEmail } from './mailer.js';
import { sendLeadAlert, isWhatsappEnabled } from './whatsapp.js';
import {
  leadAdminAlert,
  leadCustomerConfirmation,
  newsletterOptIn,
  newsletterWelcome,
  bookingRequestReceived,
  bookingRequestAdminAlert,
  quotationSent,
  quotationAcceptedAlert,
  quotationRespondedAlert,
  bookingStatusChanged,
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


/*
 * Booking notifications.
 *
 * Delivery is recorded on the booking's own event history rather than in a
 * `notifications` sub-document, because the history is already the single
 * place anybody looks to answer "what happened to this booking" — and an
 * email that did not arrive is exactly the sort of thing somebody is looking
 * for when they ask.
 *
 * A failure rethrows so BullMQ retries with backoff. The booking itself is
 * already saved and is never at risk: losing the email costs a notification,
 * not a reservation.
 */
async function handleBookingRequestCustomer({ bookingId }) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return;

  const customer = await Customer.findById(booking.customer).lean();
  const to = customer?.email ?? booking.contact?.email;
  if (!to) return;

  const { subject, html } = bookingRequestReceived(booking, customer);
  try {
    const result = await sendEmail({ to, subject, html });
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: 'Acknowledgement emailed',
      actorKind: 'system',
      customerVisible: false,
      meta: { to, messageId: result.messageId ?? null, skipped: Boolean(result.skipped) },
    });
  } catch (error) {
    /* Recorded before rethrowing, so a booking whose email never arrived is
     * visible on the board rather than only in a log nobody reads. */
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: 'Acknowledgement email failed',
      description: error.message,
      actorKind: 'system',
      customerVisible: false,
    });
    throw error;
  }
}

async function handleBookingRequestAdmin({ bookingId }) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return;
  if (!env.LEAD_ALERT_EMAILS?.length) return;

  const customer = await Customer.findById(booking.customer).lean();
  const { subject, html } = bookingRequestAdminAlert(booking, customer);
  await sendEmail({ to: env.LEAD_ALERT_EMAILS, subject, html });
}

/*
 * Quotation mail.
 *
 * Loaded fresh from the database rather than passed through the queue, so a
 * job that sat in Redis through a revision sends the quotation as it now
 * stands rather than a stale copy of the price.
 */
async function loadQuotationContext(quotationId) {
  const quotation = await Quotation.findById(quotationId).lean();
  if (!quotation) return null;

  const booking = await Booking.findById(quotation.booking).lean();
  if (!booking) return null;

  const customer = await Customer.findById(booking.customer).lean();
  return { quotation, booking, customer };
}

async function handleQuotationSent({ quotationId }) {
  const context = await loadQuotationContext(quotationId);
  if (!context) return;

  const { quotation, booking, customer } = context;
  const to = customer?.email ?? booking.contact?.email;
  if (!to) return;

  const { subject, html } = quotationSent(booking, quotation, customer);
  try {
    const result = await sendEmail({ to, subject, html });
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: `Quotation v${quotation.version} emailed`,
      actorKind: 'system',
      customerVisible: false,
      meta: { to, messageId: result.messageId ?? null, skipped: Boolean(result.skipped) },
    });
  } catch (error) {
    /* Recorded before rethrowing: a quotation the customer never received
     * looks identical on the board to one they are ignoring, and the desk
     * needs to be able to tell those apart. */
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: `Quotation v${quotation.version} email failed`,
      description: error.message,
      actorKind: 'system',
      customerVisible: false,
    });
    throw error;
  }
}

async function handleQuotationAccepted({ quotationId }) {
  const context = await loadQuotationContext(quotationId);
  if (!context) return;
  if (!env.LEAD_ALERT_EMAILS?.length) return;

  const { quotation, booking, customer } = context;
  const { subject, html } = quotationAcceptedAlert(booking, quotation, customer);
  await sendEmail({ to: env.LEAD_ALERT_EMAILS, subject, html });
}

async function handleQuotationResponded({ quotationId }) {
  const context = await loadQuotationContext(quotationId);
  if (!context) return;
  if (!env.LEAD_ALERT_EMAILS?.length) return;

  const { quotation, booking, customer } = context;
  const { subject, html } = quotationRespondedAlert(booking, quotation, customer);
  await sendEmail({ to: env.LEAD_ALERT_EMAILS, subject, html });
}

/*
 * Tell the customer their booking moved.
 *
 * Statuses with nothing useful to say produce no template and therefore no
 * mail — the check happens in the template, so there is one list of "which
 * moves are worth an email" rather than two that disagree.
 */
async function handleBookingStatusChanged({ bookingId, reason, status }) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return;

  /*
   * Drop the job if the booking has moved on since it was queued.
   *
   * The booking is loaded fresh rather than taken from the payload, which is
   * right for the trip details but wrong for the news itself: two moves in
   * quick succession produced two jobs, and by the time the worker ran both
   * rendered the latest status — so the customer got the rejection twice and
   * the "we are checking" email never at all.
   *
   * Stale news is not worth sending late. Telling somebody we are checking
   * availability after we have already turned them down is worse than
   * silence, so the overtaken job is dropped and the current one stands.
   */
  if (status && booking.status !== status) {
    logger.info(
      { booking: String(booking._id), queuedFor: status, now: booking.status },
      'skipping status email overtaken by a later change',
    );
    return;
  }

  const customer = await Customer.findById(booking.customer).lean();
  const to = customer?.email ?? booking.contact?.email;
  if (!to) return;

  const mail = bookingStatusChanged(booking, customer, { reason });
  if (!mail) return;

  try {
    const result = await sendEmail({ to, subject: mail.subject, html: mail.html });
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: `Status email sent (${booking.status})`,
      actorKind: 'system',
      customerVisible: false,
      meta: { to, messageId: result.messageId ?? null, skipped: Boolean(result.skipped) },
    });
  } catch (error) {
    await recordEventQuietly({
      booking: booking._id,
      type: 'note.added',
      title: `Status email failed (${booking.status})`,
      description: error.message,
      actorKind: 'system',
      customerVisible: false,
    });
    throw error;
  }
}

const HANDLERS = {
  [JOB_NAMES.leadAdminAlert]: handleLeadAdminAlert,
  [JOB_NAMES.leadCustomerEmail]: handleLeadCustomerEmail,
  [JOB_NAMES.bookingRequestCustomer]: handleBookingRequestCustomer,
  [JOB_NAMES.bookingRequestAdmin]: handleBookingRequestAdmin,
  [JOB_NAMES.quotationSent]: handleQuotationSent,
  [JOB_NAMES.quotationAccepted]: handleQuotationAccepted,
  [JOB_NAMES.quotationResponded]: handleQuotationResponded,
  [JOB_NAMES.bookingStatusChanged]: handleBookingStatusChanged,
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
