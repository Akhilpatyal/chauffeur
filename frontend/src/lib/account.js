/*
 * The signed-in customer's API client.
 *
 * Mirrors the admin dashboard's client (backend/admin/src/api.js) and for the
 * same reasons:
 *
 *   - The access token lives in a module variable, never localStorage. A
 *     token in localStorage is readable by any script that gets injected into
 *     the page; a refresh costs one silent call instead of a stolen session.
 *   - A 401 triggers exactly one refresh, and concurrent calls share it.
 *     Without the sharing, a dashboard loading four panels at once would fire
 *     four refreshes, and three would be rejected as token reuse — which
 *     revokes the whole session.
 *
 * Everything here talks to /account/*, which is signed with the customer
 * audience and key. An admin token cannot reach these and these cannot reach
 * an admin route.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken = null;
let refreshPromise = null;
let currentCustomer = null;

/* Components subscribe so a sign-in or sign-out updates every one of them
 * without threading a prop through the tree. */
const listeners = new Set();

export function onSessionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(customer) {
  currentCustomer = customer;
  for (const listener of listeners) listener(customer);
}

export const getCustomer = () => currentCustomer;
export const isSignedIn = () => Boolean(accessToken);

/* The CSRF cookie is deliberately readable so it can be echoed as a header —
 * which is precisely what a cross-site page cannot do. */
function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)taifer_ccsrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export class AccountError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `Request failed (${status})`);
    this.name = 'AccountError';
    this.status = status;
    this.code = body?.error?.code;
    /* { field: message } so a form can mark the offending input rather than
     * showing one generic banner. */
    this.fields = Object.fromEntries(
      (body?.error?.details ?? [])
        .filter((d) => d?.field)
        .map((d) => [String(d.field).split('.').pop(), d.message]),
    );
    this.requestId = body?.error?.requestId;
  }
}

async function parse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${BASE}/account/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!response.ok) {
        accessToken = null;
        publish(null);
        settleSession(false);
        throw new AccountError(response.status, await parse(response));
      }
      const body = await parse(response);
      accessToken = body.data.accessToken;
      publish(body.data.customer);
      return body.data;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/*
 * Has this visitor already got a session?
 *
 * Asked once per page load and remembered. `restore()` starts a fresh
 * refresh every time it is called and every refresh rotates the token, so
 * several components each asking the question independently is both wasteful
 * and a reuse hazard. Here the first caller pays for the answer and everyone
 * else awaits the same promise.
 *
 * It resolves to a boolean rather than rejecting, because "no session" is an
 * ordinary answer to this question, not a failure.
 */
let sessionReady = null;

export function ensureSession() {
  if (!sessionReady) {
    /*
     * The refresh cookie is httpOnly and cannot be read here, but the CSRF
     * cookie is set beside it and cleared with it — so its absence is a
     * reliable "nobody is signed in on this browser".
     *
     * Checking it first means an anonymous visitor, which is most of them,
     * costs no request at all. Without this the site would fire a refresh
     * POST on every first page view by everyone who has never signed in.
     */
    sessionReady = csrfToken()
      ? refreshSession().then(
          () => true,
          () => false,
        )
      : Promise.resolve(false);
  }
  return sessionReady;
}

/* Signing in or out answers the question definitively, so it is recorded
 * rather than re-asked over the network. */
function settleSession(value) {
  sessionReady = Promise.resolve(value);
}

async function call(path, { method = 'GET', body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry) {
    try {
      await refreshSession();
      return call(path, { method, body, retry: false });
    } catch {
      accessToken = null;
      publish(null);
      settleSession(false);
      throw new AccountError(401, {
        error: { message: 'Please sign in to continue.' },
      });
    }
  }

  if (!response.ok) throw new AccountError(response.status, await parse(response));
  if (response.status === 204) return null;
  return parse(response);
}

/*
 * A key that makes a retried submission return the booking already created
 * rather than making a second one.
 *
 * Generated once per attempt and held by the caller, so a failed network
 * request retried by the user reuses it — which is the case that actually
 * double-books, more than a double-click.
 */
export function idempotencyKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const account = {
  async register(payload) {
    const response = await fetch(`${BASE}/account/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await parse(response);
    if (!response.ok) throw new AccountError(response.status, body);

    /*
     * The server answers identically whether or not the address was already
     * registered — otherwise this endpoint becomes a way to test who has an
     * account here. `signedIn` is how the client tells the two apart without
     * the response revealing it to anyone watching.
     */
    if (body.data.signedIn) {
      accessToken = body.data.accessToken;
      publish(body.data.customer);
      settleSession(true);
      return { signedIn: true, customer: body.data.customer };
    }
    return { signedIn: false, customer: null };
  },

  async signIn(email, password) {
    const response = await fetch(`${BASE}/account/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await parse(response);
    if (!response.ok) throw new AccountError(response.status, body);

    accessToken = body.data.accessToken;
    publish(body.data.customer);
    settleSession(true);
    return body.data.customer;
  },

  async signOut() {
    await fetch(`${BASE}/account/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken() },
    }).catch(() => {});
    accessToken = null;
    publish(null);
    settleSession(false);
  },

  signOutEverywhere: () => call('/account/auth/logout-all', { method: 'POST' }),

  me: () => call('/account/me'),
  updateProfile: (payload) => call('/account/me', { method: 'PATCH', body: payload }),
  changePassword: (payload) =>
    call('/account/auth/change-password', { method: 'POST', body: payload }),

  bookings: {
    list: (scope = 'all') => call(`/account/bookings?scope=${encodeURIComponent(scope)}`),
    get: (id) => call(`/account/bookings/${encodeURIComponent(id)}`),
    create: (payload) => call('/account/bookings', { method: 'POST', body: payload }),
    /*
     * Quotations. Drafts are never returned by the server, so whatever
     * arrives here is something the desk chose to show.
     */
    quotations: (id) => call(`/account/bookings/${encodeURIComponent(id)}/quotations`),
    acceptQuotation: (id, quotationId) =>
      call(
        `/account/bookings/${encodeURIComponent(id)}/quotations/${encodeURIComponent(quotationId)}/accept`,
        { method: 'POST' },
      ),
    respondToQuotation: (id, quotationId, body) =>
      call(
        `/account/bookings/${encodeURIComponent(id)}/quotations/${encodeURIComponent(quotationId)}/respond`,
        { method: 'POST', body },
      ),

    requestCancellation: (id, reason) =>
      call(`/account/bookings/${encodeURIComponent(id)}/cancellation`, {
        method: 'POST',
        body: { reason },
      }),
  },
};

/*
 * Published departures for a trip. Public, so it does not go through the
 * authenticated `call` helper — the booking panel needs it before anybody has
 * signed in.
 */
export async function listDepartures(tripSlug) {
  const response = await fetch(
    `${BASE}/departures?trip=${encodeURIComponent(tripSlug)}`,
    { headers: { accept: 'application/json' } },
  );
  if (!response.ok) return [];
  const body = await parse(response);
  return Array.isArray(body?.data) ? body.data : [];
}

export default account;
