import crypto from 'node:crypto';
import { VisitorSession } from '../models/VisitorSession.js';
import { env } from '../config/env.js';

/*
 * Visit tracking, built to answer one question: of the people who looked at a
 * page, how many enquired?
 *
 * The session id arrives from the browser, so it is untrusted: it is hashed
 * before storage, which means a guessed or replayed id cannot be used to read
 * somebody else's session back out, and the raw value never lands in the
 * database at all.
 */
const MAX_PAGE_VIEWS = 60;

/* A visit that goes quiet for half an hour and comes back is a new visit.
 * Thirty minutes is the long-standing convention and makes our numbers
 * comparable with anything else anyone looks at. */
const SESSION_IDLE_MS = 30 * 60 * 1000;

export function hashSessionId(sessionId) {
  return crypto
    .createHmac('sha256', env.COOKIE_SECRET)
    .update(String(sessionId))
    .digest('hex')
    .slice(0, 40);
}

/*
 * Referrers are reduced to a hostname.
 *
 * The full referring URL can carry the search terms someone typed to find us,
 * or the contents of a private page that linked here. "google.com" is all the
 * attribution anybody needs, and is not somebody's search history.
 */
function referrerHostOf(referrer) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').slice(0, 120);
  } catch {
    return null;
  }
}

/*
 * Coarse device classification from the user agent.
 *
 * Deliberately crude. The question worth answering is "is the booking form
 * broken on phones", which needs three buckets; anything finer edges towards
 * a device fingerprint, which is both more than we need and more than a
 * visitor would expect.
 */
export function classifyUserAgent(userAgent = '') {
  const ua = String(userAgent);
  const lowered = ua.toLowerCase();

  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|headless|lighthouse/.test(
    lowered,
  );

  let device = 'desktop';
  if (/ipad|tablet|playbook|silk/.test(lowered)) device = 'tablet';
  else if (/mobi|iphone|android.*mobile|phone/.test(lowered)) device = 'mobile';

  let browser = 'other';
  /* Order matters: every one of these claims to be Safari, and most claim to
   * be Chrome too, so the most specific check has to come first. */
  if (/edg\//.test(lowered)) browser = 'edge';
  else if (/opr\/|opera/.test(lowered)) browser = 'opera';
  else if (/chrome\/|crios/.test(lowered)) browser = 'chrome';
  else if (/firefox|fxios/.test(lowered)) browser = 'firefox';
  else if (/safari/.test(lowered)) browser = 'safari';

  return { device, browser, isBot };
}

/*
 * One upsert per page view.
 *
 * Unlike the request metrics this is not batched, because each page view
 * mutates a specific session document rather than incrementing a shared
 * counter — batching would mean holding per-session state in memory and
 * reconciling it, for a write volume that is a fraction of the request rate
 * (one per page, not one per asset or API call).
 */
export async function recordPageView({
  sessionId,
  path,
  referrer,
  utm = {},
  userAgent,
  ipHash,
  country,
  dwellMs,
  at = new Date(),
}) {
  const hashed = hashSessionId(sessionId);
  const { device, browser, isBot } = classifyUserAgent(userAgent);

  const existing = await VisitorSession.findOne({ sessionId: hashed })
    .select('_id lastSeenAt pageViewCount')
    .lean();

  /* An id that comes back after the idle window is treated as a fresh visit,
   * which is also what stops a long-lived tab accumulating a thousand page
   * views into one unbounded document. */
  const stale = existing && at.getTime() - new Date(existing.lastSeenAt).getTime() > SESSION_IDLE_MS;
  const sessionKey = stale ? `${hashed}:${at.getTime().toString(36)}` : hashed;

  const view = { path: String(path).slice(0, 300), at, dwellMs: dwellMs ?? null };

  await VisitorSession.updateOne(
    { sessionId: sessionKey },
    {
      $setOnInsert: {
        sessionId: sessionKey,
        startedAt: at,
        landingPath: view.path,
        referrerHost: referrerHostOf(referrer),
        utm: {
          source: utm.source ? String(utm.source).slice(0, 80) : null,
          medium: utm.medium ? String(utm.medium).slice(0, 80) : null,
          campaign: utm.campaign ? String(utm.campaign).slice(0, 120) : null,
        },
        device,
        browser,
        country: country ? String(country).slice(0, 2).toUpperCase() : null,
        ipHash: ipHash ?? null,
        isBot,
      },
      $set: {
        lastSeenAt: at,
        /* The last page seen is the exit page until a later one replaces it,
         * which means it is correct the moment the visit ends without needing
         * anything to fire on the way out. */
        exitPath: view.path,
      },
      $inc: { pageViewCount: 1 },
      $push: { pageViews: { $each: [view], $slice: -MAX_PAGE_VIEWS } },
    },
    { upsert: true },
  );

  return sessionKey;
}

/*
 * Called by the lead intake. This is the join that makes the funnel real: the
 * enquiry knows which visit produced it, so a page's traffic and its enquiries
 * are finally the same denominator and numerator.
 */
export async function attributeConversion(sessionId, leadId) {
  if (!sessionId || !leadId) return false;
  const hashed = hashSessionId(sessionId);

  /* Matches the plain hash or an idle-window suffix, newest first, so a
   * returning visitor's conversion attaches to the visit they were in rather
   * than to their first ever one. */
  const session = await VisitorSession.findOne({
    sessionId: { $in: [hashed, new RegExp(`^${hashed}:`)] },
  })
    .sort({ lastSeenAt: -1 })
    .select('_id converted');

  if (!session || session.converted) return false;

  await VisitorSession.updateOne(
    { _id: session._id, converted: false },
    { $set: { converted: true, convertedLead: leadId, convertedAt: new Date() } },
  );
  return true;
}
