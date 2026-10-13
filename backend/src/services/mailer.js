import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Transactional email.
 *
 * The hosted providers are reached over their REST APIs rather than through an
 * SDK: no extra dependency, one code path for all of them, and the provider's
 * message id comes back on the response so a delivery can be traced from a
 * lead record into the provider's own dashboard.
 *
 * SMTP is also supported, because it is what a small operator actually has on
 * day one — a Gmail account and an App Password, no signup, no DNS records,
 * no monthly minimum. It is the right place to start and the wrong place to
 * stay: see the note on the smtp provider below.
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

  /*
   * SMTP, via nodemailer.
   *
   * WHAT TO KNOW BEFORE RELYING ON THIS
   *
   * Gmail allows roughly 500 messages a day on a personal account and around
   * 2,000 on Workspace, and it counts each recipient. That is ample for lead
   * alerts to a five-person desk and nowhere near enough for a newsletter, so
   * the two should not share this transport once the list grows.
   *
   * Mail sent this way is also sent *as* the Gmail account, so it lands with
   * that account's reputation and address rather than the site's domain. Once
   * there is a domain to protect, one of the providers above with SPF, DKIM
   * and DMARC configured is a real deliverability upgrade, not a formality.
   *
   * The connection is pooled and the transport is built once. Creating one per
   * message means a TLS handshake and an AUTH round trip for every email,
   * which on a burst of lead alerts is most of the time spent.
   */
  async smtp({ to, subject, html, text, replyTo }) {
    const transport = await smtpTransport();
    try {
      const result = await transport.sendMail({
        from: env.EMAIL_FROM,
        to: to.join(', '),
        subject,
        html,
        text: text ?? stripHtml(html),
        replyTo: replyTo ?? env.EMAIL_REPLY_TO,
      });
      return result.messageId;
    } catch (error) {
      /*
       * 5xx SMTP replies are permanent (bad address, message rejected);
       * 4xx are transient (greylisting, rate limit, server busy). Retrying a
       * permanent failure would burn queue capacity to fail identically, and
       * the sweeper would keep it visibly stuck forever.
       */
      const code = Number(error.responseCode);
      const retryable = !Number.isFinite(code) || code < 500;
      throw new EmailError(`smtp send failed: ${String(error.message).slice(0, 300)}`, {
        retryable,
        status: Number.isFinite(code) ? code : undefined,
      });
    }
  },

  async console({ to, subject, text, html }) {
    logger.info({ to, subject, preview: (text ?? stripHtml(html)).slice(0, 400) }, 'email (console provider)');
    return `console-${Date.now()}`;
  },
};

/*
 * Built once, lazily.
 *
 * Lazily because `nodemailer` should not be loaded at import time when the
 * configured provider is one of the REST ones — most deployments never use
 * this path, and the module costs startup time and image surface for nothing.
 * Once, because a pooled connection is the difference between one TLS
 * handshake and one per message.
 */
let transportPromise = null;

function smtpTransport() {
  if (!transportPromise) {
    transportPromise = import('nodemailer').then(({ default: nodemailer }) =>
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        /* Bounded so a wedged connection surfaces as a retryable job failure
         * rather than holding a worker open indefinitely. */
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    );
  }
  return transportPromise;
}

/* Used by scripts/check-email.js to prove the credentials work without
 * sending anything to a real person. */
export async function verifyEmailTransport() {
  if (env.EMAIL_PROVIDER !== 'smtp') {
    return { provider: env.EMAIL_PROVIDER, verifiable: false };
  }
  const transport = await smtpTransport();
  await transport.verify();
  return { provider: 'smtp', verifiable: true, host: env.SMTP_HOST, port: env.SMTP_PORT };
}

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

  /*
   * Fail loudly on a misconfiguration, and name the variable that is missing.
   * A provider with no credentials otherwise fails per-message inside a queue
   * worker, where it looks like a delivery problem rather than a deployment
   * one — and the retries hide it for hours.
   *
   * `retryable: false` on purpose: no amount of backoff will supply a
   * password.
   */
  if (env.EMAIL_PROVIDER === 'smtp') {
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
      throw new EmailError('EMAIL_PROVIDER=smtp but SMTP_USER or SMTP_PASSWORD is empty', {
        retryable: false,
      });
    }
  } else if (env.EMAIL_PROVIDER !== 'console' && !env.EMAIL_API_KEY) {
    throw new EmailError(`EMAIL_PROVIDER=${env.EMAIL_PROVIDER} but EMAIL_API_KEY is empty`, {
      retryable: false,
    });
  }

  const messageId = await provider({ to: recipients, subject, html, text, replyTo });
  logger.info({ to: recipients, subject, messageId, provider: env.EMAIL_PROVIDER }, 'email sent');
  return { messageId, skipped: false };
}

export { EmailError, stripHtml };
