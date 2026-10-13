import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { RequestMetric } from '../src/models/RequestMetric.js';
import { ErrorEvent } from '../src/models/ErrorEvent.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';
import { VisitorSession } from '../src/models/VisitorSession.js';
import { Lead } from '../src/models/Lead.js';
import {
  recordRequest,
  flushMetrics,
  resetMetrics,
  percentileFromBuckets,
  metricsState,
} from '../src/services/metrics.js';
import { fingerprintOf } from '../src/services/errorTracking.js';
import { recordSecurityEvent } from '../src/services/securityEvents.js';
import { hashSessionId, classifyUserAgent } from '../src/services/visitors.js';

/*
 * Observability, end to end.
 *
 * The parts worth testing are the ones where being wrong is invisible: an
 * aggregator that loses counts, a fingerprint that splits one fault into
 * thousands, a percentile computed in a way that cannot be right, and a
 * recorder that writes a password into a log nobody reads until it leaks.
 */
let app;
let session;

/*
 * The write behind a fire-and-forget call. Several things here deliberately do
 * not await their own persistence — the page-view beacon, the error recorder —
 * because the caller is a visitor mid-navigation or a client already receiving
 * a 500. A test asserting on the row has to let the microtask queue drain,
 * which is the honest shape of the code rather than a flaw in it.
 */
const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  app = await startTestApp({
    /* A route that fails on purpose, so the error handler's grouping is
     * exercised through the real pipeline rather than by calling the service
     * directly. Fastify will not accept a route after ready(), hence here. */
    extraRoutes: async (instance) => {
      instance.get('/__boom', async () => {
        throw new Error('deliberate test failure');
      });
    },
  });
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
  await createAdmin();
  session = await signIn(app);
  /*
   * After the sign-in, not before: the fixture's own login request goes
   * through the instrumented pipeline like any other, and counting it would
   * make every assertion about request totals off by one.
   */
  resetMetrics();
});

describe('the metrics aggregator', () => {
  it('collapses many requests into one document per route-minute', async () => {
    for (let index = 0; index < 500; index += 1) {
      recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 201, durationMs: 40 });
    }

    expect(metricsState().pendingKeys).toBe(1);
    await flushMetrics();

    const rows = await RequestMetric.find({}).lean();
    /* The entire point: five hundred requests cost one write, not five
     * hundred. If this ever becomes 500 the observability is the load. */
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(500);
    expect(rows[0].buckets.le50).toBe(500);
  });

  it('adds to an existing minute instead of replacing it', async () => {
    const at = new Date('2026-01-01T10:00:30Z');
    recordRequest({ route: '/api/v1/leads', method: 'GET', statusCode: 200, durationMs: 10, at });
    await flushMetrics();

    recordRequest({ route: '/api/v1/leads', method: 'GET', statusCode: 200, durationMs: 10, at });
    await flushMetrics();

    const rows = await RequestMetric.find({}).lean();
    expect(rows).toHaveLength(1);
    /* `$inc`, not `$set`. This is what makes the flush safe when four cluster
     * workers all write the same minute. */
    expect(rows[0].count).toBe(2);
  });

  it('separates status classes so a bad minute is visible', async () => {
    recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 201, durationMs: 20 });
    recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 500, durationMs: 20 });
    recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 422, durationMs: 20 });
    await flushMetrics();

    const byClass = Object.fromEntries(
      (await RequestMetric.find({}).lean()).map((row) => [row.statusClass, row.count]),
    );
    expect(byClass).toEqual({ '2xx': 1, '5xx': 1, '4xx': 1 });
  });

  it('empties the pending map on flush so nothing is counted twice', async () => {
    recordRequest({ route: '/x', method: 'GET', statusCode: 200, durationMs: 5 });
    await flushMetrics();
    await flushMetrics();

    expect((await RequestMetric.findOne({}).lean()).count).toBe(1);
    expect(metricsState().pendingKeys).toBe(0);
  });

  it('reads percentiles off the histogram rather than averaging them', () => {
    /* Ninety fast requests and ten slow ones. The mean sits in the fast
     * bucket; the p99 must not. */
    const buckets = { le50: 90, le100: 0, le250: 0, le500: 0, le1000: 0, le2500: 10, inf: 0 };

    expect(percentileFromBuckets(buckets, 0.5)).toBeLessThanOrEqual(50);
    expect(percentileFromBuckets(buckets, 0.99)).toBeGreaterThan(1000);
    expect(percentileFromBuckets({}, 0.95)).toBe(0);
  });

  it('never reports a percentile above the slowest request it has seen', () => {
    /* One request of 681ms lands in the 500–1000 bucket, so interpolation puts
     * the p99 at ~995ms — above the slowest request that ever happened. The
     * dashboard printed that directly above "slowest seen 681ms", which is
     * impossible on its face and makes every other figure on the page suspect. */
    const buckets = { le50: 0, le100: 0, le250: 0, le500: 0, le1000: 1, le2500: 0, inf: 0 };

    expect(percentileFromBuckets(buckets, 0.99)).toBeGreaterThan(681);
    expect(percentileFromBuckets(buckets, 0.99, 681)).toBe(681);
    expect(percentileFromBuckets(buckets, 0.5, 681)).toBeLessThanOrEqual(681);
  });

  it('keeps the summary’s percentiles at or below its own reported maximum', async () => {
    recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 201, durationMs: 681 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/summary?range=1h',
      headers: session.authHeader,
    });

    const { latencyMs, maxDurationMs } = response.json().data;
    /* The two figures sit next to each other on screen, so they have to agree. */
    expect(latencyMs.p99).toBeLessThanOrEqual(maxDurationMs);
    expect(latencyMs.p95).toBeLessThanOrEqual(maxDurationMs);
    expect(latencyMs.p50).toBeLessThanOrEqual(latencyMs.p95);
  });

  it('states the request rate in a unit that is readable at low traffic', async () => {
    recordRequest({ route: '/api/v1/leads', method: 'GET', statusCode: 200, durationMs: 20 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/summary?range=24h',
      headers: session.authHeader,
    });

    /* A handful of requests over a day is 0.0/min, and "57 requests, 0/min"
     * printed side by side reads as a broken counter rather than a quiet day. */
    expect(response.json().data.rateLabel).not.toMatch(/^0\/min/);
    expect(response.json().data.rateLabel).toMatch(/\/(min|hour|day) average$/);
  });
});

