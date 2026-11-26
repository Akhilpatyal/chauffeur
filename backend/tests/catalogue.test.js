import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestApp, stopTestApp, clearCollections } from './helpers/app.js';
import { Departure } from '../src/models/Departure.js';
import { DEFAULT_OPEN_TRIP_SLUGS, isTripOpen } from '../src/config/catalogue.js';

/*
 * What we are and are not selling.
 *
 * Two things are checked here, and the second is the one that will actually
 * catch a mistake months from now: that the server refuses a closed trip,
 * and that the server's idea of "closed" has not drifted from the site's.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const AVAILABILITY_FILE = path.resolve(
  here,
  '../../frontend/src/data/availability.js',
);

let app;
let counter = 0;

async function signUp() {
  counter += 1;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/register',
    headers: { 'x-forwarded-for': `203.0.114.${counter % 250}` },
    payload: {
      name: 'Catalogue Tester',
      email: `c${Date.now()}${counter}@example.com`,
      password: 'correct-horse-battery',
    },
  });
  if (response.statusCode !== 201) throw new Error(`sign-up failed: ${response.body}`);
  return { authorization: `Bearer ${response.json().data.accessToken}` };
}

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
});

describe('the open list matches the site', () => {
  it('has the same open trips as frontend/src/data/availability.js', async () => {
    /*
     * Read rather than imported: the two apps build separately and the
     * backend cannot import a JSX-era ES module from the frontend tree
     * without dragging its toolchain in. Parsing the one array we care
     * about is cheaper and fails just as loudly.
     */
    const source = await readFile(AVAILABILITY_FILE, 'utf8');

    /* Every `id: { state: OPEN }` entry from the ENTRIES map. The quotes
     * are optional because a slug without a hyphen is a valid bare key —
     * which is exactly what this missed on the first run. */
    const siteOpen = [...source.matchAll(/['"]?([a-z0-9-]+)['"]?:\s*\{\s*state:\s*OPEN\s*\}/g)]
      .map((match) => match[1])
      .sort();

    expect(siteOpen.length).toBeGreaterThan(0);
    /* If this fails, one of the two files was changed without the other.
     * Both must list exactly the same slugs. */
    expect(siteOpen).toEqual([...DEFAULT_OPEN_TRIP_SLUGS].sort());
  });

  it('treats a custom request as always allowed', () => {
    /* No slug means somebody describing a trip rather than picking one off
     * the catalogue — the one way to ask about a region we have not opened. */
    expect(isTripOpen(null)).toBe(true);
    expect(isTripOpen(undefined)).toBe(true);
  });

  it('is not case sensitive about a slug', () => {
    expect(isTripOpen(DEFAULT_OPEN_TRIP_SLUGS[0].toUpperCase())).toBe(true);
  });
});

describe('the API refuses a trip we are not selling', () => {
  const makeDeparture = (tripSlug) =>
    Departure.create({
      tripSlug,
      startDate: new Date('2027-08-05'),
      endDate: new Date('2027-08-10'),
      capacity: 12,
      minimumGroupSize: 6,
      pricePerPerson: 1499900,
    });

  it('rejects a booking for a closed trip even though the UI hides the button', async () => {
    const headers = await signUp();
    const departure = await makeDeparture('spiti-circuit');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers,
      payload: {
        kind: 'fixed_departure',
        departureId: String(departure._id),
        travellerCount: 2,
        trip: { slug: 'spiti-circuit', title: 'Spiti Valley High Road' },
      },
    });

    /* The whole point: hiding a control is not a control. */
    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/not taking bookings/i);
  });

  it('still takes a booking for an open trip', async () => {
    const headers = await signUp();
    const departure = await makeDeparture(DEFAULT_OPEN_TRIP_SLUGS[0]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers,
      payload: {
        kind: 'fixed_departure',
        departureId: String(departure._id),
        travellerCount: 2,
        trip: { slug: DEFAULT_OPEN_TRIP_SLUGS[0], title: 'An open trip' },
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('still takes a custom request for a region that is not open', async () => {
    const headers = await signUp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers,
      payload: {
        kind: 'custom',
        travellerCount: 2,
        startDate: '2027-09-01',
        /* No slug: "I would like to go to Ladakh" is an enquiry, and
         * refusing it would close the only route by which we hear that
         * somebody wants a region we have not opened. */
        trip: { title: 'Something in Ladakh' },
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
