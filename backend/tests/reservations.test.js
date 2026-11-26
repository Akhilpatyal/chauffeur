import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Booking } from '../src/models/Booking.js';
import { BookingEvent } from '../src/models/BookingEvent.js';
import { Departure } from '../src/models/Departure.js';
import { DEFAULT_OPEN_TRIP_SLUGS } from '../src/config/catalogue.js';
import { VendorAllocation } from '../src/models/VendorAllocation.js';

/*
 * The desk's side of a reservation.
 *
 * The important tests here are the refusals: a status that cannot legally be
 * reached, a confirmation attempted while a supplier has not answered, and an
 * internal note leaking to a customer. Each is a failure that produces a
 * traveller standing outside a guesthouse that has never heard of them.
 */
/* Whichever trip the catalogue is currently selling, rather than a slug
 * written out here. These suites are about booking mechanics and the slug is
 * incidental — but it has to be one the API will accept, and hardcoding one
 * broke all three of them the day the open list narrowed to Bir Billing.
 * catalogue.test.js owns the question of which trips are open. */
const OPEN_SLUG = DEFAULT_OPEN_TRIP_SLUGS[0];

let app;
let addressCounter = 0;

const freshAddress = () => {
  addressCounter += 1;
  return `198.51.100.${addressCounter % 250}`;
};

async function signUpCustomer(email = `c${Date.now()}${addressCounter}@example.com`) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/register',
    headers: { 'x-forwarded-for': freshAddress() },
    payload: { name: 'Test Traveller', email, password: 'correct-horse-battery' },
  });
  return { headers: { authorization: `Bearer ${response.json().data.accessToken}` } };
}

/*
 * A distinct date per departure.
 *
 * The schema enforces one run per trip per start date — which is right, and
 * stops a double-entered departure splitting its bookings across two records.
 * A fixture that reuses the same date therefore collides with itself, so each
 * one steps a day forward.
 */
let departureDay = 0;
const makeDeparture = () => {
  departureDay += 1;
  const start = new Date('2027-06-01T00:00:00Z');
  start.setUTCDate(start.getUTCDate() + departureDay);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 5);

  return Departure.create({
    tripSlug: OPEN_SLUG,
    startDate: start,
    endDate: end,
    capacity: 12,
    pricePerPerson: 1499900,
  });
};

async function makeBooking() {
  const customer = await signUpCustomer();
  const departure = await makeDeparture();
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/bookings',
    headers: customer.headers,
    payload: {
      kind: 'fixed_departure',
      departureId: String(departure._id),
      travellerCount: 2,
      trip: { slug: OPEN_SLUG, title: 'Open Trip' },
    },
  });
  return { booking: response.json().data, customer };
}

