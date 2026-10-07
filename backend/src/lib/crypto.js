import crypto from 'node:crypto';
import { env } from '../config/env.js';

/*
 * AES-256-GCM helpers for fields that must not sit in the clear: ID document
 * numbers, payment references. Ciphertext is stored as a self-describing
 * string, `v1:<iv>:<tag>:<ciphertext>`, so the key can be rotated later by
 * bumping the version prefix rather than guessing at the format.
 */
const VERSION = 'v1';

function key() {
  if (!env.FIELD_ENCRYPTION_KEY) {
    throw new Error('FIELD_ENCRYPTION_KEY is not set — cannot encrypt sensitive fields');
  }
  const decoded = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64');
  if (decoded.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return decoded;
}

export const encryptionAvailable = () => env.FIELD_ENCRYPTION_KEY.length > 0;

export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptField(stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith(`${VERSION}:`)) return stored;
  const [, ivB64, tagB64, dataB64] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/* Refresh tokens are stored as digests so a database dump cannot be replayed. */
export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/* Constant-time compare that tolerates different lengths. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
