import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Lead } from '../src/models/Lead.js';

let app;
let session;
let agent;

const submit = (overrides = {}, headers = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/leads',
    headers,
    payload: {
      name: 'Maya Iyer',
      email: 'maya@example.com',
      phone: '+919876500000',
      message: 'Spiti in June for two.',
      source: 'contact_form',
      topic: 'Spiti Valley',
      ...overrides,
    },
  });

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
  await createAdmin();
  const created = await createAdmin({
    email: 'agent@taifer.test',
    name: 'Sales Agent',
    role: 'sales_agent',
  });
  agent = created.user;
  session = await signIn(app);
});

describe('lead list and detail', () => {
  it('folds follow-up enquiries into one row by default', async () => {
    await submit({}, { 'idempotency-key': 'a' });
    await submit({ source: 'journey_enquiry', message: 'Also Ladakh' }, { 'idempotency-key': 'b' });

    const folded = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: session.authHeader,
    });
    expect(folded.json().meta.total).toBe(1);
    expect(folded.json().data[0].enquiryCount).toBe(2);

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads?includeDuplicates=true',
      headers: session.authHeader,
    });
    expect(all.json().meta.total).toBe(2);
  });

  it('returns the contact thread on the detail view', async () => {
    const first = await submit({}, { 'idempotency-key': 'a' });
    await submit({ source: 'journey_enquiry', message: 'Also Ladakh' }, { 'idempotency-key': 'b' });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/leads/${first.json().data.id}`,
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.thread).toHaveLength(1);
    expect(response.json().data.thread[0].source).toBe('journey_enquiry');
  });

  it('searches by name, email and phone', async () => {
    await submit({}, { 'idempotency-key': 'a' });
    await submit(
      { name: 'Aditya Verma', email: 'aditya@example.com' },
      { 'idempotency-key': 'b' },
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads?search=aditya',
      headers: session.authHeader,
    });

    expect(response.json().meta.total).toBe(1);
    expect(response.json().data[0].email).toBe('aditya@example.com');
  });

  it('filters by status', async () => {
    const created = await submit();
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${created.json().data.id}/status`,
      headers: session.authHeader,
      payload: { status: 'contacted' },
    });

    const contacted = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads?status=contacted',
      headers: session.authHeader,
    });
    expect(contacted.json().meta.total).toBe(1);

    const stillNew = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads?status=new',
      headers: session.authHeader,
    });
    expect(stillNew.json().meta.total).toBe(0);
  });

  it('404s an unknown lead and 422s a malformed id', async () => {
    const unknown = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/0123456789abcdef01234567',
      headers: session.authHeader,
    });
    expect(unknown.statusCode).toBe(404);

    const malformed = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/not-an-id',
      headers: session.authHeader,
    });
    expect(malformed.statusCode).toBe(422);
  });
});

describe('lead pipeline actions', () => {
  it('records who changed a status and when', async () => {
    const created = await submit();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${created.json().data.id}/status`,
      headers: session.authHeader,
      payload: { status: 'lost', reason: 'Went with another operator' },
    });

    expect(response.statusCode).toBe(200);

    const lead = await Lead.findById(created.json().data.id).lean();
    expect(lead.status).toBe('lost');
    expect(lead.lostReason).toBe('Went with another operator');

    const change = lead.statusHistory.at(-1);
    expect(change).toMatchObject({ from: 'new', to: 'lost', byName: 'Test Admin' });
  });

  it('rejects a status outside the pipeline', async () => {
    const created = await submit();
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${created.json().data.id}/status`,
      headers: session.authHeader,
      payload: { status: 'maybe' },
    });
    expect(response.statusCode).toBe(422);
  });

  it('assigns and unassigns a lead', async () => {
    const created = await submit();
    const url = `/api/v1/admin/leads/${created.json().data.id}/assign`;

    const assigned = await app.inject({
      method: 'PATCH',
      url,
      headers: session.authHeader,
      payload: { assignedTo: String(agent._id) },
    });
    expect(assigned.statusCode).toBe(200);
    expect(String(assigned.json().data.assignedTo)).toBe(String(agent._id));

    const unassigned = await app.inject({
      method: 'PATCH',
      url,
      headers: session.authHeader,
      payload: { assignedTo: null },
    });
    expect(unassigned.json().data.assignedTo).toBeNull();
  });

  it('adds an internal note attributed to its author', async () => {
    const created = await submit();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/leads/${created.json().data.id}/notes`,
      headers: session.authHeader,
      payload: { body: 'Called, asked for a quote by Friday.' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.authorName).toBe('Test Admin');
  });

  it('rejects an empty note', async () => {
    const created = await submit();
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/leads/${created.json().data.id}/notes`,
      headers: session.authHeader,
      payload: { body: '   ' },
    });
    expect(response.statusCode).toBe(422);
  });
});

describe('CSV export', () => {
  it('exports the filtered leads as a downloadable file', async () => {
    await submit();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).toContain('maya@example.com');
    expect(response.body.split('\r\n')[0]).toContain('Received,Name,Email');
  });

  it('neutralises a formula injected through a lead field', async () => {
    await submit({ name: '=cmd|calc!A1' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads/export.csv',
      headers: session.authHeader,
    });

    // Prefixed with an apostrophe so Excel treats it as text, not a formula.
    expect(response.body).toContain("'=cmd|calc!A1");
  });
});

describe('analytics', () => {
  it('aggregates totals, conversion rate and source pages', async () => {
    await submit({ context: { sourcePage: '/contact' } }, { 'idempotency-key': 'a' });
    const second = await submit(
      { email: 'other@example.com', context: { sourcePage: '/journeys' } },
      { 'idempotency-key': 'b' },
    );
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/leads/${second.json().data.id}/status`,
      headers: session.authHeader,
      payload: { status: 'converted' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/leads',
      headers: session.authHeader,
    });

    const data = response.json().data;
    expect(data.totals.total).toBe(2);
    expect(data.totals.converted).toBe(1);
    expect(data.totals.conversionRate).toBe(0.5);
    expect(data.bySourcePage.map((row) => row.page)).toEqual(
      expect.arrayContaining(['/contact', '/journeys']),
    );
    expect(data.stuckNotifications).toBe(0);
  });
});

describe('data subject requests', () => {
  it('exports and then anonymises everything held about a person', async () => {
    await submit();

    const exported = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/compliance/subject?email=maya@example.com',
      headers: session.authHeader,
    });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().data.leads).toHaveLength(1);

    const erased = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/compliance/subject?email=maya@example.com',
      headers: session.authHeader,
    });
    expect(erased.json().data.leadsAnonymised).toBe(1);

    // The row survives so historical figures do not change, but nothing in it
    // identifies the person any more.
    const lead = await Lead.findOne({}).lean();
    expect(lead.name).toBe('Anonymised');
    expect(lead.message).toBeNull();
    expect(lead.anonymisedAt).toBeInstanceOf(Date);
    expect(lead.email).not.toContain('maya');
  });
});