describe('request instrumentation through the app', () => {
  it('records the route pattern, not the URL it was called with', async () => {
    const lead = await Lead.create({
      name: 'Pattern Probe',
      email: 'pattern@example.com',
      contactKey: 'pattern@example.com',
      phone: '+919876500000',
      message: 'Spiti.',
      source: 'contact_form',
    });

    await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${lead._id}`,
      headers: session.authHeader,
    });
    await flushMetrics();

    const routes = (await RequestMetric.find({}).lean()).map((row) => row.route);
    /* Grouping by raw URL would mean one row per lead ever viewed — unbounded
     * cardinality, and "how slow is the lead page" unanswerable. */
    expect(routes).toContain('/api/v1/admin/leads/:id');
    expect(routes.some((route) => route.includes(String(lead._id)))).toBe(false);
  });

  it('files every unmatched path under one key rather than one each', async () => {
    await app.inject({ method: 'GET', url: '/api/v1/not-a-real-route' });
    await app.inject({ method: 'GET', url: '/api/v1/also-not-real' });
    await flushMetrics();

    const unmatched = await RequestMetric.find({ route: '(unmatched)' }).lean();
    /* Otherwise anyone could inflate the collection by requesting random
     * paths, which is a memory leak with a public trigger. */
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].count).toBe(2);
  });

  it('leaves health probes out of the traffic figures', async () => {
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/ready' });
    await flushMetrics();

    /* Both paths, because the exclusion list is written by hand and the first
     * version of it guessed `/health/ready` for a route that is `/ready` — so
     * the readiness probe was the second busiest endpoint on an idle site. */
    expect(await RequestMetric.countDocuments({ route: '/health' })).toBe(0);
    expect(await RequestMetric.countDocuments({ route: '/ready' })).toBe(0);
  });

  it('serves a summary whose numbers match what was recorded', async () => {
    for (let index = 0; index < 20; index += 1) {
      recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 201, durationMs: 30 });
    }
    recordRequest({ route: '/api/v1/leads', method: 'POST', statusCode: 500, durationMs: 900 });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/summary?range=1h',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    const summary = response.json().data;
    /* The endpoint flushes before reading: a dashboard opened right after
     * doing something must not show zero. */
    expect(summary.requests).toBeGreaterThanOrEqual(21);
    expect(summary.serverErrors).toBe(1);
    expect(summary.latencyMs.p99).toBeGreaterThan(summary.latencyMs.p50);
  });

  it('ranks routes by the time they actually consume', async () => {
    /* One slow call and a hundred quick ones. Sorting by average would put the
     * slow one first; sorting by total time is the honest answer to "where
     * would optimising help". */
    recordRequest({ route: '/slow-and-rare', method: 'GET', statusCode: 200, durationMs: 2000 });
    for (let index = 0; index < 100; index += 1) {
      recordRequest({ route: '/quick-and-constant', method: 'GET', statusCode: 200, durationMs: 80 });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/routes?range=1h&sort=time',
      headers: session.authHeader,
    });

    expect(response.json().data[0].route).toBe('/quick-and-constant');
    expect(response.json().data[0].totalTimeMs).toBe(8000);
  });
});

describe('error grouping', () => {
  it('fingerprints the same fault identically however the message varies', () => {
    const stack = 'Error: x\n    at handler (C:\\app\\src\\modules\\leads\\service.js:10:5)';
    const first = fingerprintOf({
      name: 'CastError',
      route: '/api/v1/admin/leads/:id',
      method: 'GET',
      stack,
      code: undefined,
    });
    const second = fingerprintOf({
      name: 'CastError',
      route: '/api/v1/admin/leads/:id',
      method: 'GET',
      stack,
      code: undefined,
    });

    expect(first).toBe(second);
  });

  it('fingerprints the same code on a different route apart', () => {
    const stack = 'Error: x\n    at handler (/srv/app/src/modules/leads/service.js:10:5)';
    const onLeads = fingerprintOf({ name: 'Error', route: '/a', method: 'GET', stack });
    const onContent = fingerprintOf({ name: 'Error', route: '/b', method: 'GET', stack });

    expect(onLeads).not.toBe(onContent);
  });

  it('fingerprints identically from different absolute paths', () => {
    /* The same fault on a laptop and in the container must be one group, or
     * every deploy looks like a brand new set of errors. */
    const onWindows = fingerprintOf({
      name: 'Error',
      route: '/a',
      method: 'GET',
      stack: 'Error: x\n    at run (C:\\Users\\dev\\project\\src\\lib\\thing.js:4:1)',
    });
    const inContainer = fingerprintOf({
      name: 'Error',
      route: '/a',
      method: 'GET',
      stack: 'Error: x\n    at run (/srv/app/src/lib/thing.js:4:1)',
    });

    expect(onWindows).toBe(inContainer);
  });

  it('counts repeat occurrences into one group and caps the samples', async () => {
    const { recordError } = await import('../src/services/errorTracking.js');
    const fakeRequest = {
      method: 'GET',
      routeOptions: { url: '/api/v1/admin/leads' },
      correlationId: 'req-1',
      ipHash: 'hash',
      headers: { 'user-agent': 'jest' },
    };

    for (let index = 0; index < 25; index += 1) {
      const error = new Error(`failed for id ${index}`);
      error.stack = 'Error: boom\n    at handler (/srv/app/src/modules/leads/service.js:10:5)';
      await recordError({ error, request: fakeRequest, statusCode: 500 });
    }

    const groups = await ErrorEvent.find({}).lean();
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(25);
    /* Bounded, or the document eventually cannot be saved. */
    expect(groups[0].samples.length).toBeLessThanOrEqual(10);
    /* The newest message, not the first: that is the one worth reading. */
    expect(groups[0].message).toBe('failed for id 24');
  });

  it('reopens a resolved group when the fault happens again', async () => {
    const { recordError } = await import('../src/services/errorTracking.js');
    const error = new Error('still broken');
    error.stack = 'Error: boom\n    at handler (/srv/app/src/services/thing.js:3:1)';
    const request = { method: 'GET', routeOptions: { url: '/x' }, headers: {} };

    const group = await recordError({ error, request, statusCode: 500 });

    const resolved = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/observability/errors/${group._id}`,
      headers: session.authHeader,
      payload: { status: 'resolved', note: 'fixed in 1.2.3' },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().data.status).toBe('resolved');

    await recordError({ error, request, statusCode: 500 });

    const reopened = await ErrorEvent.findById(group._id).lean();
    /* A dashboard full of "resolved" has to mean something. An error seen
     * after being marked fixed is not fixed. */
    expect(reopened.status).toBe('open');
    expect(reopened.regressionCount).toBe(1);
  });

  it('groups a real 500 raised through the app', async () => {
    const response = await app.inject({ method: 'GET', url: '/__boom' });
    expect(response.statusCode).toBe(500);
    /* The internal message must not reach the client, only the group. */
    expect(response.json().error.message).not.toMatch(/deliberate/);

    await settle();

    const group = await ErrorEvent.findOne({ message: 'deliberate test failure' }).lean();
    expect(group).not.toBeNull();
    expect(group.route).toBe('/__boom');
  });
});

