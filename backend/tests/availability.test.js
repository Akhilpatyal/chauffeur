import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Journey } from '../src/models/Journey.js';
import { Destination } from '../src/models/Destination.js';
import { isTripOpenNow } from '../src/config/catalogue.js';

/*
 * Availability, now that the desk owns it.
 *
 * The behaviour worth protecting is the scheduled opening: a trip marked
 * closed with a date in the past must read as open without anything having
 * run, and a date in the future must not open it early. Everything else here
 * is about making sure the CMS answer is the one that actually stops a
 * booking, rather than a decoration on top of a hardcoded list.
 */
let app;
let counter = 0;

const slugFor = (name) => `${name}-${Date.now()}${(counter += 1)}`;

async function makeJourney(slug, availability, status = 'published') {
  return Journey.create({
    slug,
    title: 'Test Journey',
    location: 'Himachal Pradesh',
    status,
    availability,
  });
}

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
  await createAdmin();
});

describe('a scheduled opening', () => {
  it('reads as open once the date has passed, with nothing having run', async () => {
    const slug = slugFor('season-started');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const journey = await makeJourney(slug, { state: 'seasonal', opensOn: yesterday });

    /* The stored state still says seasonal — nobody edited it. */
    expect(journey.availability.state).toBe('seasonal');

    /* The effective one does not, and that is the one everything reads. */
    expect(journey.effectiveAvailability().state).toBe('open');
    expect(journey.effectiveAvailability().opensLater).toBe(false);
    await expect(isTripOpenNow(slug)).resolves.toBe(true);
  });

  it('does not open early', async () => {
    const slug = slugFor('season-ahead');
    const nextYear = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    const journey = await makeJourney(slug, { state: 'seasonal', opensOn: nextYear });

    const effective = journey.effectiveAvailability();
    expect(effective.state).toBe('seasonal');
    expect(effective.opensLater).toBe(true);
    await expect(isTripOpenNow(slug)).resolves.toBe(false);
  });

  it('defaults a new record to closed', async () => {
    /* A record created without anybody thinking about availability must not
     * quietly go on sale. */
    const slug = slugFor('fresh');
    const journey = await makeJourney(slug, undefined);
    expect(journey.effectiveAvailability().state).toBe('coming_soon');
    await expect(isTripOpenNow(slug)).resolves.toBe(false);
  });
});

describe('the CMS is what stops a booking', () => {
  it('refuses an open trip that has been unpublished', async () => {
    /* "Disable it from the CMS" has to stop a booking, not just hide a card:
     * the endpoint is still reachable by anybody who kept the slug. */
    const slug = slugFor('hidden');
    await makeJourney(slug, { state: 'open' }, 'draft');
    await expect(isTripOpenNow(slug)).resolves.toBe(false);
  });

  it('lets the CMS open a trip the built-in list does not list', async () => {
    const slug = slugFor('brand-new');
    await makeJourney(slug, { state: 'open' });
    await expect(isTripOpenNow(slug)).resolves.toBe(true);
  });

  it('still allows a custom request with no slug at all', async () => {
    await expect(isTripOpenNow(null)).resolves.toBe(true);
    await expect(isTripOpenNow(undefined)).resolves.toBe(true);
  });
});

describe('the public endpoint', () => {
  it('returns one map across collections with the date already applied', async () => {
    const openSlug = slugFor('open-one');
    const soonSlug = slugFor('soon-one');
    const startedSlug = slugFor('started-one');

    await makeJourney(openSlug, { state: 'open' });
    await Destination.create({
      slug: soonSlug,
      name: 'Somewhere',
      state: 'Himachal Pradesh',
      availability: { state: 'coming_soon', headline: 'Not yet', note: 'Soon.' },
    });
    await makeJourney(startedSlug, {
      state: 'seasonal',
      opensOn: new Date(Date.now() - 1000),
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/availability' });
    expect(response.statusCode).toBe(200);

    const { data } = response.json();
    expect(data[openSlug].state).toBe('open');
    expect(data[soonSlug].state).toBe('coming_soon');
    expect(data[soonSlug].headline).toBe('Not yet');
    /* Computed for the client, so no card has to compare dates itself. */
    expect(data[startedSlug].state).toBe('open');
  });

  it('leaves out anything unpublished', async () => {
    const hidden = slugFor('unpublished');
    await makeJourney(hidden, { state: 'open' }, 'draft');

    const response = await app.inject({ method: 'GET', url: '/api/v1/availability' });
    expect(response.json().data[hidden]).toBeUndefined();
  });
});

describe('editing it from the admin', () => {
  it('saves a state and an opening date through the content API', async () => {
    const session = await signIn(app);
    const slug = slugFor('edit-me');
    const journey = await makeJourney(slug, { state: 'coming_soon' });

    const response = await app.inject({
      /* PUT by id, which is what the content API exposes — the editor works
       * from a record it has already loaded. */
      method: 'PUT',
      url: `/api/v1/admin/content/journeys/${journey._id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        availability: {
          state: 'seasonal',
          opensOn: '2027-05-01',
          headline: 'Shut for the winter',
          note: 'The pass is under snow.',
        },
      },
    });

    expect(response.statusCode).toBe(200);

    const saved = await Journey.findOne({ slug });
    expect(saved.availability.state).toBe('seasonal');
    expect(saved.availability.headline).toBe('Shut for the winter');
    expect(saved.availability.opensOn.toISOString().slice(0, 10)).toBe('2027-05-01');
  });
});
