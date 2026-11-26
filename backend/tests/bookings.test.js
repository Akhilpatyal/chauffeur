import { startTestApp, stopTestApp, clearCollections } from './helpers/app.js';
import { Booking } from '../src/models/Booking.js';
import { BookingEvent } from '../src/models/BookingEvent.js';
import { Departure } from '../src/models/Departure.js';
import { DEFAULT_OPEN_TRIP_SLUGS } from '../src/config/catalogue.js';
import { Customer } from '../src/models/Customer.js';

/*
 * Reservation requests.
 *
 * The tests that matter most are about the promise a booking does and does
 * not make. A request is not a trip; a rejected request is not an upcoming
 * one; and one customer can never see another's. Those are the failures that
 * cost money or trust rather than a rendering glitch.
 */
/* Whichever trip the catalogue is currently selling, rather than a slug
 * written out here. These suites are about booking mechanics and the slug is
 * incidental — but it has to be one the API will accept, and hardcoding one
 * broke all three of them the day the open list narrowed to Bir Billing.
 * catalogue.test.js owns the question of which trips are open. */
const OPEN_SLUG = DEFAULT_OPEN_TRIP_SLUGS[0];

let app;
let addressCounter = 0;

/* Registration and sign-in are rate limited per source address, correctly, so
 * each fixture gets its own rather than the limiter becoming the reason an
 * unrelated assertion fails. */
const freshAddress = () => {
  addressCounter += 1;
  return `203.0.113.${addressCounter % 250}`;
};

async function signUp(email = `t${Date.now()}${addressCounter}@example.com`) {
  const ip = freshAddress();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/register',
    headers: { 'x-forwarded-for': ip },
    payload: { name: 'Test Traveller', email, password: 'correct-horse-battery' },
  });
  if (response.statusCode !== 201) throw new Error(`sign-up failed: ${response.body}`);
  return {
    token: response.json().data.accessToken,
    customer: response.json().data.customer,
    headers: { authorization: `Bearer ${response.json().data.accessToken}` },
    ip,
  };
}

const makeDeparture = (overrides = {}) =>
  Departure.create({
    tripSlug: OPEN_SLUG,
    startDate: new Date('2027-06-05'),
    endDate: new Date('2027-06-10'),
    capacity: 12,
    minimumGroupSize: 6,
    pricePerPerson: 1499900,
    ...overrides,
  });

const requestFixed = (session, departure, overrides = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/account/bookings',
    headers: session.headers,
    payload: {
      kind: 'fixed_departure',
      departureId: String(departure._id),
      travellerCount: 2,
      trip: { slug: OPEN_SLUG, title: 'Open Trip' },
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
});

describe('requesting a fixed departure', () => {
  it('creates a request that is explicitly not a confirmed trip', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const response = await requestFixed(session, departure);

    expect(response.statusCode).toBe(201);
    const booking = response.json().data;
    expect(booking.status).toBe('REQUESTED');
    expect(booking.paymentStatus).toBe('UNPAID');
    /* No agreed price exists yet. Seeding this with a headline figure would
     * make a request look like an invoice. */
    expect(booking.totalAmount).toBe(0);
    /* And the message says so in words, not only in a status code. */
    expect(response.json().meta.message).toMatch(/nothing is booked yet/i);
  });

  it('gives it a reference a person can read down the phone', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const booking = (await requestFixed(session, departure)).json().data;

    expect(booking.reference).toMatch(/^TF-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    /* No I, O, 0, 1 or S — the characters people mishear and mistype. */
    expect(booking.reference).not.toMatch(/[IO01S5]/);
  });

  it('opens the timeline with a submission event', async () => {
    const session = await signUp();
    const departure = await makeDeparture();
    const booking = (await requestFixed(session, departure)).json().data;

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: session.headers,
    });

    const { timeline } = detail.json().meta;
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('request.submitted');
    /* A stage that has not happened has no row, so a future step can never
     * render as done. */
    expect(timeline.some((e) => e.type === 'booking.confirmed')).toBe(false);
  });

  it('returns the same booking for a retried submission', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const first = await requestFixed(session, departure, { idempotencyKey: 'double-tap-1234' });
    const second = await requestFixed(session, departure, { idempotencyKey: 'double-tap-1234' });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().data.reference).toBe(first.json().data.reference);
    expect(second.json().meta.replayed).toBe(true);
    expect(await Booking.countDocuments({})).toBe(1);
  });

  it('refuses a departure that is no longer running', async () => {
    const session = await signUp();
    const departure = await makeDeparture({ status: 'cancelled' });

    const response = await requestFixed(session, departure);
    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/no longer running/i);
  });

  it('refuses more travellers than a managed departure can hold', async () => {
    const session = await signUp();
    const departure = await makeDeparture({ capacity: 4, seatsBooked: 3, confirmationMode: 'managed' });

    const response = await requestFixed(session, departure, { travellerCount: 3 });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/only 1 seat/i);
  });

  it('accepts a request against an on-request departure regardless of the seat count', async () => {
    const session = await signUp();
    /* The number on an `on_request` departure is our guess, not the
     * supplier's. Refusing on it would turn an unknown into a false no — the
     * desk should see the request and go and ask. */
    const departure = await makeDeparture({
      capacity: 4,
      seatsBooked: 4,
      confirmationMode: 'on_request',
    });

    const response = await requestFixed(session, departure, { travellerCount: 2 });
    expect(response.statusCode).toBe(201);
  });
});

