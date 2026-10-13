import { attribution } from './api.js';

/*
 * Page-view reporting.
 *
 * The site is a static bundle with client-side routing, so the server sees one
 * request when somebody arrives and nothing at all as they move between pages.
 * Without this, the dashboard would report one page view per visit and miss the
 * entire browse — which is precisely the part that says which destination page
 * is doing the work of turning a visitor into an enquiry.
 *
 * WHAT IT DOES NOT DO
 *
 * No cookie is set. No identifier outlives the browser tab. Nothing is sent to
 * a third party: this posts to our own API and nowhere else, which is why the
 * site needs no cookie banner for it. The id below exists only so that six
 * page views can be recognised as one visit rather than six strangers.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';
/* Also read by lib/api.js when a form is submitted. Changing it here means
 * changing it there; the two are kept apart to avoid an import cycle, not
 * because they are independent. */
const SESSION_KEY = 'taifer_visit';

/*
 * sessionStorage, not localStorage.
 *
 * sessionStorage dies with the tab, which is the correct lifetime for "this
 * visit" and means we are not quietly building a persistent profile of anyone.
 * localStorage would make the same id follow somebody across weeks for no
 * benefit to the only question being asked.
 */
function visitId() {
  if (typeof window === 'undefined') return null;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const fresh =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    /* Private mode, or storage blocked. Returning null disables tracking for
     * this visitor rather than throwing: analytics must never be the reason a
     * page fails to render. The dashboard accounts for this — it shows the
     * enquiries it could not attribute next to the ones it could. */
    return null;
  }
}

/* Exported so a form can attach it to a submission and close the funnel: the
 * enquiry then knows which visit produced it. */
export function currentVisitId() {
  return visitId();
}

let lastPath = null;
let enteredAt = 0;
let inFlight = false;

/*
 * sendBeacon where it exists, fetch as the fallback.
 *
 * sendBeacon is queued by the browser and survives the page being closed,
 * which matters for the last page of a visit — the one where somebody either
 * enquired or gave up. A plain fetch is cancelled mid-navigation, so the exit
 * page would be systematically under-reported, and the exit page is the
 * interesting one.
 */
function send(payload) {
  const body = JSON.stringify(payload);
  const url = `${BASE}/telemetry/page-view`;

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      /* text/plain avoids the CORS preflight that application/json would
       * trigger; the server reads the body, not the declared type. */
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(url, blob)) return;
    }

    /* keepalive lets the request outlive the page, which is the whole reason
     * to prefer it over a bare fetch here. */
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Never surfaced. A visitor must not see an error because a traffic
     * counter failed. */
  }
}

/*
 * Called on every route change.
 *
 * The dwell time reported belongs to the *previous* page, because how long
 * somebody spent reading is only knowable once they leave.
 */
export function trackPageView(path = window.location.pathname) {
  const sessionId = visitId();
  if (!sessionId) return;

  /* React's effects can fire twice for one navigation in development, and a
   * replaced query string is not a new page view. */
  if (path === lastPath) return;

  const dwellMs = lastPath && enteredAt ? Date.now() - enteredAt : undefined;
  const previous = lastPath;

  lastPath = path;
  enteredAt = Date.now();

  const { utm, referrer } = attribution();

  send({
    sessionId,
    path,
    /* Only on the first page of the visit. Sending it on every view would
     * attribute the whole browse to the referrer over and over. */
    referrer: previous ? undefined : referrer || document.referrer || undefined,
    utm: previous ? undefined : utm,
    dwellMs,
  });
}

/*
 * The last page of the visit.
 *
 * `visibilitychange` rather than `beforeunload`: mobile browsers routinely
 * discard a backgrounded tab without ever firing an unload event, so
 * beforeunload loses the exit page for exactly the audience that matters most
 * on a travel site.
 */
export function startVisitTracking() {
  if (typeof window === 'undefined' || inFlight) return;
  inFlight = true;

  const reportDwell = () => {
    const sessionId = visitId();
    if (!sessionId || !lastPath || !enteredAt) return;
    send({ sessionId, path: lastPath, dwellMs: Date.now() - enteredAt });
    /* Cleared so a tab that is backgrounded and foregrounded repeatedly does
     * not report the same stretch of time over and over. */
    enteredAt = Date.now();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') reportDwell();
  });
}
