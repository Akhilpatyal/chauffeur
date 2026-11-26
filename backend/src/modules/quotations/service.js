import mongoose from 'mongoose';
import { Quotation } from '../../models/Quotation.js';
import { Booking, CLOSED_STATUSES } from '../../models/Booking.js';
import { notFound, badRequest, conflict } from '../../lib/errors.js';
import { recordEvent } from '../../services/bookingEvents.js';
import { enqueue, QUEUE_NAMES, JOB_NAMES } from '../../lib/queue.js';
import { normaliseReference } from '../../services/bookingReference.js';

/*
 * Quotations: putting a price on a booking.
 *
 * This is the step that makes the rest of the pipeline mean anything. A
 * booking is created with no price at all — deliberately, because at request
 * time nobody knows one — and it stays unpriced until a quotation is accepted.
 * Acceptance is the single moment a figure is written onto the booking, which
 * is why that write lives here and nowhere else.
 *
 * WHY ACCEPTANCE, NOT SENDING, SETS THE PRICE
 *
 * A sent quotation is an offer; an accepted one is an agreement. If sending
 * wrote the total, a booking the customer never replied to would show a
 * balance owing, and "what do they owe us" would stop being answerable. So
 * sending moves the booking to QUOTED and changes no money; accepting writes
 * the numbers and asks for the deposit.
 *
 * VERSIONS
 *
 * Nothing is ever edited after it is sent. A changed price is a new version
 * and the old one becomes `superseded`, so the question "what exactly did
 * they agree to" always has an answer. The unique index on
 * (booking, version) is what actually prevents two admins from both writing
 * version 2; the read-then-write below is only there to pick the number.
 */

/* Terminal for the purposes of superseding: these are versions whose outcome
 * is already recorded, so a new draft must not disturb them. */
const SETTLED = new Set(['accepted', 'declined', 'superseded', 'expired']);

const DEFAULT_VALID_DAYS = 7;

function assertOpen(booking) {
  if (CLOSED_STATUSES.includes(booking.status)) {
    throw conflict(
      `This booking is ${booking.status.toLowerCase()} and can no longer be quoted.`,
    );
  }
}

/*
 * A new version for a booking, as a draft.
 *
 * The previous draft or sent version is superseded in the same transaction,
 * so a booking never has two live offers — which would leave the customer
 * choosing which price to accept.
 */
export async function createVersion(bookingId, input, actor) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound('Booking');
  assertOpen(booking);

  if (!input.items?.length) {
    throw badRequest('A quotation needs at least one line, so the customer can see what they are paying for.');
  }

  const session = await mongoose.startSession();
  let created;

  try {
    await session.withTransaction(async () => {
      const latest = await Quotation.findOne({ booking: bookingId })
        .sort({ version: -1 })
        .session(session);

      const version = (latest?.version ?? 0) + 1;

      /* Only live versions are superseded. An accepted or declined one keeps
       * its status, because that status is a record of what happened rather
       * than a description of what is current. */
      await Quotation.updateMany(
        { booking: bookingId, status: { $in: ['draft', 'sent', 'changes_requested'] } },
        { $set: { status: 'superseded' } },
        { session },
      );

      const [doc] = await Quotation.create(
        [
          {
            booking: bookingId,
            version,
            status: 'draft',
            currency: input.currency ?? booking.currency ?? undefined,
            summary: input.summary ?? null,
            itinerary: input.itinerary ?? [],
            startDate: input.startDate ?? booking.startDate ?? null,
            endDate: input.endDate ?? booking.endDate ?? null,
            travellerCount: input.travellerCount ?? booking.travellerCount ?? null,
            roomConfiguration: input.roomConfiguration ?? null,
            transportDetail: input.transportDetail ?? null,
            inclusions: input.inclusions ?? [],
            exclusions: input.exclusions ?? [],
            items: input.items,
            advanceAmount: input.advanceAmount ?? 0,
            paymentDeadline: input.paymentDeadline ?? null,
            /* No default text. An invented cancellation term is a consumer
             * protection problem, not a copy problem — so if the desk has not
             * written one, the quotation carries none and says so. */
            cancellationTerms: input.cancellationTerms ?? null,
            expiresAt: input.expiresAt ?? null,
            revisionReason: version > 1 ? input.revisionReason ?? null : null,
            createdBy: actor?.id ?? actor?._id ?? null,
          },
        ],
        { session },
      );

      created = doc;
    });
  } finally {
    await session.endSession();
  }

  return created;
}