const move = (session, id, body) =>
  app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/reservations/${id}/status`,
    headers: session.authHeader,
    payload: body,
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
});

describe('the pipeline', () => {
  it('lists reservations with counts per stage', async () => {
    const session = await signIn(app);
    await makeBooking();
    await makeBooking();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().meta.total).toBe(2);
    expect(response.json().meta.counts.REQUESTED).toBe(2);
  });

  it('filters to the new-requests view', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();
    await makeBooking();
    await Booking.updateOne({ _id: booking._id }, { $set: { status: 'QUOTED' } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations?view=new',
      headers: session.authHeader,
    });

    expect(response.json().meta.total).toBe(1);
  });

  it('finds a booking by its reference', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/reservations?search=${booking.reference}`,
      headers: session.authHeader,
    });

    expect(response.json().meta.total).toBe(1);
    expect(response.json().data[0].reference).toBe(booking.reference);
  });

  it('surfaces the cancellation requests nobody has answered', async () => {
    const session = await signIn(app);
    const { booking, customer } = await makeBooking();
    await makeBooking();

    await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking._id}/cancellation`,
      headers: customer.headers,
      payload: { reason: 'Plans changed.' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations?view=cancellation_requested',
      headers: session.authHeader,
    });

    /* The easiest queue to forget, so it gets its own view. */
    expect(response.json().meta.total).toBe(1);
    expect(response.json().data[0].reference).toBe(booking.reference);
  });
});

describe('moving a booking through its lifecycle', () => {
  it('walks the happy path', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    for (const to of ['AVAILABILITY_CHECK', 'QUOTED', 'AWAITING_PAYMENT']) {
      const response = await move(session, booking._id, { to });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.status).toBe(to);
    }
  });

  it('refuses a move the lifecycle does not allow', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    /* Straight from a request to confirmed, skipping availability, a
     * quotation and payment. */
    const response = await move(session, booking._id, { to: 'CONFIRMED' });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/cannot go from/i);
    expect((await Booking.findById(booking._id)).status).toBe('REQUESTED');
  });

  it('refuses to reopen a closed booking', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await move(session, booking._id, { to: 'REJECTED', reason: 'No rooms in Kaza those dates.' });
    const reopen = await move(session, booking._id, { to: 'QUOTED' });

    expect(reopen.statusCode).toBe(409);
  });

  it('demands a reason before rejecting', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    const noReason = await move(session, booking._id, { to: 'REJECTED' });
    expect(noReason.statusCode).toBe(400);
    expect(noReason.json().error.message).toMatch(/give a reason/i);

    const withReason = await move(session, booking._id, {
      to: 'REJECTED',
      reason: 'Kunzum La is still closed on those dates.',
    });
    expect(withReason.statusCode).toBe(200);
  });

  it('shows the rejection reason to the customer', async () => {
    const session = await signIn(app);
    const { booking, customer } = await makeBooking();

    await move(session, booking._id, {
      to: 'REJECTED',
      reason: 'Kunzum La is still closed on those dates.',
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: customer.headers,
    });

    const { timeline } = detail.json().meta;
    const rejection = timeline.find((e) => e.type === 'booking.rejected');
    /* A refusal the customer cannot understand generates a phone call. */
    expect(rejection.description).toMatch(/Kunzum La/);
  });

  it('records every transition in the history', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await move(session, booking._id, { to: 'AVAILABILITY_CHECK' });
    await move(session, booking._id, { to: 'QUOTED' });

    const events = await BookingEvent.find({ booking: booking._id }).sort({ createdAt: 1 }).lean();
    const transitions = events.filter((e) => e.statusTo);

    expect(transitions.map((e) => e.statusTo)).toEqual([
      'REQUESTED',
      'AVAILABILITY_CHECK',
      'QUOTED',
    ]);
    /* Both sides recorded, so the history reconstructs without replaying
     * business rules. */
    expect(transitions[1].statusFrom).toBe('REQUESTED');
  });
});

describe('confirming is not the same as being paid', () => {
  it('refuses to confirm while a supplier has not answered', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await move(session, booking._id, { to: 'AVAILABILITY_CHECK' });
    await move(session, booking._id, { to: 'QUOTED' });
    await move(session, booking._id, { to: 'AWAITING_PAYMENT' });

    /* Deposit paid in full... */
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { advanceAmount: 500000, paidAmount: 500000 } },
    );
    /* ...but the guesthouse has not confirmed. */
    await VendorAllocation.create({
      booking: booking._id,
      vendorName: 'Kaza guesthouse',
      service: 'accommodation',
      detail: '2 twin rooms, nights 2-3',
      status: 'REQUESTED',
    });

    const response = await move(session, booking._id, { to: 'CONFIRMED' });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/unconfirmed/i);
    /* Paying does not make a trip real. */
    expect((await Booking.findById(booking._id)).status).toBe('AWAITING_PAYMENT');
  });

  it('refuses to confirm while the deposit is short', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await move(session, booking._id, { to: 'AVAILABILITY_CHECK' });
    await move(session, booking._id, { to: 'QUOTED' });
    await move(session, booking._id, { to: 'AWAITING_PAYMENT' });
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { advanceAmount: 500000, paidAmount: 100000 } },
    );

    const response = await move(session, booking._id, { to: 'CONFIRMED' });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/deposit/i);
  });

  it('confirms once the money is in and every supplier has said yes', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await move(session, booking._id, { to: 'AVAILABILITY_CHECK' });
    await move(session, booking._id, { to: 'QUOTED' });
    await move(session, booking._id, { to: 'AWAITING_PAYMENT' });
    await Booking.updateOne(
      { _id: booking._id },
      { $set: { advanceAmount: 500000, paidAmount: 500000 } },
    );
    await VendorAllocation.create({
      booking: booking._id,
      vendorName: 'Kaza guesthouse',
      service: 'accommodation',
      detail: '2 twin rooms',
      status: 'CONFIRMED',
      confirmationRef: 'KZ-8891',
    });

    const response = await move(session, booking._id, { to: 'CONFIRMED' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('CONFIRMED');
  });

  it('tells the desk why the confirm button is unavailable', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();
    await VendorAllocation.create({
      booking: booking._id,
      vendorName: 'Driver',
      service: 'transport',
      detail: 'Tempo Traveller, 6 days',
      status: 'REJECTED',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/reservations/${booking._id}`,
      headers: session.authHeader,
    });

    /* Surfaced on the detail so the UI explains rather than letting somebody
     * press a button and get an error. */
    expect(response.json().meta.confirmationBlockers.join(' ')).toMatch(/refused/i);
  });
});

