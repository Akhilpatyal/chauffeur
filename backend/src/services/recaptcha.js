import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * reCAPTCHA v3 is score-based and invisible, so it never blocks a real user
 * with a puzzle. The trade-off is that the score is advisory: we record it on
 * the lead either way and only reject clearly automated traffic.
 *
 * Google being unreachable must not stop a genuine enquiry from being saved.
 * On a network failure we allow the submission and flag it, because a lost
 * lead costs more than a spam row someone deletes in the dashboard.
 */
export async function verifyRecaptcha(token, remoteIp) {
  if (!env.recaptchaEnabled) return { enabled: false, ok: true, score: null };
  if (!token) return { enabled: true, ok: false, score: null, reason: 'missing-token' };

  try {
    const params = new URLSearchParams({ secret: env.RECAPTCHA_SECRET, response: token });
    if (remoteIp) params.set('remoteip', remoteIp);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(5_000),
    });

    const result = await response.json();
    const score = typeof result.score === 'number' ? result.score : null;

    if (!result.success) {
      return { enabled: true, ok: false, score, reason: (result['error-codes'] ?? []).join(',') };
    }
    if (score !== null && score < env.RECAPTCHA_MIN_SCORE) {
      return { enabled: true, ok: false, score, reason: 'low-score' };
    }
    return { enabled: true, ok: true, score };
  } catch (error) {
    logger.warn({ err: error }, 'recaptcha verification unavailable, allowing submission');
    return { enabled: true, ok: true, score: null, reason: 'verify-unavailable' };
  }
}