/* Drafts are editable in place: nobody has seen them, so there is nothing to
 * preserve a record of. Once sent, a change means a new version. */
export async function updateDraft(quotationId, input) {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) throw notFound('Quotation');

  if (quotation.status !== 'draft') {
    throw conflict(
      'This quotation has already been sent. Create a new version instead of changing what the customer was shown.',
    );
  }

  const fields = [
    'summary', 'itinerary', 'startDate', 'endDate', 'travellerCount',
    'roomConfiguration', 'transportDetail', 'inclusions', 'exclusions',
    'items', 'advanceAmount', 'paymentDeadline', 'cancellationTerms',
    'expiresAt', 'revisionReason', 'currency',
  ];
  for (const field of fields) {
    if (input[field] !== undefined) quotation[field] = input[field];
  }

  await quotation.save();
  return quotation;
}

/*
 * Send it to the customer.
 *
 * Moves the booking to QUOTED and starts the clock. The booking's status is
 * changed here rather than left to a separate admin action, because a sent
 * quotation and a booking that still says "we are checking" is a
 * contradiction the customer can see.
 */
export async function send(quotationId, actor) {
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) throw notFound('Quotation');

  if (quotation.status !== 'draft') {
    throw conflict('Only a draft can be sent.');
  }
  if (!quotation.items?.length) {
    throw badRequest('This quotation has no lines.');
  }

  const booking = await Booking.findById(quotation.booking);
  if (!booking) throw notFound('Booking');
  assertOpen(booking);

  const now = new Date();
  const expiresAt =
    quotation.expiresAt ??
    new Date(now.getTime() + DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000);

  const revision = quotation.version > 1;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      quotation.status = 'sent';
      quotation.sentAt = now;
      quotation.expiresAt = expiresAt;
      await quotation.save({ session });

      const from = booking.status;
      if (booking.status !== 'QUOTED') {
        booking.status = 'QUOTED';
        await booking.save({ session });
      }

      await recordEvent({
        booking: booking._id,
        type: revision ? 'quotation.revised' : 'quotation.sent',
        description: revision ? quotation.revisionReason ?? undefined : undefined,
        actorKind: 'admin',
        actor: actor?.id ?? actor?._id ?? null,
        actorName: actor?.name ?? null,
        statusFrom: from,
        statusTo: booking.status,
        meta: { quotation: String(quotation._id), version: quotation.version },
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  /* Outside the transaction: a queue failure must not roll back a quotation
   * that was genuinely sent, and `enqueue` never throws. */
  await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.quotationSent, {
    quotationId: String(quotation._id),
  });

  return quotation;
}

/*
 * The customer accepts.
 *
 * The one place a price is written onto a booking. Everything the rest of the
 * system reads — the balance, the deposit, the payment deadline — comes from
 * the version accepted here, copied rather than referenced, so that a later
 * version cannot retroactively change what was agreed.
 */