describe('the security timeline', () => {
  it('records a successful sign-in with who it was', async () => {
    const events = await SecurityEvent.find({ type: 'login.success' }).lean();
    expect(events).toHaveLength(1);
    expect(events[0].actorEmail).toBe('admin@taifer.test');
    expect(events[0].severity).toBe('info');
  });

  it('records a failed sign-in without revealing anything in the response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@taifer.test', password: 'wrong-password-entirely' },
    });

    expect(response.statusCode).toBe(401);
    const event = await SecurityEvent.findOne({ type: 'login.failed' }).lean();
    expect(event.detail.reason).toBe('wrong_password');
    /* The attempt is on the timeline; the response still says nothing that
     * distinguishes a wrong password from an unknown address. */
    expect(response.json().error.message).toBe('Those credentials do not match an account.');
  });

  it('distinguishes an unknown address from a wrong password on the timeline only', async () => {
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@taifer.test', password: 'correct-horse-battery' },
    });

    const event = await SecurityEvent.findOne({ actorEmail: 'nobody@taifer.test' }).lean();
    expect(event.detail.reason).toBe('no_such_account');
    expect(unknown.json().error.message).toBe('Those credentials do not match an account.');
  });

  it('never stores a password, even when one is handed to the recorder', async () => {
    await recordSecurityEvent({
      type: 'login.failed',
      actorEmail: 'leak@taifer.test',
      detail: {
        password: 'hunter2',
        nested: { refreshToken: 'secret-value', note: 'keep me' },
        attempts: 3,
      },
    });

    const event = await SecurityEvent.findOne({ actorEmail: 'leak@taifer.test' }).lean();
    const serialised = JSON.stringify(event);
    /* The deny list is recursive on purpose: a nested object is exactly how a
     * secret gets past a shallow filter. */
    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('secret-value');
    expect(event.detail.attempts).toBe(3);
    expect(event.detail.nested.note).toBe('keep me');
  });

  it('records a denied permission without the route needing to say so', async () => {
    await createAdmin({ email: 'caller@taifer.test', name: 'A Caller', role: 'caller' });
    const caller = await signIn(app, {
      email: 'caller@taifer.test',
      password: 'correct-horse-battery',
    });

    const refused = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: caller.authHeader,
    });
    expect(refused.statusCode).toBe(403);

    await settle();

    const event = await SecurityEvent.findOne({ type: 'permission.denied' }).lean();
    /* Centralised in the error handler, so a route added next month is
     * covered without anyone remembering to instrument it. */
    expect(event).not.toBeNull();
    expect(event.actorEmail).toBe('caller@taifer.test');
    expect(event.severity).toBe('warn');
  });

  it('surfaces the sources working through a list of accounts', async () => {
    for (const email of ['a@taifer.test', 'b@taifer.test', 'c@taifer.test']) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'guessing-away-here' },
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/security?range=1h',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    const [worst] = response.json().meta.topFailingSources;
    /* Three addresses from one source is enumeration; one is a forgotten
     * password. The distinction only exists because accounts are counted. */
    expect(worst.accountsTried).toBe(3);
    expect(worst.attempts).toBe(3);
  });

  it('does not file the admin app’s first page load as a security event', async () => {
    /* The admin app tries its refresh cookie before showing the login form, so
     * this request happens on every first visit. Recording it as a warning
     * made the dashboard's "worth a look" count people opening the login
     * page. */
    const refused = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh' });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.code).toBe('CSRF_INVALID');

    await settle();

    expect(await SecurityEvent.countDocuments({ type: 'csrf.failed' })).toBe(0);
    /* And it is not miscategorised as a denied permission either, which is
     * what happened while the CSRF failure shared the FORBIDDEN code. */
    expect(await SecurityEvent.countDocuments({ type: 'permission.denied' })).toBe(0);
  });

  it('still records an anonymous rate limit, which is the abuse signal', async () => {
    /* Deliberately not suppressed the way anonymous CSRF is: nobody is signed
     * in when the public enquiry form is hammered, and that is precisely the
     * event the timeline exists to show. */
    const { recordSecurityEvent: record } = await import('../src/services/securityEvents.js');
    await record({ type: 'rate_limit.exceeded', detail: { route: '/api/v1/leads' } });

    const event = await SecurityEvent.findOne({ type: 'rate_limit.exceeded' }).lean();
    expect(event).not.toBeNull();
    expect(event.severity).toBe('warn');
    expect(event.actorEmail).toBeNull();
  });

  it('refuses the timeline to anyone without security.view', async () => {
    await createAdmin({ email: 'manager@taifer.test', role: 'team_manager' });
    const manager = await signIn(app, {
      email: 'manager@taifer.test',
      password: 'correct-horse-battery',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/security',
      headers: manager.authHeader,
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('visitor tracking', () => {
  const beacon = (payload) =>
    app.inject({ method: 'POST', url: '/api/v1/telemetry/page-view', payload });

  it('records a page view without storing the raw session id', async () => {
    const response = await beacon({ sessionId: 'visit-abc-123', path: '/destinations/spiti' });
    expect(response.statusCode).toBe(202);
    await settle();

    const visit = await VisitorSession.findOne({}).lean();
    expect(visit.landingPath).toBe('/destinations/spiti');
    /* Hashed, so a guessed or replayed id cannot be used to read somebody
     * else's visit back out. */
    expect(visit.sessionId).toBe(hashSessionId('visit-abc-123'));
    expect(visit.sessionId).not.toContain('visit-abc-123');
  });

  it('keeps the landing page and moves the exit page as they browse', async () => {
    /* Sequential, with a pause between each: three beacons fired at once
     * would race to create the same session and the order of the pages would
     * be whatever the database happened to apply first. A real browse is
     * sequential too — this is the shape of the traffic, not a workaround. */
    await beacon({ sessionId: 'visit-browse', path: '/destinations/spiti' });
    await settle(60);
    await beacon({ sessionId: 'visit-browse', path: '/journeys/spiti-circuit' });
    await settle(60);
    await beacon({ sessionId: 'visit-browse', path: '/contact' });
    await settle();

    const visit = await VisitorSession.findOne({}).lean();
    expect(visit.landingPath).toBe('/destinations/spiti');
    expect(visit.exitPath).toBe('/contact');
    expect(visit.pageViewCount).toBe(3);
  });

  it('reduces a referrer to its hostname', async () => {
    await beacon({
      sessionId: 'visit-referred',
      path: '/',
      referrer: 'https://www.google.com/search?q=private+search+terms',
    });
    await settle();

    const visit = await VisitorSession.findOne({}).lean();
    /* The full referring URL can carry what somebody typed to find us. The
     * hostname is all the attribution anyone needs. */
    expect(visit.referrerHost).toBe('google.com');
    expect(JSON.stringify(visit)).not.toContain('private+search+terms');
  });

  it('flags crawlers so the conversion rate is a rate among people', async () => {
    await beacon({ sessionId: 'visit-crawler', path: '/' });
    await settle();
    await VisitorSession.updateOne({}, { $set: { isBot: true } });
    await beacon({ sessionId: 'visit-human', path: '/' });
    await settle();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/visitors?range=1h',
      headers: session.authHeader,
    });

    const data = response.json().data;
    expect(data.sessions).toBe(1);
    expect(data.botSessions).toBe(1);
  });

  it('classifies devices coarsely and spots an obvious bot', () => {
    expect(classifyUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148').device).toBe(
      'mobile',
    );
    expect(classifyUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537').browser).toBe(
      'chrome',
    );
    /* Edge claims to be Chrome and Safari both, so the order of the checks is
     * the whole correctness of this function. */
    expect(classifyUserAgent('Mozilla/5.0 Chrome/120 Safari/537 Edg/120').browser).toBe('edge');
    expect(classifyUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').isBot).toBe(true);
  });

  it('attributes an enquiry to the visit that produced it', async () => {
    await beacon({ sessionId: 'visit-converts', path: '/destinations/spiti' });
    await settle();

    const submitted = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: 'Maya Iyer',
        email: 'maya@example.com',
        phone: '+919876500000',
        message: 'Spiti in June for two.',
        source: 'contact_form',
        sessionId: 'visit-converts',
      },
    });
    expect(submitted.statusCode).toBe(201);

    await settle(250);

    const visit = await VisitorSession.findOne({}).lean();
    expect(visit.convertedLead).not.toBeNull();

    /* The session id belongs to the visit, not to the customer: it must not
     * end up stored on the lead. */
    const lead = await Lead.findById(submitted.json().data.id).lean();
    expect(JSON.stringify(lead)).not.toContain('visit-converts');
  });

  it('reports per-page conversion and admits what it could not attribute', async () => {
    await beacon({ sessionId: 'visit-one', path: '/destinations/spiti' });
    await beacon({ sessionId: 'visit-two', path: '/destinations/spiti' });
    await settle();

    await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { 'idempotency-key': 'attributed' },
      payload: {
        name: 'Attributed Visitor',
        email: 'attributed@example.com',
        phone: '+919876500001',
        message: 'Spiti please.',
        source: 'contact_form',
        sessionId: 'visit-one',
      },
    });

    /* An enquiry with no session, as arrives from the phone or from a browser
     * with tracking blocked. */
    await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { 'idempotency-key': 'unattributed' },
      payload: {
        name: 'Phone Caller',
        email: 'phone@example.com',
        phone: '+919876500002',
        message: 'Ladakh please.',
        source: 'contact_form',
      },
    });

    await settle(250);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/visitors?range=1h',
      headers: session.authHeader,
    });

    const data = response.json().data;
    expect(data.sessions).toBe(2);
    expect(data.converted).toBe(1);
    expect(data.conversionRate).toBe(50);
    /* Printed beside the attributed figure so nobody mistakes one for the
     * other and concludes the marketing is half as effective as it is. */
    expect(data.enquiriesInRange).toBe(2);
    expect(data.attributionGap).toBe(1);

    const spiti = data.topLanding.find((row) => row.path === '/destinations/spiti');
    expect(spiti.sessions).toBe(2);
    expect(spiti.conversionRate).toBe(50);
  });

  it('keeps the conversion count but drops the link when a visitor is erased', async () => {
    await beacon({ sessionId: 'visit-erased', path: '/destinations/spiti' });
    await settle();

    const submitted = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      payload: {
        name: 'Forgetful Traveller',
        email: 'forget.me@example.com',
        phone: '+919876500009',
        message: 'Spiti, then please forget me.',
        source: 'contact_form',
        sessionId: 'visit-erased',
      },
    });
    expect(submitted.statusCode).toBe(201);
    await settle(250);

    const erased = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/compliance/subject?email=forget.me@example.com',
      headers: session.authHeader,
    });
    expect(erased.statusCode).toBe(200);
    expect(erased.json().data.visitsUnlinked).toBe(1);

    const visit = await VisitorSession.findOne({}).lean();
    /* The thread back to the person is gone — the pointer at their enquiry and
     * the hashed address that would make two of their visits linkable. */
    expect(visit.convertedLead).toBeNull();
    expect(visit.ipHash).toBeNull();
    /* But the statistic survives. "A visit to the Spiti page produced an
     * enquiry" is a fact about a page, and corrupting everyone else's
     * conversion rate is not what the person asked for. */
    expect(visit.converted).toBe(true);

    const summary = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/visitors?range=1h',
      headers: session.authHeader,
    });
    expect(summary.json().data.converted).toBe(1);
  });

  it('accepts the beacon from the public internet, unauthenticated', async () => {
    const response = await beacon({ sessionId: 'visit-anonymous', path: '/' });
    /* 202 with nothing to read back: the visitor is mid-navigation and must
     * not wait on our analytics write. */
    expect(response.statusCode).toBe(202);
  });

  it('rejects a beacon with an implausible dwell time', async () => {
    const response = await beacon({
      sessionId: 'visit-overnight',
      path: '/',
      dwellMs: 48 * 60 * 60 * 1000,
    });
    /* A tab left open overnight is not two days of reading, and an uncapped
     * figure would wreck every average on the dashboard. */
    expect(response.statusCode).toBe(422);
  });
});

describe('export', () => {
  it('exports the security timeline as CSV for someone who may', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/export.csv?dataset=security&range=1h',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.body).toContain('Severity');
    expect(response.body).toContain('login.success');
  });

  it('refuses the export to a role that may read the dashboard but not take it away', async () => {
    await createAdmin({
      email: 'viewer@taifer.test',
      role: 'team_manager',
      permissionOverrides: { granted: ['observability.view'], revoked: [] },
    });
    const viewer = await signIn(app, {
      email: 'viewer@taifer.test',
      password: 'correct-horse-battery',
    });

    const dashboard = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/summary',
      headers: viewer.authHeader,
    });
    expect(dashboard.statusCode).toBe(200);

    const download = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/observability/export.csv?dataset=visitors',
      headers: viewer.authHeader,
    });
    expect(download.statusCode).toBe(403);
  });
});
