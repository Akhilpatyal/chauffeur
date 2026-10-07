import { startTestApp, stopTestApp, clearCollections } from './helpers/app.js';
import { Lead } from '../src/models/Lead.js';
import { setFlag } from '../src/services/flags.js';

let app;

const valid = {
  name: 'Maya Iyer',
  email: 'maya@example.com',
  phone: '+91 98765 00000',
  topic: 'Custom expedition',
  message: 'We are two travellers looking at Spiti in June.',
  source: 'contact_form',
  context: { sourcePage: '/contact' },
};

const post = (payload, headers = {}) =>
  app.inject({ method: 'POST', url: '/api/v1/leads', payload, headers });

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
});

describe('POST /api/v1/leads', () => {
  it('stores a lead and returns its id', async () => {
    const response = await post(valid);

    expect(response.statusCode).toBe(201);
    expect(response.json().data.status).toBe('received');

    const lead = await Lead.findById(response.json().data.id).lean();
    expect(lead).toMatchObject({
      name: 'Maya Iyer',
      email: 'maya@example.com',
      source: 'contact_form',
      status: 'new',
    });
    expect(lead.context.sourcePage).toBe('/contact');
  });

  it('returns a correlation id on the response', async () => {
    const response = await post(valid);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('never stores the raw IP, only a hash', async () => {
    const response = await post(valid);
    const lead = await Lead.findById(response.json().data.id).lean();

    expect(lead.context.ipHash).toMatch(/^[a-f0-9]{40}$/);
    expect(JSON.stringify(lead)).not.toContain('127.0.0.1');
  });

  it('runs the notification handlers and marks the outbox sent', async () => {
    const response = await post(valid);
    const lead = await Lead.findById(response.json().data.id).lean();

    // Jobs run inline in tests, so by the time the response lands the console
    // email provider has already delivered both messages.
    expect(lead.notifications.adminEmail.status).toBe('sent');
    expect(lead.notifications.customerEmail.status).toBe('sent');
    expect(lead.notifications.adminWhatsapp.status).toBe('skipped');
  });
});

describe('lead validation', () => {
  it('rejects a missing name', async () => {
    const response = await post({ ...valid, name: '' });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_FAILED');
    expect(response.json().error.details.some((d) => d.field === 'name')).toBe(true);
  });

  it('rejects a malformed email', async () => {
    const response = await post({ ...valid, email: 'maya@localhost' });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('rejects a phone number with letters', async () => {
    const response = await post({ ...valid, phone: 'call me' });
    expect(response.statusCode).toBe(422);
  });

  it('requires a message when nothing else describes the trip', async () => {
    const response = await post({ name: 'A', email: 'a@b.co', source: 'contact_form' });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.details.some((d) => d.field === 'message')).toBe(true);
  });

  it('accepts the Plan My Trip shape with no message', async () => {
    const response = await post({
      name: 'Rhea',
      email: 'rhea@example.com',
      phone: '+919876500000',
      source: 'plan_my_trip',
      tripPreferences: { destination: 'Spiti Valley', budget: 'Rs 25,000 - 45,000' },
    });

    expect(response.statusCode).toBe(201);
    const lead = await Lead.findById(response.json().data.id).lean();
    expect(lead.tripPreferences.destination).toBe('Spiti Valley');
  });

  it('strips HTML out of free text', async () => {
    const response = await post({
      ...valid,
      name: 'Maya <script>alert(1)</script>',
      message: 'Hello <img src=x onerror=alert(1)> there',
    });

    const lead = await Lead.findById(response.json().data.id).lean();
    expect(lead.name).not.toContain('<');
    expect(lead.message).not.toContain('<img');
  });

  it('ignores Mongo operators smuggled into the body', async () => {
    const response = await post({ ...valid, $where: 'sleep(1000)', 'a.b': 1 });
    expect(response.statusCode).toBe(201);
  });
});

describe('lead spam protection', () => {
  it('silently discards a honeypot submission', async () => {
    const response = await post({ ...valid, website: 'http://spam.example' });

    // Looks like a success to the bot, but nothing is stored.
    expect(response.statusCode).toBe(201);
    expect(response.json().data.id).toBeNull();
    expect(await Lead.countDocuments({})).toBe(0);
  });
});

describe('lead idempotency', () => {
  it('returns the original result for a repeated Idempotency-Key', async () => {
    const headers = { 'idempotency-key': 'submit-abc-123' };

    const first = await post(valid, headers);
    const second = await post(valid, headers);

    expect(first.statusCode).toBe(201);
    expect(second.json().data.id).toBe(first.json().data.id);
    expect(await Lead.countDocuments({})).toBe(1);
  });

  it('rejects a reused key carrying a different payload', async () => {
    const headers = { 'idempotency-key': 'submit-xyz' };
    await post(valid, headers);

    const response = await post({ ...valid, message: 'Different enquiry entirely' }, headers);
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFLICT');
  });

  it('collapses a double submit that carries no key', async () => {
    const first = await post(valid);
    const second = await post(valid);

    expect(second.statusCode).toBe(200);
    expect(second.json().meta.deduplicated).toBe(true);
    expect(second.json().data.id).toBe(first.json().data.id);
    expect(await Lead.countDocuments({})).toBe(1);
  });
});

describe('lead duplicate detection', () => {
  it('threads a later enquiry onto the first one', async () => {
    const first = await post(valid);

    // A different enquiry from the same person is a second enquiry, not a
    // double submit, so it is stored and linked rather than discarded.
    const second = await post(
      { ...valid, source: 'journey_enquiry', message: 'Also curious about Ladakh' },
      { 'idempotency-key': 'second-enquiry' },
    );

    expect(second.statusCode).toBe(201);

    const root = await Lead.findById(first.json().data.id).lean();
    const child = await Lead.findById(second.json().data.id).lean();

    expect(String(child.duplicateOf)).toBe(String(root._id));
    expect(root.enquiryCount).toBe(2);
  });

  it('treats Gmail aliases as the same person', async () => {
    await post({ ...valid, email: 'maya.iyer@gmail.com' }, { 'idempotency-key': 'k1' });
    const second = await post(
      { ...valid, email: 'mayaiyer+trips@gmail.com', source: 'journey_enquiry' },
      { 'idempotency-key': 'k2' },
    );

    const child = await Lead.findById(second.json().data.id).lean();
    expect(child.duplicateOf).not.toBeNull();
  });
});

describe('maintenance mode', () => {
  it('returns 503 with a user-facing message when submissions are paused', async () => {
    await setFlag('submissions_enabled', false, { message: 'Back in ten minutes.' });

    const response = await post(valid);

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('FEATURE_DISABLED');
    expect(response.json().error.message).toBe('Back in ten minutes.');
    expect(await Lead.countDocuments({})).toBe(0);

    await setFlag('submissions_enabled', true);
  });
});

describe('enquiry context', () => {
  /*
   * The site raises enquiries from a journey page, a weekend escape, a stay and
   * a group tour. Each must arrive tagged, because an untagged lead is the
   * reason the dashboard cannot report which trips people ask about.
   */
  it('stores what the visitor was looking at', async () => {
    const response = await post({
      ...valid,
      source: 'weekend_escape_enquiry',
      topic: 'Triund Sunrise Trek',
      interest: {
        kind: 'weekend_escape',
        slug: 'triund-sunrise-trek',
        title: 'Triund Sunrise Trek',
      },
    });

    expect(response.statusCode).toBe(201);

    const lead = await Lead.findById(response.json().data.id).lean();
    expect(lead.source).toBe('weekend_escape_enquiry');
    expect(lead.topic).toBe('Triund Sunrise Trek');
    expect(lead.interest).toMatchObject({
      kind: 'weekend_escape',
      slug: 'triund-sunrise-trek',
      title: 'Triund Sunrise Trek',
    });
  });

  it.each([
    ['journey', 'journey_enquiry'],
    ['weekend_escape', 'weekend_escape_enquiry'],
    ['group_tour', 'group_tour_enquiry'],
    ['hotel', 'hotel_enquiry'],
    ['destination', 'plan_my_trip'],
  ])('accepts a %s enquiry from the %s form', async (kind, source) => {
    const response = await post({
      ...valid,
      source,
      interest: { kind, slug: `${kind}-slug`, title: `A ${kind}` },
    });

    expect(response.statusCode).toBe(201);
    const lead = await Lead.findById(response.json().data.id).lean();
    expect(lead.interest.kind).toBe(kind);
  });

  it('rejects an interest kind the dashboard cannot report on', async () => {
    const response = await post({
      ...valid,
      interest: { kind: 'spaceship', slug: 'x', title: 'X' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('surfaces tagged enquiries in the most-enquired report', async () => {
    await post(
      { ...valid, interest: { kind: 'journey', slug: 'spiti', title: 'Spiti Circuit' } },
      { 'idempotency-key': 'i1' },
    );
    await post(
      {
        ...valid,
        email: 'other@example.com',
        interest: { kind: 'journey', slug: 'spiti', title: 'Spiti Circuit' },
      },
      { 'idempotency-key': 'i2' },
    );

    const { leadAnalytics } = await import('../src/modules/admin/analytics.service.js');
    const report = await leadAnalytics({ granularity: 'day' });

    const spiti = report.byInterest.find((row) => row.label === 'Spiti Circuit');
    expect(spiti).toBeDefined();
    expect(spiti.count).toBe(2);
  });
});
