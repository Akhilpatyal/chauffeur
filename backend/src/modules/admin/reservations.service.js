import mongoose from 'mongoose';
import { Booking, CLOSED_STATUSES } from '../../models/Booking.js';
import { VendorAllocation } from '../../models/VendorAllocation.js';
import { Customer } from '../../models/Customer.js';
import { recordEvent, fullTimeline } from '../../services/bookingEvents.js';
import { notFound, badRequest, conflict } from '../../lib/errors.js';
import { leadScopeFilter } from '../../services/access.js';
import { teammateIdsFor } from '../leads/adminService.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';

/*
 * The desk's side of a reservation.
 *
 * TRANSITIONS ARE A TABLE, NOT A PILE OF IFS
 *
 * Nine statuses means seventy-two conceivable moves, most of which are
 * nonsense — a REJECTED booking cannot become AWAITING_PAYMENT, a COMPLETED
 * one cannot go back to QUOTED. Written as checks scattered through route
 * handlers, the illegal ones are prevented only where somebody remembered.
 * Written as a table, the legal ones are the exhaustive list and everything
 * else is refused by default.
 *
 * That default matters more than the individual entries: a status added later
 * is unreachable until somebody deliberately says where it can go, which is
 * the safe direction for a mistake.
 */
const ALLOWED_TRANSITIONS = {
  REQUESTED: ['AVAILABILITY_CHECK', 'QUOTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  AVAILABILITY_CHECK: ['QUOTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REQUESTED'],
  QUOTED: ['AWAITING_PAYMENT', 'QUOTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  AWAITING_PAYMENT: ['CONFIRMED', 'QUOTED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  /* Terminal, with one exception: a customer who comes back after a lapsed
   * quotation should not need a new booking. */
  EXPIRED: ['QUOTED', 'AVAILABILITY_CHECK'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

/* Moves that must carry an explanation. A refusal or cancellation a customer
 * cannot understand generates a phone call and a bad review, and the person
 * answering that call needs to know what was decided and why. */
const REASON_REQUIRED = new Set(['REJECTED', 'CANCELLED']);

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/*
 * The moves legal from a given status, and which of them need an
 * explanation.
 *
 * Published so the admin UI can offer exactly the buttons the server will
 * accept. A second copy of this table in the client would drift from this
 * one, and the copy that drifted would be the one nobody tested — the UI
 * would then offer a move that is refused, which teaches people to distrust
 * every button on the screen.
 */
export function allowedTransitionsFrom(status) {
  return (ALLOWED_TRANSITIONS[status] ?? []).map((to) => ({
    to,
    reasonRequired: REASON_REQUIRED.has(to),
  }));
}

/*
 * Which reservations this admin may see.
 *
 * Reuses the lead scope rules rather than inventing a second set: a team
 * manager who can see their team's enquiries can see their team's bookings,
 * and a caller sees what is assigned to them. Two parallel definitions of
 * "whose records are these" would drift apart, and the one that drifted would
 * be the one nobody tested.
 */
export async function reservationScopeFilter(user) {
  return leadScopeFilter(user, await teammateIdsFor(user));
}

function buildFilter(query = {}) {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.kind) filter.kind = query.kind;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;

  /* The pipeline views the desk actually works from, rather than making
   * somebody assemble a status list each time. */
  if (query.view === 'new') filter.status = 'REQUESTED';
  if (query.view === 'checking') filter.status = 'AVAILABILITY_CHECK';
  if (query.view === 'quoted') filter.status = 'QUOTED';
  if (query.view === 'awaiting_payment') filter.status = 'AWAITING_PAYMENT';
  if (query.view === 'confirmed') filter.status = 'CONFIRMED';
  if (query.view === 'closed') filter.status = { $in: CLOSED_STATUSES };
  if (query.view === 'open') filter.status = { $nin: CLOSED_STATUSES };
  if (query.view === 'departing') {
    filter.status = 'CONFIRMED';
    filter.tripStatus = 'UPCOMING';
  }
  /* Somebody has asked to cancel and nobody has answered yet — the view most
   * likely to be forgotten, so it gets its own. */
  if (query.view === 'cancellation_requested') {
    filter.cancellationRequestedAt = { $ne: null };
    filter.status = { $nin: CLOSED_STATUSES };
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  if (query.departingFrom || query.departingTo) {
    filter.startDate = {};
    if (query.departingFrom) filter.startDate.$gte = query.departingFrom;
    if (query.departingTo) filter.startDate.$lte = query.departingTo;
  }

  if (query.search) {
    /* Escaped: a reference or a name containing regex punctuation should be
     * searched for literally rather than compiled into a pattern. */
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(safe, 'i');
    filter.$or = [
      { reference: pattern },
      { 'contact.name': pattern },
      { 'contact.email': pattern },
      { 'trip.title': pattern },
    ];
  }

  return filter;
}

export async function listReservations(query, user) {
  const scope = await reservationScopeFilter(user);
  const requested = buildFilter(query);
  const filter = Object.keys(scope).length > 0 ? { $and: [scope, requested] } : requested;

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;

  const [items, total, counts] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email')
      .lean(),
    Booking.countDocuments(filter),
    /* The pipeline counts, computed under the same scope so a team manager's
     * tabs add up to their own list rather than the whole company's. */
    Booking.aggregate([
      { $match: Object.keys(scope).length > 0 ? scope : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
  };
}

/*
 * One reservation in full, for the desk.
 *
 * Everything the customer sees plus what they do not: internal notes, vendor
 * allocations with their costs, and the complete event history rather than
 * the published subset.
 */
export async function getReservation(id, user) {
  const scope = await reservationScopeFilter(user);
  const booking = await Booking.findOne({
    $and: [{ _id: id }, Object.keys(scope).length > 0 ? scope : {}],
  })
    .select('+internalNotes')
    .populate('customer', 'name email phone emergencyContact')
    .populate('assignedTo', 'name email');

  /* Same message as a missing booking: an admin outside the scope should not
   * be able to tell "exists, not yours" from "does not exist". */
  if (!booking) throw notFound('Booking');

  const [timeline, allocations] = await Promise.all([
    fullTimeline(booking._id),
    VendorAllocation.find({ booking: booking._id })
      .select('+cost +notes')
      .populate('vendor', 'name contact reliability')
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return { booking: booking.toObject({ virtuals: true }), timeline, allocations };
}

/*
 * Move a booking from one status to another.
 *
 * The single path through which status changes. Everything it guards —
 * legality, reasons, the matching history row — is guarded once here rather
 * than at each call site.
 */
export async function transition(id, { to, reason, note, customerVisible = true }, actor) {
  const booking = await Booking.findById(id);
  if (!booking) throw notFound('Booking');

  const from = booking.status;

  if (from === to) throw badRequest(`This booking is already ${to.toLowerCase().replace(/_/g, ' ')}.`);
  if (!canTransition(from, to)) {
    throw conflict(
      `A booking cannot go from ${from.replace(/_/g, ' ').toLowerCase()} to ${to
        .replace(/_/g, ' ')
        .toLowerCase()}.`,
    );
  }
  if (REASON_REQUIRED.has(to) && !reason?.trim()) {
    throw badRequest('Give a reason — the customer will be told what it says.');
  }

  const eventType =
    {
      AVAILABILITY_CHECK: 'availability.started',
      QUOTED: 'quotation.sent',
      AWAITING_PAYMENT: 'payment.requested',
      CONFIRMED: 'booking.confirmed',
      REJECTED: 'booking.rejected',
      CANCELLED: 'booking.cancelled',
      EXPIRED: 'quotation.expired',
      COMPLETED: 'trip.completed',
    }[to] ?? 'admin.message';

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      booking.status = to;
      if (CLOSED_STATUSES.includes(to)) {
        booking.closureReason = reason ?? null;
        booking.closedAt = new Date();
      }
      if (to === 'COMPLETED') booking.tripStatus = 'COMPLETED';
      await booking.save({ session });

      await recordEvent({
        booking: booking._id,
        type: eventType,
        /* The reason becomes the customer's description, so it is written for
         * them rather than for a log. */
        description: reason ?? note ?? undefined,
        actorKind: 'admin',
        actor: actor.id,
        actorName: actor.name,
        customerVisible,
        statusFrom: from,
        statusTo: to,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  /*
   * Tell the customer, outside the transaction.
   *
   * Without this a booking could be confirmed, rejected or cancelled and the
   * customer would only find out by signing in and looking — which, for a
   * rejection they are waiting on, is how a quiet "no" turns into a
   * complaint. Statuses with nothing useful to say produce no email; that
   * decision lives in the template so there is one list rather than two.
   *
   * `enqueue` never throws, so a queue outage costs the notification and not
   * the status change that has already been committed.
   */
  if (customerVisible) {
    await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.bookingStatusChanged, {
      bookingId: String(booking._id),
      reason: reason ?? null,
      /* The status this job is the news about. The worker drops it if the
       * booking has moved on since. */
      status: to,
    });
  }

  return booking;
}

/* Assign or reassign. Separate from `transition` because it changes who is
 * responsible rather than where the booking is. */
export async function assignReservation(id, assignedTo, actor) {
  const booking = await Booking.findById(id);
  if (!booking) throw notFound('Booking');

  booking.assignedTo = assignedTo || null;
  booking.assignedAt = assignedTo ? new Date() : null;
  await booking.save();

  await recordEvent({
    booking: booking._id,
    type: 'note.added',
    title: assignedTo ? 'Assigned' : 'Unassigned',
    actorKind: 'admin',
    actor: actor.id,
    actorName: actor.name,
    /* Who is handling it internally is not the customer's concern, and a
     * stream of reassignments on their timeline reads as disorganisation. */
    customerVisible: false,
    meta: { assignedTo: assignedTo ?? null },
  });

  return booking;
}

/*
 * A note, either internal or sent to the customer.
 *
 * One function for both, with the visibility explicit at the call site,
 * because the only difference is who reads it — and making that a parameter
 * rather than two functions means the decision is always made consciously.
 */
export async function addNote(id, { body, customerVisible = false, title }, actor) {
  const booking = await Booking.findById(id);
  if (!booking) throw notFound('Booking');

  return recordEvent({
    booking: booking._id,
    type: customerVisible ? 'admin.message' : 'note.added',
    title: title ?? (customerVisible ? 'Message from the team' : 'Internal note'),
    description: body,
    actorKind: 'admin',
    actor: actor.id,
    actorName: actor.name,
    customerVisible,
  });
}

/*
 * Whether this booking is ready to be confirmed.
 *
 * Checked by the confirmation route rather than assumed. Paying does not
 * confirm a trip: the suppliers have to have said yes. A booking confirmed
 * with an outstanding allocation is a traveller arriving at a guesthouse that
 * has never heard of them.
 */
export async function confirmationBlockers(bookingId) {
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) throw notFound('Booking');

  const blockers = [];

  if (booking.paidAmount < booking.advanceAmount) {
    blockers.push('The deposit has not been paid in full.');
  }

  const outstanding = await VendorAllocation.countDocuments({
    booking: bookingId,
    status: { $in: VendorAllocation.OUTSTANDING },
  });
  if (outstanding > 0) {
    blockers.push(
      `${outstanding} supplier ${outstanding === 1 ? 'booking is' : 'bookings are'} still unconfirmed.`,
    );
  }

  const rejected = await VendorAllocation.countDocuments({ booking: bookingId, status: 'REJECTED' });
  if (rejected > 0) {
    blockers.push(
      `${rejected} supplier ${rejected === 1 ? 'has' : 'have'} refused. Find an alternative or reject the booking.`,
    );
  }

  return blockers;
}
