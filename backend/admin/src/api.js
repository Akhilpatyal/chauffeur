/*
 * API client.
 *
 * Two things it handles so no component has to:
 *
 *  1. The access token lives in memory only, never in localStorage. A token in
 *     localStorage is readable by any script that gets injected into the page;
 *     keeping it in a module variable means a refresh costs one silent call to
 *     /auth/refresh instead of a stolen session.
 *  2. A 401 triggers exactly one refresh attempt, and concurrent calls share it.
 *     Without the sharing, a dashboard that loads six panels at once would fire
 *     six refreshes, and five of them would be rejected as token reuse — which
 *     revokes the session.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken = null;
let refreshPromise = null;
const listeners = new Set();

export const onAuthChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function setToken(token) {
  accessToken = token;
  for (const listener of listeners) listener(token);
}

export const getToken = () => accessToken;

/* The CSRF cookie is deliberately readable so it can be echoed as a header. */
function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)taifer_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/*
 * URLSearchParams stringifies everything, so an absent filter arrives at the
 * server as the literal text "undefined" and is then matched against. Dropping
 * empty values here means a component can pass its whole filter state without
 * first pruning it.
 */
function clean(query) {
  return Object.fromEntries(
    Object.entries(query ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
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
  // One shared in-flight refresh, for the reason in the header comment.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!response.ok) {
        setToken(null);
        throw new ApiError(response.status, await parse(response));
      }
      const body = await parse(response);
      setToken(body.data.accessToken);
      return body.data;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function call(path, { method = 'GET', body, raw = false, retry = true } = {}) {
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
      return call(path, { method, body, raw, retry: false });
    } catch {
      setToken(null);
      throw new ApiError(401, { error: { message: 'Your session has ended. Please sign in again.' } });
    }
  }

  if (!response.ok) throw new ApiError(response.status, await parse(response));
  if (raw) return response;
  if (response.status === 204) return null;
  return parse(response);
}

