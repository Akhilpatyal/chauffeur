import { SecurityEvent } from '../models/SecurityEvent.js';

/*
 * The security timeline's write side.
 *
 * Two rules govern everything in this file.
 *
 * ONE: never throw. A failure to record that a sign-in happened must not
 * prevent the sign-in. Every call is fire-and-forget with a swallowed error,
 * because the alternative is an observability outage becoming a login outage.
 *
 * TWO: never store a secret. The `detail` field is free-form, which makes it
 * exactly where a password or a token would end up by accident the first time
 * somebody passes the whole request body through. So the keys are filtered on
 * the way in, against a deny list, and anything matching is dropped rather
 * than redacted — a redacted field still tells an attacker reading the
 * collection that the value existed and how long it was.
 */
const FORBIDDEN_DETAIL_KEYS = [
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'otp',
  'code',
  'apikey',
  'credential',
  'privatekey',
];

const SEVERITY_BY_TYPE = {
  'login.success': 'info',
  'login.failed': 'warn',
  'login.locked': 'critical',
  'password.changed': 'info',
  'token.refreshed': 'info',
  'token.reuse_detected': 'critical',
  'session.revoked': 'info',
  'permission.denied': 'warn',
  'rate_limit.exceeded': 'warn',
  'csrf.failed': 'warn',
  'upload.rejected': 'warn',
  'recaptcha.failed': 'warn',
  'spam.blocked': 'info',
};

/* Recursive, because a nested object is how a secret gets past a shallow
 * filter. Depth-bounded so a cyclic or pathological payload cannot hang the
 * request that is only trying to log something. */
function scrub(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => scrub(item, depth + 1));
  if (typeof value !== 'object') {
    return typeof value === 'string' ? value.slice(0, 500) : value;
  }

  const safe = {};
  for (const [key, nested] of Object.entries(value)) {
    const lowered = key.toLowerCase();
    if (FORBIDDEN_DETAIL_KEYS.some((banned) => lowered.includes(banned))) continue;
    safe[key] = scrub(nested, depth + 1);
  }
  return safe;
}

export async function recordSecurityEvent({
  type,
  severity,
  /* A Fastify request where there is one. The auth service is handed a small
   * meta object instead, so it can be unit-tested without faking a request —
   * hence the explicit overrides below rather than requiring one shape. */
  request,
  ipHash,
  userAgent,
  correlationId,
  actor = null,
  actorEmail = null,
  actorRole = null,
  detail,
}) {
  try {
    await SecurityEvent.create({
      type,
      severity: severity ?? SEVERITY_BY_TYPE[type] ?? 'info',
      actor,
      /* Lowercased so a timeline for one address is not split in three by how
       * the attempt happened to be typed. */
      actorEmail: actorEmail ? String(actorEmail).toLowerCase().slice(0, 254) : null,
      actorRole,
      ipHash: ipHash ?? request?.ipHash ?? null,
      userAgent: String(userAgent ?? request?.headers?.['user-agent'] ?? '').slice(0, 300),
      route: request?.routeOptions?.url ?? null,
      method: request?.method ?? null,
      correlationId: correlationId ?? request?.correlationId ?? null,
      detail: detail === undefined ? undefined : scrub(detail),
    });
  } catch {
    /* Deliberately silent. See rule one above: this must never be the reason
     * a request fails. The request log still carries the event. */
  }
}

/*
 * How many times this address has failed to sign in recently.
 *
 * Used by the login route to decide when to start slowing an attempt down.
 * Counting from the event collection rather than keeping a separate counter
 * means the number the dashboard shows and the number the lockout uses are
 * the same number, so the two can never disagree about what happened.
 */
export async function recentFailureCount(ipHash, windowMs = 15 * 60 * 1000) {
  if (!ipHash) return 0;
  try {
    return await SecurityEvent.countDocuments({
      type: 'login.failed',
      ipHash,
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    });
  } catch {
    /* Fail open on the count, not on the request: a database hiccup should not
     * lock out every user, and the rate limiter is still in front of this. */
    return 0;
  }
}
