/*
 * Backend client for the public forms.
 *
 * Everything the forms need to get right lives here rather than in each
 * component, because the three forms previously differed in which of these they
 * remembered to do:
 *
 *  - An idempotency key per submission attempt, so a double-click or a retry
 *    after a flaky connection cannot create two leads.
 *  - UTM parameters captured on first landing, not at submit time. By the time
 *    someone fills the contact form they have usually clicked through three
 *    pages and lost the query string.
 *  - A single error shape the components can render, including the server's
 *    field-level messages and its request id for support.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';
const UTM_KEY = 'taifer_attribution';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

/* sessionStorage can throw in private mode or when storage is blocked, so every
 * access is guarded. Attribution is nice to have; a crashed form is not. */
function readStore() {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeStore(value) {
  try {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* Called once on app start. First touch wins: if someone arrives from an ad and
 * later navigates in from a bookmark, the ad is still what earned the lead. */
export function captureAttribution() {
  if (typeof window === 'undefined') return;
  if (readStore()) return;

  const params = new URLSearchParams(window.location.search);
  const found = {};
  for (const field of UTM_FIELDS) {
    const value = params.get(field);
    if (value) found[field.replace(/^utm_/, '')] = value.slice(0, 200);
  }

  const referrer = document.referrer && !document.referrer.includes(window.location.host)
    ? document.referrer.slice(0, 500)
    : '';

  if (Object.keys(found).length > 0 || referrer) {
    writeStore({ utm: found, referrer });
  }
}

export function attribution() {
  const stored = readStore();
  return {
    utm: stored?.utm ?? undefined,
    referrer: stored?.referrer || undefined,
  };
}

export class SubmitError extends Error {
  constructor(message, { code, fields, requestId, retryable = false } = {}) {
    super(message);
    this.name = 'SubmitError';
    this.code = code;
    /* { fieldName: message } so a form can highlight the offending input. */
    this.fields = fields;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function post(path, payload, key) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify(payload),
    });
  } catch {
    // Network-level failure: the request may not have reached the server, so the
    // caller may retry with the same key safely.
    throw new SubmitError(
      'We could not reach our servers. Check your connection and try again.',
      { code: 'NETWORK', retryable: true },
    );
  }

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (response.ok) return body;

  const error = body?.error ?? {};

  if (response.status === 422 && Array.isArray(error.details)) {
    const fields = {};
    for (const issue of error.details) {
      // The server reports nested paths like "tripPreferences.destination";
      // the forms only know about their own top-level inputs.
      const [field] = String(issue.field ?? '').split('.');
      if (field && !fields[field]) fields[field] = issue.message;
    }
    throw new SubmitError('Some details need a second look.', {
      code: error.code,
      fields,
      requestId: error.requestId,
    });
  }

  // 429 and 503 are both temporary and both have a message worth showing
  // verbatim: one says slow down, the other says the desk is briefly offline.
  throw new SubmitError(
    error.message ?? 'Something went wrong on our side. Please try again in a moment.',
    {
      code: error.code,
      requestId: error.requestId,
      retryable: response.status === 429 || response.status >= 500,
    },
  );
}

/*
 * Submits an enquiry. `source` tells the backend which form it came from, which
 * is what drives the dashboard's per-form reporting.
 *
 * `honeypot` is the value of a hidden input no human fills in. It is passed
 * through rather than checked here, so the decision stays on the server where a
 * bot cannot skip it.
 */
export function submitLead({ source, honeypot, interest, ...fields }, key = idempotencyKey()) {
  const { utm, referrer } = attribution();

  return post(
    '/leads',
    {
      ...fields,
      source,
      interest,
      website: honeypot || undefined,
      context: {
        sourcePage: typeof window === 'undefined' ? undefined : window.location.pathname,
        referrer,
      },
      utm,
    },
    key,
  );
}

export function subscribeNewsletter({ email, name, honeypot }, key = idempotencyKey()) {
  const { utm } = attribution();

  return post(
    '/newsletter',
    {
      email,
      name: name || undefined,
      website: honeypot || undefined,
      sourcePage: typeof window === 'undefined' ? undefined : window.location.pathname,
      utm,
    },
    key,
  );
}

export { idempotencyKey };
