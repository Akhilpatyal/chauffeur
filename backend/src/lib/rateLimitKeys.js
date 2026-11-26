/*
 * Rate-limit bucket keys.
 *
 * WHY THIS EXISTS
 *
 * Rate limiting runs on `onRequest`, long before any `preHandler` has
 * authenticated anybody. A key generator that reads `request.customer` is
 * therefore always reading `undefined` and silently falling back to the IP —
 * which looks like a per-customer limit in the source and behaves like a
 * per-IP one in production.
 *
 * That difference matters. Several genuine customers share an address behind
 * an office NAT or a mobile carrier's CGNAT, so a per-IP booking limit means
 * one person's activity can lock out strangers. The limit was written
 * per-customer for a reason.
 *
 * WHY READING THE TOKEN UNVERIFIED IS SAFE HERE
 *
 * The subject claim is taken from the token without checking its signature.
 * That is deliberate and it is only ever used to choose a counter.
 *
 * A forged token lets its author pick which bucket to spend — their own,
 * somebody else's, or a made-up one. Picking their own or a made-up one is
 * exactly the per-attacker limiting we want. Picking somebody else's would
 * let them exhaust that person's quota, so the fallback below mixes the
 * address in: an attacker cannot consume a victim's budget without also
 * consuming their own.
 *
 * Nothing here authorises anything. The route still verifies the token
 * properly before doing any work.
 */

/* One base64url segment, decoded without verification. Returns null rather
 * than throwing on anything malformed — a broken token is a request that will
 * be rejected downstream, and it must not be able to crash the limiter. */
function decodeSegment(segment) {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/*
 * The `sub` claim of a bearer token, unverified.
 *
 * Bounded before parsing: a megabyte of base64 in an Authorization header
 * should cost nothing, and JSON.parse on attacker-controlled input of
 * unbounded size is a cheap way to burn CPU on every request.
 */
export function claimedSubject(request) {
  const header = request.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  if (token.length > 4096) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payload = decodeSegment(parts[1]);
  const subject = payload?.sub;
  return typeof subject === 'string' && subject.length <= 64 ? subject : null;
}

/*
 * A per-account bucket that falls back to the address.
 *
 * The address is always part of the key, never replaced by the subject. That
 * is what stops a forged token being used to drain somebody else's quota:
 * spending a victim's bucket also spends the attacker's own.
 */
export function perAccountKey(prefix, request) {
  const address = request.ipHash ?? request.ip ?? 'unknown';
  const subject = claimedSubject(request);
  return subject ? `${prefix}:${subject}:${address}` : `${prefix}:anon:${address}`;
}

/* For public endpoints where there is no account to speak of. */
export function perAddressKey(prefix, request) {
  return `${prefix}:${request.ipHash ?? request.ip ?? 'unknown'}`;
}
