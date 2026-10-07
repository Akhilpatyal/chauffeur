/*
 * The limiter had no test, and that is exactly how its response shape drifted:
 * a throttled visitor received a 500 "something went wrong on our side"
 * instead of a 429 telling them to wait. One message blames us and invites an
 * immediate retry; the other explains the wait.
 *
 * Nothing is imported at module scope on purpose. config/env.js reads and
 * freezes process.env the first time it is imported, so the low ceiling this
 * file needs has to be set before anything pulls the app in. Jest gives each
 * test file its own module registry, so the dynamic imports below pick up
 * these values without affecting the rest of the suite.
 */
let app;
let helpers;
let Lead;

const valid = {
  name: 'Rate Limit Tester',
  email: 'ratelimit@example.com',
  message: 'Checking the limiter.',
  source: 'contact_form',
};

const submit = (i) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/leads',
    headers: { 'idempotency-key': `rl-${i}` },
    /* Distinct emails so nothing is collapsed as a duplicate before the
     * limiter gets a chance to reject it. */
    payload: { ...valid, email: `rate-${i}@example.com` },
  });

beforeAll(async () => {
  process.env.RATE_LIMIT_LEADS_MAX = '3';
  process.env.RATE_LIMIT_LEADS_WINDOW = '10 minutes';

  helpers = await import('./helpers/app.js');
  ({ Lead } = await import('../src/models/Lead.js'));
  app = await helpers.startTestApp();
});

afterAll(async () => {
  await helpers.stopTestApp(app);
});

describe('lead rate limiting', () => {
  it('answers 429 with a wait message, not a 500', async () => {
    const responses = [];
    for (let i = 0; i < 5; i += 1) {
      responses.push(await submit(i));
    }

    const codes = responses.map((r) => r.statusCode);
    expect(codes.filter((c) => c >= 500)).toHaveLength(0);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);

    const throttled = responses.find((r) => r.statusCode === 429).json();
    expect(throttled.error.code).toBe('RATE_LIMITED');
    expect(throttled.error.message).toMatch(/too many requests/i);
    /* Tells the visitor how long to wait rather than just refusing. */
    expect(throttled.error.message).toMatch(/try again in/i);
    expect(throttled.error.requestId).toBeTruthy();
  });

  it('keeps every lead it accepted before the ceiling', async () => {
    /* Throttling must never cost a lead that was already taken. */
    expect(await Lead.countDocuments({})).toBe(3);
  });
});
