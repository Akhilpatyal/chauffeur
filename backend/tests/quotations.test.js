import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Booking } from '../src/models/Booking.js';
import { Quotation } from '../src/models/Quotation.js';
import { BookingEvent } from '../src/models/BookingEvent.js';
import { Departure } from '../src/models/Departure.js';
import { DEFAULT_OPEN_TRIP_SLUGS } from '../src/config/catalogue.js';

/*
 * Quotations: the step that puts a price on a booking.
 *
 * The tests that matter here are about money and about what a customer is
 * shown. A booking must not acquire a price until somebody agreed to one; an
 * agreed price must not be able to change underneath them; and our supplier
 * costs must never reach the customer by any route.
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

async function signUp() {
  addressCounter += 1;
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/register',
    headers: { 'x-forwarded-for': freshAddress() },
    payload: {
      name: 'Quote Tester',
      email: `q${Date.now()}${addressCounter}@example.com`,
      password: 'correct-horse-battery',
    },
  });
  if (response.statusCode !== 201) throw new Error(`sign-up failed: ${response.body}`);
  return {
    id: response.json().data.customer.id ?? response.json().data.customer._id,
    headers: { authorization: `Bearer ${response.json().data.accessToken}` },
  };
}

/* The desk, signed in. The shared helper owns password hashing so this file
 * cannot drift from how accounts are really created. */
async function signInAdmin() {
  const session = await signIn(app);
  return { headers: { authorization: `Bearer ${session.accessToken}` } };
}

async function makeBooking(session) {
  const departure = await Departure.create({
    tripSlug: OPEN_SLUG,
    startDate: new Date('2027-07-05'),
    endDate: new Date('2027-07-10'),
    capacity: 12,
    minimumGroupSize: 6,
    pricePerPerson: 1499900,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/account/bookings',
    headers: session.headers,
    payload: {
      kind: 'fixed_departure',
      departureId: String(departure._id),
      travellerCount: 2,
      trip: { slug: OPEN_SLUG, title: 'Open Trip' },
    },
  });
  if (response.statusCode !== 201) throw new Error(`booking failed: ${response.body}`);
  return response.json().data;
}

/* Two nights at ₹6,000 plus a ₹2,000 permit = ₹14,000. Deliberately simple
 * arithmetic, so a wrong total is obvious rather than arguable. */
const ITEMS = [
  { label: 'Accommodation', category: 'accommodation', quantity: 2, unitLabel: 'nights', unitAmount: 600000, vendorCost: 400000 },
  { label: 'Inner line permit', category: 'permit', quantity: 1, unitAmount: 200000 },
];

async function draftFor(admin, bookingId, overrides = {}) {
  const response = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/reservations/${bookingId}/quotations`,
    headers: admin.headers,
    payload: { items: ITEMS, advanceAmount: 400000, ...overrides },
  });
  if (response.statusCode !== 201) throw new Error(`draft failed: ${response.body}`);
  return response.json().data;
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

describe('pricing a booking', () => {
  it('derives the total from the lines rather than trusting a caller', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    /* A caller passing its own totals must not be able to make the total
     * disagree with the lines the customer is shown. */
    const quotation = await draftFor(admin, booking._id, {
      totalAmount: 1,
      subtotal: 1,
    });

    expect(quotation.subtotal).toBe(1400000);
    expect(quotation.totalAmount).toBe(1400000);
    expect(quotation.version).toBe(1);
    expect(quotation.status).toBe('draft');
  });

  it('leaves the booking unpriced until the customer accepts', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);

    /* A draft changes nothing. */
    let current = await Booking.findById(booking._id);
    expect(current.totalAmount).toBe(0);
    expect(current.status).toBe('REQUESTED');

    const sent = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });
    expect(sent.statusCode).toBe(200);

    /* Sending is an offer, not an agreement: the booking moves but the money
     * does not. */
    current = await Booking.findById(booking._id);
    expect(current.status).toBe('QUOTED');
    expect(current.totalAmount).toBe(0);

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking.reference}/quotations/${quotation._id}/accept`,
      headers: session.headers,
    });
    expect(accepted.statusCode).toBe(200);

    current = await Booking.findById(booking._id);
    expect(current.totalAmount).toBe(1400000);
    expect(current.advanceAmount).toBe(400000);
    expect(current.status).toBe('AWAITING_PAYMENT');
    /* The pointer is stored, so "agreed to what exactly" is answerable. */
    expect(String(current.acceptedQuotation)).toBe(String(quotation._id));
  });

  it('gets the total and the deposit right on the very first save', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    /* A regression guard. Mongoose validates subdocuments as part of
     * validating the parent, so the parent's total ran before any line had
     * been costed: a freshly created quotation totalled zero, and the
     * deposit was then clamped to zero against that total. It corrected
     * itself on the next save, which is exactly what made it easy to miss. */
    const quotation = await draftFor(admin, booking._id);

    expect(quotation.subtotal).toBe(1400000);
    expect(quotation.totalAmount).toBe(1400000);
    expect(quotation.advanceAmount).toBe(400000);
    expect(quotation.items.map((item) => item.amount)).toEqual([1200000, 200000]);
  });

  it('refuses a deposit larger than the trip', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id, { advanceAmount: 99999900 });

    /* Clamped rather than accepted: a deposit bigger than the total is a
     * typo, and catching it costs less than refunding it. */
    expect(quotation.advanceAmount).toBe(quotation.totalAmount);
  });
});

