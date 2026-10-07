import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Journey } from '../src/models/Journey.js';

let app;
let session;

const baseJourney = {
  title: 'Spiti Valley High Road Expedition',
  location: 'Spiti Valley, Himachal Pradesh',
  duration: '6 Days',
  durationDays: 6,
  difficulty: 'Moderate',
  price: { amount: 14999, currency: 'INR', display: 'Rs 14,999' },
  rating: 4.95,
  description: 'An overland expedition through lunar landscapes.',
  tags: ['High Passes', 'Monasteries'],
  image: 'https://images.example.com/spiti.jpg',
};

const createJourney = (overrides = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/admin/content/journeys',
    headers: session.authHeader,
    payload: { ...baseJourney, ...overrides },
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
  session = await signIn(app);
});

describe('admin content CRUD', () => {
  it('creates a journey and derives a slug from the title', async () => {
    const response = await createJourney();

    expect(response.statusCode).toBe(201);
    expect(response.json().data.slug).toBe('spiti-valley-high-road-expedition');
  });

  it('disambiguates a duplicate slug instead of failing', async () => {
    await createJourney();
    const second = await createJourney();

    expect(second.statusCode).toBe(201);
    expect(second.json().data.slug).toBe('spiti-valley-high-road-expedition-2');
  });

  it('rejects an unauthenticated write', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/content/journeys',
      payload: baseJourney,
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects an invalid difficulty', async () => {
    const response = await createJourney({ difficulty: 'Extremely Hard' });
    expect(response.statusCode).toBe(422);
  });

  it('updates a journey without renaming its slug', async () => {
    const created = await createJourney();
    const { _id, slug } = created.json().data;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/content/journeys/${_id}`,
      headers: session.authHeader,
      payload: { title: 'Spiti Valley Expedition (Revised)' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.title).toBe('Spiti Valley Expedition (Revised)');
    // Renaming the slug would break every published link to this page.
    expect(response.json().data.slug).toBe(slug);
  });

  it('deletes a journey', async () => {
    const created = await createJourney();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/content/journeys/${created.json().data._id}`,
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(await Journey.countDocuments({})).toBe(0);
  });

  it('writes an audit entry for every change', async () => {
    const created = await createJourney();
    await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/content/journeys/${created.json().data._id}`,
      headers: session.authHeader,
      payload: { rating: 4.8 },
    });

    const audit = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit?entity=journeys',
      headers: session.authHeader,
    });

    const actions = audit.json().data.map((entry) => entry.action);
    expect(actions).toContain('content.create');
    expect(actions).toContain('content.update');

    // Only the changed field is recorded, not the whole document.
    const update = audit.json().data.find((entry) => entry.action === 'content.update');
    expect(Object.keys(update.after)).toEqual(['rating']);
  });
});

describe('public content reads', () => {
  it('hides drafts from the public listing but shows them to an admin', async () => {
    await createJourney({ status: 'draft', title: 'Unpublished Draft Trip' });
    await createJourney({ status: 'published' });

    const publicList = await app.inject({ method: 'GET', url: '/api/v1/journeys' });
    const adminList = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/content/journeys?status=all',
      headers: session.authHeader,
    });

    expect(publicList.json().data).toHaveLength(1);
    expect(adminList.json().data).toHaveLength(2);
  });

  it('paginates and reports totals', async () => {
    for (let index = 0; index < 5; index += 1) {
      await createJourney({ title: `Journey number ${index}` });
    }

    const response = await app.inject({ method: 'GET', url: '/api/v1/journeys?page=2&limit=2' });

    expect(response.json().data).toHaveLength(2);
    expect(response.json().meta).toMatchObject({ page: 2, limit: 2, total: 5, pages: 3, hasNext: true, hasPrev: true });
  });

  it('caps an oversized limit instead of returning everything', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/journeys?limit=10000' });
    expect(response.statusCode).toBe(422);
  });

  it('filters by tag and by price range', async () => {
    await createJourney({ title: 'Cheap Trip', tags: ['Budget'], price: { amount: 9999 } });
    await createJourney({ title: 'Premium Trip', tags: ['Luxury'], price: { amount: 49999 } });

    const byTag = await app.inject({ method: 'GET', url: '/api/v1/journeys?tags=Luxury' });
    expect(byTag.json().data).toHaveLength(1);
    expect(byTag.json().data[0].title).toBe('Premium Trip');

    const byPrice = await app.inject({ method: 'GET', url: '/api/v1/journeys?maxPrice=20000' });
    expect(byPrice.json().data).toHaveLength(1);
    expect(byPrice.json().data[0].title).toBe('Cheap Trip');
  });

  it('sorts only on allow-listed fields', async () => {
    await createJourney({ title: 'A trip', price: { amount: 30000 } });
    await createJourney({ title: 'B trip', price: { amount: 10000 } });

    const sorted = await app.inject({ method: 'GET', url: '/api/v1/journeys?sort=price.amount' });
    expect(sorted.json().data[0].price.amount).toBe(10000);

    // An unknown sort field falls back to the default rather than scanning.
    const ignored = await app.inject({ method: 'GET', url: '/api/v1/journeys?sort=secretField' });
    expect(ignored.statusCode).toBe(200);
  });

  it('serves a detail page by slug and 404s an unknown one', async () => {
    const created = await createJourney();

    const found = await app.inject({
      method: 'GET',
      url: `/api/v1/journeys/${created.json().data.slug}`,
    });
    expect(found.statusCode).toBe(200);
    expect(found.json().data.title).toBe(baseJourney.title);

    const missing = await app.inject({ method: 'GET', url: '/api/v1/journeys/no-such-trip' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
  });

  it('sets a cache-control header a CDN can use', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/journeys' });
    expect(response.headers['cache-control']).toContain('s-maxage');
    expect(response.headers['cache-control']).toContain('stale-while-revalidate');
  });

  it('returns the homepage bundle in one request', async () => {
    await createJourney({ isFeatured: true });

    const response = await app.inject({ method: 'GET', url: '/api/v1/home' });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().data)).toEqual(
      expect.arrayContaining(['journeys', 'destinations', 'groupTours', 'testimonials', 'articles']),
    );
    expect(response.json().data.journeys).toHaveLength(1);
  });

  it('escapes regex metacharacters in a search term', async () => {
    await createJourney({ title: 'Normal Trip' });

    // Unescaped, ".*" would match everything.
    const response = await app.inject({ method: 'GET', url: '/api/v1/journeys?search=.*' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(0);
  });
});

describe('health probes', () => {
  it('reports liveness without touching a dependency', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('reports readiness including dependency checks', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json().checks.mongo.ok).toBe(true);
  });
});
