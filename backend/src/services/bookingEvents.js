import { BookingEvent } from '../models/BookingEvent.js';
import { logger } from '../config/logger.js';

/*
 * Writing and reading booking history.
 *
 * Every state change on a booking goes through `recordEvent`. The timeline a
 * customer sees is these rows and nothing else — there is no hardcoded list
 * of stages with dates slotted in, so a step that has not happened simply has
 * no row and cannot render as done.
 *
 * WHY recordEvent CAN THROW AND recordEventQuietly CANNOT
 *
 * Two different situations, and conflating them is how audit trails develop
 * holes.
 *
 * Inside a state transition, the event *is* part of the change: a booking
 * that became CONFIRMED with no record of becoming confirmed is a booking
 * nobody can explain later. That write belongs in the same transaction and
 * must fail the transaction if it fails.
 *
 * Alongside a side effect — an email went out, a vendor was chased — losing
 * the note is a smaller harm than failing the request that caused it. Those
 * use the quiet form.
 */

/*
 * The wording customers see, by event type.
 *
 * Centralised rather than written at each call site so the voice stays
 * consistent and so a change of phrasing is one edit. A caller can always
 * override with its own title when the specifics matter — "no rooms in Kaza
 * for those dates" beats "availability could not be confirmed".
 */
const CUSTOMER_COPY = {
  'request.submitted': {
    title: 'Request received',
    description:
      'We have your request. Nothing is booked yet — our team is checking whether we can run these dates.',
  },
  'availability.started': {
    title: 'Checking availability',
    description: 'We are confirming rooms, transport and permits with our suppliers.',
  },
  'availability.confirmed': {
    title: 'Dates available',
    description: 'We can run this trip. A priced quotation follows shortly.',
  },
  'availability.unavailable': {
    title: 'These dates are not available',
    description: 'We could not secure what this trip needs on these dates.',
  },
  'alternative.proposed': {
    title: 'Alternative dates suggested',
    description: 'We have proposed dates we can run. Have a look and tell us what suits.',
  },
  'quotation.sent': {
    title: 'Your quotation is ready',
    description: 'Review the price and what is included, then accept it to hold your place.',
  },
  'quotation.revised': {
    title: 'Your quotation has been updated',
    description: 'Something changed, so here is a revised version. It needs your acceptance again.',
  },
  'quotation.accepted': {
    title: 'Quotation accepted',
    description: 'Thank you. The next step is the deposit.',
  },
  'quotation.declined': { title: 'Quotation declined' },
  'quotation.changes_requested': {
    title: 'You asked for changes',
    description: 'We are working on a revised quotation.',
  },
  'quotation.expired': {
    title: 'Quotation expired',
    description: 'This offer lapsed. Tell us if you would still like to go and we will re-quote.',
  },
  'payment.requested': {
    title: 'Deposit requested',
    description: 'Pay the deposit to confirm your place.',
  },
  'payment.succeeded': {
    title: 'Payment received',
    description: 'We have your payment. Confirming the last supplier details now.',
  },
  'payment.failed': {
    title: 'Payment did not go through',
    description: 'Nothing was charged. You can try again.',
  },
  'payment.refunded': { title: 'Refund processed' },
  'booking.confirmed': {
    title: 'Your trip is confirmed',
    description: 'Everything is secured. Your documents are on the way.',
  },
  'booking.rejected': { title: 'We cannot run this trip' },
  'booking.cancelled': { title: 'Booking cancelled' },
  'documents.issued': {
    title: 'Trip documents ready',
    description: 'Your voucher and joining instructions are available to download.',
  },
  'instructions.sent': { title: 'Pre-trip instructions sent' },
  'trip.started': { title: 'Trip started' },
  'trip.completed': {
    title: 'Trip completed',
    description: 'We hope it was a good one.',
  },
  'review.requested': { title: 'How was it?' },
};

/* Types a customer should see unless the caller says otherwise. Internal
 * chatter — vendor chasing, notes — defaults to hidden. */
const CUSTOMER_VISIBLE_BY_DEFAULT = new Set(Object.keys(CUSTOMER_COPY));

/*
 * Append one event.
 *
 * `session` threads a Mongoose transaction through, so a status change and
 * its history entry commit or fail together.
 */
export async function recordEvent({
  booking,
  type,
  title,
  description,
  actorKind = 'system',
  actor = null,
  actorName = null,
  customerVisible,
  customerAction,
  statusFrom = null,
  statusTo = null,
  meta = null,
  session = null,
}) {
  const copy = CUSTOMER_COPY[type] ?? {};

  const [event] = await BookingEvent.create(
    [
      {
        booking,
        type,
        title: title ?? copy.title ?? type,
        description: description ?? copy.description ?? null,
        actorKind,
        actor,
        actorName,
        customerVisible: customerVisible ?? CUSTOMER_VISIBLE_BY_DEFAULT.has(type),
        customerAction: customerAction ?? undefined,
        statusFrom,
        statusTo,
        meta,
      },
    ],
    session ? { session } : {},
  );

  return event;
}

/*
 * Append an event, but never fail the caller.
 *
 * For notes alongside a side effect that has already happened. The failure is
 * logged rather than swallowed silently — a history with gaps is worth
 * knowing about even when it is not worth failing a request over.
 */
export async function recordEventQuietly(input) {
  try {
    return await recordEvent(input);
  } catch (error) {
    logger.warn(
      { err: error, booking: String(input?.booking), type: input?.type },
      'could not record booking event',
    );
    return null;
  }
}

/* The customer's timeline: their events, oldest first. */
export function customerTimeline(bookingId) {
  return BookingEvent.find({ booking: bookingId, customerVisible: true })
    .sort({ createdAt: 1 })
    .select('-meta -actor -__v')
    .lean();
}

/* The admin's: everything, including the internal notes. */
export function fullTimeline(bookingId) {
  return BookingEvent.find({ booking: bookingId }).sort({ createdAt: 1 }).lean();
}

/*
 * What the customer should be told to do next.
 *
 * Read from the most recent visible event carrying an action rather than
 * derived from the booking's status. The status says where the booking is;
 * the event says what was asked of them and by when, which is the more
 * useful thing to put at the top of a dashboard — and it stays correct
 * without a second switch statement drifting out of step with the first.
 */
export async function pendingCustomerAction(bookingId) {
  const latest = await BookingEvent.findOne({
    booking: bookingId,
    customerVisible: true,
    'customerAction.label': { $ne: null },
  })
    .sort({ createdAt: -1 })
    .select('customerAction type createdAt')
    .lean();

  if (!latest?.customerAction?.label) return null;
  return { ...latest.customerAction, since: latest.createdAt, forEvent: latest.type };
}
