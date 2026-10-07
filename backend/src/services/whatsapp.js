import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Instant lead alerts to the sales team's phones.
 *
 * Meta's Cloud API only allows free-form text inside a 24-hour customer
 * service window, which a cold alert to your own team is not. So the Meta path
 * sends an approved template with the lead details as body parameters; the
 * template name is configurable because approval is per-business.
 *
 * Twilio is the fallback for teams that already run on it and accepts plain
 * text, which is why the two branches differ in shape.
 */
class WhatsappError extends Error {
  constructor(message, { retryable = true, status } = {}) {
    super(message);
    this.name = 'WhatsappError';
    this.retryable = retryable;
    this.status = status;
  }
}

async function sendViaMeta({ to, parameters, body }) {
  const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = env.WHATSAPP_TEMPLATE_NAME
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: env.WHATSAPP_TEMPLATE_NAME,
          language: { code: env.WHATSAPP_TEMPLATE_LANG },
          components: [
            {
              type: 'body',
              parameters: parameters.map((text) => ({ type: 'text', text: String(text).slice(0, 300) })),
            },
          ],
        },
      }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body } };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new WhatsappError(`meta responded ${response.status}: ${text.slice(0, 300)}`, {
      retryable: response.status === 429 || response.status >= 500,
      status: response.status,
    });
  }
  const parsed = JSON.parse(text || '{}');
  return parsed.messages?.[0]?.id ?? null;
}

async function sendViaTwilio({ to, body }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    From: env.TWILIO_FROM,
    Body: body.slice(0, 1500),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new WhatsappError(`twilio responded ${response.status}: ${text.slice(0, 300)}`, {
      retryable: response.status === 429 || response.status >= 500,
      status: response.status,
    });
  }
  return JSON.parse(text || '{}').sid ?? null;
}

export function isWhatsappEnabled() {
  if (env.WHATSAPP_PROVIDER === 'none') return false;
  if (env.LEAD_ALERT_PHONES.length === 0) return false;
  if (env.WHATSAPP_PROVIDER === 'meta') {
    return Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN);
  }
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);
}

export function leadAlertMessage(lead) {
  const lines = [
    `New ${lead.source.replace(/_/g, ' ')} enquiry`,
    `${lead.name} — ${lead.phone || lead.email}`,
    lead.topic || lead.tripPreferences?.destination || lead.interest?.title || '',
    lead.travelDates ? `Dates: ${lead.travelDates}` : '',
    lead.groupSize ? `Travellers: ${lead.groupSize}` : '',
  ].filter(Boolean);

  return {
    body: lines.join('\n'),
    parameters: [
      lead.name,
      lead.phone || lead.email,
      lead.topic || lead.tripPreferences?.destination || 'General enquiry',
      lead.travelDates || 'Flexible',
    ],
  };
}

export async function sendLeadAlert(lead) {
  if (!isWhatsappEnabled()) {
    logger.debug('whatsapp alert skipped: provider not configured');
    return { skipped: true };
  }

  const { body, parameters } = leadAlertMessage(lead);
  const ids = [];

  // Sent one number at a time so a single bad number does not block the rest.
  for (const to of env.LEAD_ALERT_PHONES) {
    try {
      const id =
        env.WHATSAPP_PROVIDER === 'meta'
          ? await sendViaMeta({ to, parameters, body })
          : await sendViaTwilio({ to, body });
      ids.push(id);
    } catch (error) {
      logger.error({ err: error, to }, 'whatsapp alert failed for recipient');
      if (env.LEAD_ALERT_PHONES.length === 1) throw error;
    }
  }

  if (ids.length === 0) throw new WhatsappError('no whatsapp recipient accepted the message');
  return { messageId: ids[0], skipped: false };
}

export { WhatsappError };
