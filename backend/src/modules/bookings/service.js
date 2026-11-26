import mongoose from 'mongoose';
import { Booking, CLOSED_STATUSES } from '../../models/Booking.js';
import { Departure } from '../../models/Departure.js';
import { Customer } from '../../models/Customer.js';
import { uniqueReference, normaliseReference } from '../../services/bookingReference.js';
import { isTripOpenNow } from '../../config/catalogue.js';
import { recordEvent, customerTimeline, pendingCustomerAction } from '../../services/bookingEvents.js';
import { notFound, badRequest, conflict } from '../../lib/errors.js';
import { logger } from '../../config/logger.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';

/*
 * Creating and reading reservations.
 *
 * THE INVARIANT EVERYTHING HERE PROTECTS
 *
 * A new booking is a request, not a trip. It is created `REQUESTED` and
 * `UNPAID`, nothing is held, nothing is promised, and the first event on its
 * timeline says so in words. Availability on these routes depends on a human
 * ringing a guesthouse, so a system that implies otherwise sets a traveller
 * up to book flights against a trip that was never on.
 */

/* Fields a customer may set. Anything else in the body is ignored rather than
 * trusted — status, amounts and assignment are ours. */
function buildPreferences(input = {}) {
  return {
    roomSharing: input.roomSharing ?? null,
    roomsRequested: input.roomsRequested ?? null,
    pickupPoint: input.pickupPoint ?? null,
    transport: input.transport ?? null,
    accommodation: input.accommodation ?? null,
    budgetRange: input.budgetRange ?? null,
    destinations: input.destinations ?? [],
    durationDays: input.durationDays ?? null,
    addOns: input.addOns ?? [],
    specialRequests: input.specialRequests ?? null,
  };
}

/*
 * Create a reservation request.
 *
 * Idempotent on `idempotencyKey`: a double-tapped button or a retry after a
 * flaky connection returns the booking already created rather than a second
 * one. The unique index is the real guarantee — the lookup below just avoids
 * relying on an error path for the common case.
 */
export async function createBooking({ customerId, body, requestMeta = {} }) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw notFound('Account');

  /*
   * Refuse a trip we are not selling.
   *
   * The site hides the booking controls on a closed trip, but that is
   * presentation: the endpoint is still one POST away, and a stale tab from
   * before a trip closed would otherwise book it. Checked before the
   * idempotency lookup so a replayed key cannot smuggle one through either.
   *
   * A custom request carries no slug and is always allowed — somebody asking
   * about a region we have not opened is the demand we most want to hear.
   */
  if (!(await isTripOpenNow(body.trip?.slug))) {
    throw conflict(
      'We are not taking bookings for this trip at the moment. Ask us and we will tell you when it opens.',
    );
  }

  if (body.idempotencyKey) {
    const existing = await Booking.findOne({
      customer: customerId,
      idempotencyKey: body.idempotencyKey,
    });
    if (existing) {
      return { booking: existing, replayed: true };
    }
  }

  /*
   * A fixed departure is validated against a real record. Without this a
   * customer could request any date for any trip and the desk would be
   * chasing something that was never on the calendar.
   */
  let departure = null;
  if (body.kind === 'fixed_departure') {
    if (!body.departureId) throw badRequest('Choose a departure date.');

    departure = await Departure.findById(body.departureId);
    if (!departure) throw notFound('Departure');
    if (['cancelled', 'departed'].includes(departure.status)) {
      throw conflict('That departure is no longer running. Please choose another date.');
    }

    /*
     * Capacity is checked here only where it means something. On an
     * `on_request` departure the number is our guess, not the supplier's, so
     * refusing a request on it would turn an unknown into a false no — the
     * desk should see the request and go and ask.
     */
    if (departure.confirmationMode === 'managed' && departure.seatsAvailable < body.travellerCount) {
      throw conflict(
        departure.seatsAvailable === 0
          ? 'That departure is full. Please choose another date.'
          : `Only ${departure.seatsAvailable} seat(s) remain on that departure.`,
      );
    }
  }

  const reference = await uniqueReference();

  /*
   * The booking and its first event are written together. A reservation with
   * no record of being submitted is one whose history starts in the middle,
   * and the timeline the customer sees is built from these rows.
   */
  const session = await mongoose.startSession();
  let booking;

  try {
    await session.withTransaction(async () => {
      const [created] = await Booking.create(
        [
          {
            reference,
            customer: customer._id,
            kind: body.kind,
            trip: {
              slug: body.trip?.slug ?? null,
              title: body.trip?.title ?? null,
              destination: body.trip?.destination ?? null,
              durationLabel: body.trip?.durationLabel ?? null,
              imageUrl: body.trip?.imageUrl ?? null,
            },
            departure: departure?._id ?? null,
            startDate: body.startDate ?? departure?.startDate ?? null,
            endDate: body.endDate ?? departure?.endDate ?? null,
            dateFlexibilityDays: body.dateFlexibilityDays ?? 0,
            travellerCount: body.travellerCount,
            travellers: body.travellers ?? [],
            /* Copied from the profile, not referenced: a later profile edit
             * must not rewrite the contact details on a trip under way. */
            contact: {
              name: body.contact?.name ?? customer.name,
              email: body.contact?.email ?? customer.email,
              phone: body.contact?.phone ?? customer.phone,
            },
            preferences: buildPreferences(body.preferences),
            status: 'REQUESTED',
            paymentStatus: 'UNPAID',
            currency: departure?.currency ?? 'INR',
            /* Deliberately zero. There is no agreed price until a quotation
             * is accepted, and seeding this with a headline figure would make
             * a request look like an invoice. */
            totalAmount: 0,
            idempotencyKey: body.idempotencyKey ?? null,
            sourceLead: body.sourceLead ?? null,
          },
        ],
        { session },
      );

      booking = created;

      await recordEvent({
        booking: created._id,
        type: 'request.submitted',
        actorKind: 'customer',
        actor: customer._id,
        actorName: customer.name,
        customerVisible: true,
        statusTo: 'REQUESTED',
        meta: { reference, kind: body.kind },
        session,
      });
    });
  } catch (error) {
    /* Two requests racing on the same idempotency key: the index refused the
     * second, so return the first rather than an error the customer cannot
     * act on. */
    if (error?.code === 11000 && body.idempotencyKey) {
      const existing = await Booking.findOne({
        customer: customerId,
        idempotencyKey: body.idempotencyKey,
      });
      if (existing) return { booking: existing, replayed: true };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  logger.info(
    { reference, customerId: String(customer._id), kind: body.kind },
    'booking request created',
  );

  /*
   * Queued after the transaction has committed, never inside it.
   *
   * Two reasons. A job enqueued inside a transaction that then rolls back
   * would send an acknowledgement for a booking that does not exist. And
   * `enqueue` is deliberately non-throwing — a Redis outage must not fail a
   * reservation that is already safely saved — so awaiting it inside the
   * transaction would buy nothing and lengthen the lock.
   *
   * If the queue is down the booking still stands; the outbox sweeper picks
   * the notification up later.
   */
  await Promise.all([
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.bookingRequestCustomer, {
      bookingId: String(booking._id),
    }),
    enqueue(QUEUE_NAMES.notifications, JOB_NAMES.bookingRequestAdmin, {
      bookingId: String(booking._id),
    }),
  ]);

  return { booking, replayed: false };
}