describe('requesting a custom trip', () => {
  it('takes a wish rather than a fixed date', async () => {
    const session = await signUp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers: session.headers,
      payload: {
        kind: 'custom',
        travellerCount: 4,
        startDate: '2027-06-15',
        dateFlexibilityDays: 7,
        preferences: {
          destinations: ['Spiti', 'Kinnaur'],
          budgetRange: '₹20,000–30,000 per person',
          specialRequests: 'Two of us are vegetarian.',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const booking = response.json().data;
    expect(booking.kind).toBe('custom');
    expect(booking.dateFlexibilityDays).toBe(7);
    expect(booking.preferences.destinations).toEqual(['Spiti', 'Kinnaur']);
    /* Nothing is charged and nothing is priced. */
    expect(booking.paymentStatus).toBe('UNPAID');
    expect(booking.totalAmount).toBe(0);
  });

  it('refuses a request with no travellers', async () => {
    const session = await signUp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers: session.headers,
      payload: { kind: 'custom', travellerCount: 0 },
    });
    expect(response.statusCode).toBe(422);
  });

  it('ignores a price if the client tries to send one', async () => {
    const session = await signUp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/bookings',
      headers: session.headers,
      payload: {
        kind: 'custom',
        travellerCount: 2,
        /* Not in the schema, so it never reaches the model. A booking body
         * that could carry a price is one somebody will use to set one. */
        totalAmount: 1,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.totalAmount).toBe(0);
    expect(response.json().data.status).toBe('REQUESTED');
    expect(response.json().data.paymentStatus).toBe('UNPAID');
  });
});