describe('notes', () => {
  it('keeps an internal note away from the customer', async () => {
    const session = await signIn(app);
    const { booking, customer } = await makeBooking();

    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/reservations/${booking._id}/notes`,
      headers: session.authHeader,
      payload: { body: 'Rang the Kaza guesthouse, no answer, try tomorrow.' },
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: customer.headers,
    });

    const text = JSON.stringify(detail.json());
    expect(text).not.toMatch(/no answer/i);
  });

  it('shows a note deliberately addressed to the customer', async () => {
    const session = await signIn(app);
    const { booking, customer } = await makeBooking();

    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/reservations/${booking._id}/notes`,
      headers: session.authHeader,
      payload: {
        body: 'Checking two guesthouses in Kaza — we will know by tomorrow evening.',
        customerVisible: true,
      },
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: customer.headers,
    });

    expect(JSON.stringify(detail.json())).toMatch(/two guesthouses/i);
  });
});

describe('what the desk sees and the customer does not', () => {
  it('returns supplier costs to an admin', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();
    await VendorAllocation.create({
      booking: booking._id,
      vendorName: 'Kaza guesthouse',
      service: 'accommodation',
      detail: '2 twin rooms',
      cost: 800000,
      status: 'CONFIRMED',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/reservations/${booking._id}`,
      headers: session.authHeader,
    });

    expect(response.json().meta.allocations[0].cost).toBe(800000);
  });

  it('never returns supplier costs or allocations to the customer', async () => {
    const { booking, customer } = await makeBooking();
    await VendorAllocation.create({
      booking: booking._id,
      vendorName: 'Kaza guesthouse',
      service: 'accommodation',
      detail: '2 twin rooms',
      cost: 800000,
      status: 'CONFIRMED',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking._id}`,
      headers: customer.headers,
    });

    const text = JSON.stringify(response.json());
    expect(text).not.toMatch(/800000|allocations|Kaza guesthouse/);
  });

  it('refuses the reservations board to a customer token', async () => {
    const customer = await signUpCustomer();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: customer.headers,
    });

    expect([401, 403]).toContain(response.statusCode);
  });

  it('refuses the board to an admin without the permission', async () => {
    await createAdmin({ email: 'caller@taifer.test', role: 'caller' });
    const caller = await signIn(app, { email: 'caller@taifer.test', password: 'correct-horse-battery' });

    /* A caller may view bookings but not move them. */
    const view = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: caller.authHeader,
    });
    expect(view.statusCode).toBe(200);

    const { booking } = await makeBooking();
    const attempt = await move(caller, booking._id, { to: 'AVAILABILITY_CHECK' });
    expect(attempt.statusCode).toBe(403);
  });
});

describe('telling the customer', () => {
  it('emails the customer when their booking moves', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reservations/${booking._id}/status`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { to: 'AVAILABILITY_CHECK', customerVisible: true },
    });

    /* Jobs run inline in tests, so by here the mail has been handled and the
     * attempt is on the record. Before this existed a booking could be
     * confirmed or rejected and the customer would only find out by signing
     * in and looking. */
    const events = await BookingEvent.find({ booking: booking._id });
    expect(events.some((event) => /status email/i.test(event.title))).toBe(true);
  });

  it('drops a status email the booking has already moved past', async () => {
    const session = await signIn(app);
    const { booking } = await makeBooking();
    const headers = { authorization: `Bearer ${session.accessToken}` };

    /*
     * Two moves in quick succession. The handler reloads the booking rather
     * than trusting the payload, which is right for the trip details and
     * wrong for the news: without the guard both jobs rendered whatever the
     * status had become, so the customer got the second email twice and the
     * first one never.
     */
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reservations/${booking._id}/status`,
      headers,
      payload: { to: 'AVAILABILITY_CHECK', customerVisible: true },
    });
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/reservations/${booking._id}/status`,
      headers,
      payload: { to: 'REJECTED', reason: 'No vehicle for these dates.', customerVisible: true },
    });

    const titles = (await BookingEvent.find({ booking: booking._id }))
      .map((event) => event.title)
      .filter((title) => /status email sent/i.test(title));

    /* One per move, and never the same news twice. */
    expect(titles.filter((title) => /REJECTED/.test(title))).toHaveLength(1);
  });
});
