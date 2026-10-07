import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Transactional email over the providers' REST APIs rather than an SDK or raw
 * SMTP. Three reasons: no native dependency in the image, one code path for
 * every provider, and the provider message id comes back on the response so
 * delivery can be traced from a lead record into the provider's dashboard.
 *
 * A failure here throws. The caller is always a queue worker, so throwing is
 * what triggers BullMQ's retry with backoff.
 */
class EmailError extends Error {
  constructor(message, { retryable = true, status } = {}) {
    super(message);
    this.name = 'EmailError';
    this.retryable = retryable;
    this.status = status;
  }
}

async function post(url, { headers, body }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    // 4xx other than 429 means the request itself is wrong; retrying it will
    // fail identically and only burns queue capacity.
    const retryable = response.status === 429 || response.status >= 500;
    throw new EmailError(
      `email provider responded ${response.status}: ${text.slice(0, 300)}`,
      { retryable, status: response.status },
    );
  }

  return payload;
}

const providers = {
  async resend({ to, subject, html, text, replyTo }) {
    const payload = await post('https://api.resend.com/emails', {
      headers: { authorization: `Bearer ${env.EMAIL_API_KEY}` },
      body: { from: env.EMAIL_FROM, to, subject, html, text, reply_to: replyTo },
    });
    return payload.id;
  },

  async sendgrid({ to, subject, html, text, replyTo }) {
    // SendGrid returns 202 with an empty body; the id is in a header.
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        personalizations: [{ to: to.map((address) => ({ email: address })) }],
        from: parseAddress(env.EMAIL_FROM),
        reply_to: { email: replyTo ?? env.EMAIL_REPLY_TO },
        subject,
        content: [
          { type: 'text/plain', value: text ?? stripHtml(html) },
          { type: 'text/html', value: html },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new EmailError(`sendgrid responded ${response.status}: ${body.slice(0, 300)}`, {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status,
      });
    }
    return response.headers.get('x-message-id') ?? null;
  },

  async postmark({ to, subject, html, text, replyTo }) {
    const payload = await post('https://api.postmarkapp.com/email', {
      headers: { 'X-Postmark-Server-Token': env.EMAIL_API_KEY },
      body: {
        From: env.EMAIL_FROM,
        To: to.join(','),
        Subject: subject,
        HtmlBody: html,
        TextBody: text ?? stripHtml(html),
        ReplyTo: replyTo ?? env.EMAIL_REPLY_TO,
        MessageStream: 'outbound',
      },
    });
    return payload.MessageID;
  },

  async console({ to, subject, text, html }) {
    logger.info({ to, subject, preview: (text ?? stripHtml(html)).slice(0, 400) }, 'email (console provider)');
    return `console-${Date.now()}`;
  },
};

function parseAddress(value) {
  const match = /^(.*)<(.+)>$/.exec(value.trim());
  if (!match) return { email: value.trim() };
  return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
}

function stripHtml(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) {
    logger.warn({ subject }, 'email skipped: no recipients configured');
    return { skipped: true };
  }

  const provider = providers[env.EMAIL_PROVIDER];
  if (env.EMAIL_PROVIDER !== 'console' && !env.EMAIL_API_KEY) {
    throw new EmailError(`EMAIL_PROVIDER=${env.EMAIL_PROVIDER} but EMAIL_API_KEY is empty`, {
      retryable: false,
    });
  }

  const messageId = await provider({ to: recipients, subject, html, text, replyTo });
  logger.info({ to: recipients, subject, messageId, provider: env.EMAIL_PROVIDER }, 'email sent');
  return { messageId, skipped: false };
}

export { EmailError, stripHtml };