describe('one customer cannot see another', () => {
  it('refuses a booking belonging to somebody else', async () => {
    const mine = await signUp('mine@example.com');
    const theirs = await signUp('theirs@example.com');
    const departure = await makeDeparture();

    const booking = (await requestFixed(theirs, departure)).json().data;

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: mine.headers,
    });

    expect(response.statusCode).toBe(404);
    /* Indistinguishable from a booking that does not exist, so the id space
     * cannot be probed to find out whose is whose. */
    expect(response.json().error.message).toMatch(/not found/i);
  });

  it('finds a booking by its reference, still only your own', async () => {
    const mine = await signUp('ref-mine@example.com');
    const theirs = await signUp('ref-theirs@example.com');
    const departure = await makeDeparture();

    const booking = (await requestFixed(mine, departure)).json().data;

    /* The reference is what is in their email, so a link in a notification
     * should work without first looking up an id. */
    const own = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking.reference}`,
      headers: mine.headers,
    });
    expect(own.statusCode).toBe(200);
    expect(own.json().data.reference).toBe(booking.reference);

    /* Typed the way a person would, hyphens dropped and lower case. */
    const sloppy = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking.reference.replace(/-/g, '').toLowerCase()}`,
      headers: mine.headers,
    });
    expect(sloppy.statusCode).toBe(200);

    /* Short enough to be worth guessing at, so it stays owner-scoped. */
    const stranger = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking.reference}`,
      headers: theirs.headers,
    });
    expect(stranger.statusCode).toBe(404);
  });

  it('lists only your own', async () => {
    const mine = await signUp('mine2@example.com');
    const theirs = await signUp('theirs2@example.com');
    const departure = await makeDeparture();

    await requestFixed(mine, departure);
    await requestFixed(theirs, departure);
    await requestFixed(theirs, departure);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/account/bookings',
      headers: mine.headers,
    });

    expect(response.json().meta.total).toBe(1);
  });

  it('refuses everything to someone not signed in', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/account/bookings'],
      ['POST', '/api/v1/account/bookings'],
    ]) {
      const response = await app.inject({ method, url, payload: {} });
      expect(response.statusCode).toBe(401);
    }
  });
});

describe('the dashboard never flatters the numbers', () => {
  it('does not count a rejected or cancelled request as upcoming', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const live = (await requestFixed(session, departure)).json().data;
    const refused = (await requestFixed(session, departure)).json().data;

    await Booking.updateOne({ _id: live._id }, { $set: { status: 'CONFIRMED', tripStatus: 'UPCOMING' } });
    await Booking.updateOne({ _id: refused._id }, { $set: { status: 'REJECTED' } });

    const upcoming = await app.inject({
      method: 'GET',
      url: '/api/v1/account/bookings?scope=upcoming',
      headers: session.headers,
    });

    expect(upcoming.json().meta.total).toBe(1);
    expect(upcoming.json().data[0].reference).toBe(live.reference);
  });

  it('separates pending requests from confirmed trips', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const pending = (await requestFixed(session, departure)).json().data;
    const confirmed = (await requestFixed(session, departure)).json().data;
    await Booking.updateOne({ _id: confirmed._id }, { $set: { status: 'CONFIRMED' } });

    const pendingList = await app.inject({
      method: 'GET',
      url: '/api/v1/account/bookings?scope=pending',
      headers: session.headers,
    });

    expect(pendingList.json().meta.total).toBe(1);
    expect(pendingList.json().data[0].reference).toBe(pending.reference);
  });
});

describe('asking to cancel', () => {
  it('records the request without cancelling anything', async () => {
    const session = await signUp();
    const departure = await makeDeparture();
    const booking = (await requestFixed(session, departure)).json().data;

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking._id}/cancellation`,
      headers: session.headers,
      payload: { reason: 'Work came up.' },
    });

    expect(response.statusCode).toBe(200);
    /* What comes back depends on terms and on what suppliers release — both
     * human decisions. The button records, the desk decides. */
    expect(response.json().data.status).toBe('REQUESTED');
    expect(response.json().data.cancellationRequestedAt).toBeTruthy();
  });

  it('refuses a second request for the same booking', async () => {
    const session = await signUp();
    const departure = await makeDeparture();
    const booking = (await requestFixed(session, departure)).json().data;

    const url = `/api/v1/account/bookings/${booking._id}/cancellation`;
    await app.inject({ method: 'POST', url, headers: session.headers, payload: {} });
    const second = await app.inject({ method: 'POST', url, headers: session.headers, payload: {} });

    expect(second.statusCode).toBe(400);
  });
});

describe('history cannot be rewritten', () => {
  it('refuses to update or delete a booking event', async () => {
    const session = await signUp();
    const departure = await makeDeparture();
    const booking = (await requestFixed(session, departure)).json().data;

    const event = await BookingEvent.findOne({ booking: booking._id });
    expect(event).not.toBeNull();

    /* The guard is on the model rather than left to convention, because a
     * convention is what gets forgotten by somebody in a hurry. */
    await expect(
      BookingEvent.updateOne({ _id: event._id }, { $set: { title: 'Rewritten' } }),
    ).rejects.toThrow(/append-only/i);

    await expect(BookingEvent.deleteOne({ _id: event._id })).rejects.toThrow(/append-only/i);
  });
});

describe('the booking and its first event commit together', () => {
  it('leaves no booking behind when the event cannot be written', async () => {
    const session = await signUp();
    const departure = await makeDeparture();

    const before = await Booking.countDocuments({});

    /* Force the event write to fail inside the transaction. If the two were
     * not atomic, a booking would survive with no history — a reservation
     * whose story starts in the middle. */
    const original = BookingEvent.create;
    BookingEvent.create = () => Promise.reject(new Error('simulated event failure'));

    try {
      await requestFixed(session, departure);
    } catch {
      /* The route surfaces a 500; what matters is the database. */
    } finally {
      BookingEvent.create = original;
    }

    expect(await Booking.countDocuments({})).toBe(before);
  });
});