/*
 * One customer's bookings.
 *
 * `scope` splits them the way the dashboard does. "Upcoming" deliberately
 * excludes rejected, cancelled and expired ones — counting a refused request
 * as an upcoming trip is the single most misleading thing a travel dashboard
 * can do.
 */
export async function listCustomerBookings(customerId, { scope = 'all', page = 1, pageSize = 20 } = {}) {
  const filter = { customer: customerId };

  if (scope === 'pending') {
    filter.status = { $in: ['REQUESTED', 'AVAILABILITY_CHECK', 'QUOTED', 'AWAITING_PAYMENT'] };
  } else if (scope === 'upcoming') {
    filter.status = 'CONFIRMED';
    filter.tripStatus = { $in: ['UPCOMING', 'IN_PROGRESS'] };
  } else if (scope === 'completed') {
    filter.status = 'COMPLETED';
  } else if (scope === 'cancelled') {
    filter.status = { $in: ['REJECTED', 'CANCELLED', 'EXPIRED'] };
  }

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select('-internalNotes'),
    Booking.countDocuments(filter),
  ]);

  return {
    items: items.map((booking) => booking.toCustomerJSON()),
    total,
    page,
    pageSize,
  };
}

/*
 * One booking, with its timeline — but only if it belongs to the caller.
 *
 * Ownership is part of the query rather than a check after loading. A filter
 * that cannot match somebody else's row is harder to get wrong than an `if`
 * that somebody has to remember, and it means a wrong id and a stranger's id
 * are indistinguishable in the response.
 */
export async function getCustomerBooking(customerId, idOrReference) {
  /*
   * Ownership is part of the query, not a check after loading. A filter that
   * cannot match somebody else's row is harder to get wrong than an `if`, and
   * it makes a wrong id and a stranger's id indistinguishable in the reply.
   */
  const byReference = !/^[a-f0-9]{24}$/i.test(idOrReference);
  const match = byReference
    ? { reference: normaliseReference(idOrReference) ?? ' ' }
    : { _id: idOrReference };

  const booking = await Booking.findOne({ ...match, customer: customerId }).select(
    '-internalNotes',
  );
  if (!booking) throw notFound('Booking');

  const [timeline, nextAction] = await Promise.all([
    customerTimeline(booking._id),
    pendingCustomerAction(booking._id),
  ]);

  return { booking: booking.toCustomerJSON(), timeline, nextAction };
}

/*
 * A customer asking to cancel.
 *
 * This records the request; it does not cancel anything. Refunds depend on
 * the terms they accepted and on what suppliers will give back, and both are
 * decisions a person makes. Letting the button cancel outright would either
 * promise a refund nobody has agreed to or quietly give none.
 */
export async function requestCancellation(customerId, idOrReference, { reason } = {}) {
  const byReference = !/^[a-f0-9]{24}$/i.test(idOrReference);
  const match = byReference
    ? { reference: normaliseReference(idOrReference) ?? ' ' }
    : { _id: idOrReference };

  const booking = await Booking.findOne({ ...match, customer: customerId });
  if (!booking) throw notFound('Booking');

  if (CLOSED_STATUSES.includes(booking.status)) {
    throw badRequest('This booking is already closed.');
  }
  if (booking.cancellationRequestedAt) {
    throw badRequest('We already have your cancellation request and are looking at it.');
  }

  booking.cancellationRequestedAt = new Date();
  await booking.save();

  await recordEvent({
    booking: booking._id,
    type: 'customer.message',
    title: 'Cancellation requested',
    description:
      'We have your request and will come back to you with what the terms mean for your booking.',
    actorKind: 'customer',
    actor: customerId,
    customerVisible: true,
    meta: { reason: reason ?? null },
  });

  return booking.toCustomerJSON();
}