export const api = {
  async login(email, password) {
    const response = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await parse(response);
    if (!response.ok) throw new ApiError(response.status, body);
    setToken(body.data.accessToken);
    return body.data.user;
  },

  async logout() {
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken() },
    }).catch(() => {});
    setToken(null);
  },

  /* Called once on load: if the refresh cookie is still valid the user is
   * already signed in and never sees the login form. */
  restoreSession: () => refreshSession(),

  me: () => call('/auth/me'),
  changePassword: (payload) => call('/auth/change-password', { method: 'POST', body: payload }),

  leads: {
    list: (query) => call(`/admin/leads?${new URLSearchParams(query)}`),
    get: (id) => call(`/admin/leads/${id}`),
    setStatus: (id, payload) => call(`/admin/leads/${id}/status`, { method: 'PATCH', body: payload }),
    assign: (id, assignedTo) => call(`/admin/leads/${id}/assign`, { method: 'PATCH', body: { assignedTo } }),
    addNote: (id, body) => call(`/admin/leads/${id}/notes`, { method: 'POST', body: { body } }),
    resend: (id) => call(`/admin/leads/${id}/resend-notifications`, { method: 'POST' }),
    exportUrl: (query) => `${BASE}/admin/leads/export.csv?${new URLSearchParams(query)}`,
    exportCsv: (query) => call(`/admin/leads/export.csv?${new URLSearchParams(query)}`, { raw: true }),
  },

  content: {
    list: (type, query) => call(`/admin/content/${type}?${new URLSearchParams(query)}`),
    get: (type, id) => call(`/admin/content/${type}/${id}`),
    create: (type, body) => call(`/admin/content/${type}`, { method: 'POST', body }),
    update: (type, id, body) => call(`/admin/content/${type}/${id}`, { method: 'PUT', body }),
    remove: (type, id) => call(`/admin/content/${type}/${id}`, { method: 'DELETE' }),
  },

  analytics: (query) => call(`/admin/analytics/leads?${new URLSearchParams(query)}`),
  team: () => call('/admin/team'),

  users: {
    list: (query = {}) => call(`/admin/users?${new URLSearchParams(clean(query))}`),
    get: (id) => call(`/admin/users/${id}`),
    /* The permission catalogue and the roles this user may actually assign.
     * Fetched rather than hard-coded, so the editor cannot drift from the
     * server's own list and offer a role the server will refuse. */
    meta: () => call('/admin/users/meta'),
    create: (body) => call('/admin/users', { method: 'POST', body }),
    update: (id, body) => call(`/admin/users/${id}`, { method: 'PATCH', body }),
    setPermissions: (id, body) => call(`/admin/users/${id}/permissions`, { method: 'PUT', body }),
    revokeSessions: (id) => call(`/admin/users/${id}/revoke-sessions`, { method: 'POST' }),
    deactivate: (id) => call(`/admin/users/${id}`, { method: 'DELETE' }),
  },

  teams: {
    list: (query = {}) => call(`/admin/teams?${new URLSearchParams(clean(query))}`),
    get: (id) => call(`/admin/teams/${id}`),
    create: (body) => call('/admin/teams', { method: 'POST', body }),
    update: (id, body) => call(`/admin/teams/${id}`, { method: 'PATCH', body }),
    /* A delta, never a replacement roster: two managers editing the same team
     * at once would otherwise silently undo each other's change. */
    setMembers: (id, body) => call(`/admin/teams/${id}/members`, { method: 'POST', body }),
    deactivate: (id) => call(`/admin/teams/${id}`, { method: 'DELETE' }),
  },

  /*
   * The reservation pipeline.
   *
   * `list` returns the page plus the per-status counts for the caller's own
   * scope, so the board's tab figures match the rows that caller can open
   * rather than the whole company's.
   */
  reservations: {
    list: (query) => call(`/admin/reservations?${new URLSearchParams(clean(query))}`),
    get: (id) => call(`/admin/reservations/${id}`),
    transition: (id, body) => call(`/admin/reservations/${id}/status`, { method: 'PATCH', body }),
    assign: (id, assignedTo) =>
      call(`/admin/reservations/${id}/assign`, { method: 'PATCH', body: { assignedTo } }),
    addNote: (id, body) => call(`/admin/reservations/${id}/notes`, { method: 'POST', body }),

    /*
     * Quotations. A draft is editable; a sent one never is — a change means
     * a new version, which is what `create` always produces.
     */
    quotations: (id) => call(`/admin/reservations/${id}/quotations`),
    createQuotation: (id, body) =>
      call(`/admin/reservations/${id}/quotations`, { method: 'POST', body }),
    updateQuotation: (quotationId, body) =>
      call(`/admin/quotations/${quotationId}`, { method: 'PATCH', body }),
    sendQuotation: (quotationId) =>
      call(`/admin/quotations/${quotationId}/send`, { method: 'POST' }),
  },

  observability: {
    summary: (range) => call(`/admin/observability/summary?range=${range}`),
    series: (range) => call(`/admin/observability/series?range=${range}`),
    routes: (query) => call(`/admin/observability/routes?${new URLSearchParams(clean(query))}`),
    errors: (query) => call(`/admin/observability/errors?${new URLSearchParams(clean(query))}`),
    error: (id) => call(`/admin/observability/errors/${id}`),
    setErrorStatus: (id, body) =>
      call(`/admin/observability/errors/${id}`, { method: 'PATCH', body }),
    security: (query) => call(`/admin/observability/security?${new URLSearchParams(clean(query))}`),
    visitors: (query) => call(`/admin/observability/visitors?${new URLSearchParams(clean(query))}`),
    exportCsv: (dataset, range) =>
      call(`/admin/observability/export.csv?dataset=${dataset}&range=${range}`, { raw: true }),
  },
  audit: (query) => call(`/admin/audit?${new URLSearchParams(query)}`),
  flags: {
    list: () => call('/admin/flags'),
    set: (key, payload) => call(`/admin/flags/${key}`, { method: 'PUT', body: payload }),
  },
  queues: () => call('/admin/queues'),

  async upload(file, folder = 'misc') {
    const form = new FormData();
    form.append('folder', folder);
    form.append('file', file);

    const response = await fetch(`${BASE}/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
      body: form,
    });
    const body = await parse(response);
    if (!response.ok) throw new ApiError(response.status, body);
    return body.data;
  },
};

export default api;