describe('versions are never rewritten', () => {
  it('supersedes the previous offer instead of editing it', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const first = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${first._id}/send`,
      headers: admin.headers,
    });

    const second = await draftFor(admin, booking._id, {
      items: [{ label: 'Accommodation', category: 'accommodation', quantity: 2, unitAmount: 500000 }],
      revisionReason: 'Cheaper guesthouse found.',
    });

    expect(second.version).toBe(2);

    const reloaded = await Quotation.findById(first._id);
    expect(reloaded.status).toBe('superseded');
    /* The old numbers survive intact — that is the whole point. */
    expect(reloaded.totalAmount).toBe(1400000);
  });

  it('refuses to edit a quotation that has been sent', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });

    const edit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/quotations/${quotation._id}`,
      headers: admin.headers,
      payload: { items: [{ label: 'Surprise fee', unitAmount: 9900000 }] },
    });

    expect(edit.statusCode).toBe(409);
  });

  it('does not let an expired offer be accepted', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });

    await Quotation.updateOne(
      { _id: quotation._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking._id}/quotations/${quotation._id}/accept`,
      headers: session.headers,
    });

    expect(accepted.statusCode).toBe(409);

    /* And the booking is still unpriced, which is the part that matters. */
    const current = await Booking.findById(booking._id);
    expect(current.totalAmount).toBe(0);
  });
});

describe('what the customer may see', () => {
  it('never shows a draft, and never shows our supplier costs', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);

    let visible = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking.reference}/quotations`,
      headers: session.headers,
    });
    expect(visible.json().data).toHaveLength(0);

    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });

    visible = await app.inject({
      method: 'GET',
      url: `/api/v1/account/bookings/${booking.reference}/quotations`,
      headers: session.headers,
    });
    const [published] = visible.json().data;
    expect(published.version).toBe(1);

    /* Margin is ours. Checked on the serialised body so a cost leaking under
     * any key is caught — but by field name, not by value: the earlier
     * version of this assertion looked for the cost "400000" and matched the
     * total "1400000", so it would have failed on a correct response. */
    expect(visible.body).not.toContain('vendorCost');
    for (const item of published.items) {
      expect(item).not.toHaveProperty('vendorCost');
    }
  });

  it('refuses a quotation on somebody else’s booking', async () => {
    const mine = await signUp();
    const theirs = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(theirs);

    const quotation = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });

    const stolen = await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking._id}/quotations/${quotation._id}/accept`,
      headers: mine.headers,
    });

    /* 404, not 403: an outsider should not be able to tell "exists, not
     * yours" from "does not exist". */
    expect(stolen.statusCode).toBe(404);
  });
});

describe('declining', () => {
  it('records the refusal without closing the booking', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });

    const declined = await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking.reference}/quotations/${quotation._id}/respond`,
      headers: session.headers,
      payload: { outcome: 'decline', message: 'Over our budget.' },
    });

    expect(declined.statusCode).toBe(200);
    expect(declined.json().data.status).toBe('declined');

    /* Still open: somebody who refuses a price is usually still a customer. */
    const current = await Booking.findById(booking._id);
    expect(current.status).toBe('QUOTED');
    expect(current.closedAt ?? null).toBeNull();

    const event = await BookingEvent.findOne({
      booking: booking._id,
      type: 'quotation.declined',
    });
    expect(event).not.toBeNull();
    expect(event.description).toBe('Over our budget.');
  });
});

describe('the timeline records what happened', () => {
  it('opens with the quotation being sent and accepted', async () => {
    const session = await signUp();
    const admin = await signInAdmin();
    const booking = await makeBooking(session);

    const quotation = await draftFor(admin, booking._id);
    await app.inject({
      method: 'POST',
      url: `/api/v1/admin/quotations/${quotation._id}/send`,
      headers: admin.headers,
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/account/bookings/${booking._id}/quotations/${quotation._id}/accept`,
      headers: session.headers,
    });

    const types = (await BookingEvent.find({ booking: booking._id })).map((e) => e.type);
    expect(types).toContain('quotation.sent');
    expect(types).toContain('quotation.accepted');
  });
});
