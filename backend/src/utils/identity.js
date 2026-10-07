import crypto from 'node:crypto';
import { env } from '../config/env.js';

/*
 * IP addresses are personal data. We only ever need to answer "is this the
 * same submitter as before?", which a keyed hash answers without storing the
 * address itself. Keyed with the cookie secret so the hashes are not portable
 * between environments.
 */
export function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHmac('sha256', env.COOKIE_SECRET).update(String(ip)).digest('hex').slice(0, 40);
}

/*
 * Folds the provider-specific aliasing that makes the same person look like
 * three different leads: Gmail ignores dots and everything after a plus.
 * Used for duplicate detection and contact threading, never for login.
 */
const DOT_INSENSITIVE = new Set(['gmail.com', 'googlemail.com']);

export function contactKeyFor(email) {
  const normalised = String(email ?? '').trim().toLowerCase();
  const [localPart, domain] = normalised.split('@');
  if (!domain) return normalised;

  let local = localPart.split('+')[0];
  if (DOT_INSENSITIVE.has(domain)) local = local.replace(/\./g, '');
  return `${local}@${domain === 'googlemail.com' ? 'gmail.com' : domain}`;
}

/* Last 10 digits, which is what makes two Indian numbers comparable whether
 * or not the submitter typed +91. */
export function normalisePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}