export async function accept(bookingId, quotationId, customerId) {
  const { booking, quotation } = await loadForCustomer(bookingId, quotationId, customerId);

  if (quotation.status !== 'sent') {
    throw conflict(
      quotation.status === 'accepted'
        ? 'You have already accepted this quotation.'
        : 'This quotation is no longer open for acceptance.',
    );
  }

  /* Checked at the moment of acceptance rather than trusted from a sweeper
   * that may not have run yet. */
  if (quotation.expiresAt && quotation.expiresAt < new Date()) {
    quotation.status = 'expired';
    await quotation.save();
    await recordEvent({
      booking: booking._id,
      type: 'quotation.expired',
      actorKind: 'system',
      meta: { quotation: String(quotation._id), version: quotation.version },
    }).catch(() => {});
    throw conflict('This quotation has expired. Ask us for an up-to-date price.');
  }

  const now = new Date();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      quotation.status = 'accepted';
      quotation.acceptedAt = now;
      await quotation.save({ session });

      const from = booking.status;

      booking.currency = quotation.currency;
      booking.totalAmount = quotation.totalAmount;
      booking.advanceAmount = quotation.advanceAmount;
      booking.paymentDeadline = quotation.paymentDeadline ?? null;
      booking.acceptedQuotation = quotation._id;
      /* Always AWAITING_PAYMENT, never straight to CONFIRMED even when no
       * deposit is due: confirming is an operational judgement about whether
       * the suppliers are actually booked, and an accepted price is not
       * evidence of that. The desk confirms, through the gate that checks. */
      booking.status = 'AWAITING_PAYMENT';
      await booking.save({ session });

      await recordEvent({
        booking: booking._id,
        type: 'quotation.accepted',
        actorKind: 'customer',
        actor: customerId,
        statusFrom: from,
        statusTo: booking.status,
        meta: { quotation: String(quotation._id), version: quotation.version },
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.quotationAccepted, {
    quotationId: String(quotation._id),
  });

  return { booking, quotation };
}

/*
 * The customer says no, or asks for changes.
 *
 * Declining does not close the booking. Somebody who refuses a price is
 * usually still a customer — closing their booking here would throw away a
 * conversation the desk can still rescue, so the booking stays where it is
 * and the desk decides.
 */
export async function respond(bookingId, quotationId, customerId, { outcome, message }) {
  const { booking, quotation } = await loadForCustomer(bookingId, quotationId, customerId);

  if (quotation.status !== 'sent') {
    throw conflict('This quotation is no longer open.');
  }

  const declining = outcome === 'decline';

  quotation.status = declining ? 'declined' : 'changes_requested';
  quotation.declinedAt = declining ? new Date() : null;
  quotation.customerResponse = message ?? null;
  await quotation.save();

  await recordEvent({
    booking: booking._id,
    type: declining ? 'quotation.declined' : 'quotation.changes_requested',
    description: message ?? undefined,
    actorKind: 'customer',
    actor: customerId,
    meta: { quotation: String(quotation._id), version: quotation.version },
  });

  await enqueue(QUEUE_NAMES.notifications, JOB_NAMES.quotationResponded, {
    quotationId: String(quotation._id),
  });

  return quotation;
}

/* Every version, newest first — the desk's view, costs included. */
export function listForBooking(bookingId) {
  return Quotation.find({ booking: bookingId }).sort({ version: -1 }).select('+items.vendorCost');
}

/*
 * What the customer may see: never a draft.
 *
 * A draft is the desk thinking out loud. Returning one would show a price
 * nobody has agreed to send.
 */
export function customerVisibleFor(bookingId) {
  return Quotation.find({ booking: bookingId, status: { $ne: 'draft' } }).sort({ version: -1 });
}

/*
 * Customers reach a booking by its reference (TF-XXXX-XXXX), which is what
 * the emails and the URLs carry, so both forms resolve here exactly as they
 * do on the booking routes.
 */
export async function findCustomerBooking(idOrReference, customerId) {
  const byReference = !/^[a-f0-9]{24}$/i.test(idOrReference);
  const match = byReference
    ? { reference: normaliseReference(idOrReference) ?? ' ' }
    : { _id: idOrReference };

  /* Scoped by customer in the query rather than compared afterwards, so a
   * booking belonging to somebody else is indistinguishable from one that
   * does not exist. */
  return Booking.findOne({ ...match, customer: customerId });
}

async function loadForCustomer(bookingId, quotationId, customerId) {
  const booking = await findCustomerBooking(bookingId, customerId);
  if (!booking) throw notFound('Booking');

  const quotation = await Quotation.findOne({ _id: quotationId, booking: booking._id });
  if (!quotation) throw notFound('Quotation');

  return { booking, quotation };
}

/*
 * Lapse offers nobody answered.
 *
 * Run from the sweeper. An offer that has quietly passed its date still shows
 * the customer an "Accept" button, and letting them press it means honouring
 * a price that may no longer be available from the guesthouse.
 */
export async function expireLapsedQuotations(now = new Date()) {
  const lapsed = await Quotation.find({
    status: 'sent',
    expiresAt: { $ne: null, $lt: now },
  }).limit(200);

  let expired = 0;
  for (const quotation of lapsed) {
    quotation.status = 'expired';
    await quotation.save();
    await recordEvent({
      booking: quotation.booking,
      type: 'quotation.expired',
      actorKind: 'system',
      meta: { quotation: String(quotation._id), version: quotation.version },
    }).catch(() => {});
    expired += 1;
  }

  return { expired };
}
