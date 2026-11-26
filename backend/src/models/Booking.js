import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * A reservation.
 *
 * A BOOKING IS NOT A CONFIRMED TRIP
 *
 * The single most important thing this model encodes: `REQUESTED` means a
 * customer has asked, not that they are going. Availability on these routes
 * is not live — a Spiti departure depends on a guesthouse in Kaza answering
 * the phone — so every reservation passes through a human check before it is
 * confirmed. Any screen, email or status that blurs that line sets up a
 * traveller to book flights against a trip that was never on.
 *
 * Hence two separate status fields rather than one. `status` is where the
 * reservation is in its lifecycle; `paymentStatus` is what has been paid.
 * They move independently: a booking can be CONFIRMED and PARTIALLY_PAID
 * (deposit taken, balance due), or AWAITING_PAYMENT and PAID at the instant
 * a webhook lands but before the supplier allocation is confirmed.
 *
 * WHY STATE LIVES HERE AND HISTORY LIVES IN BookingEvent
 *
 * This document holds only the current state. Every transition is appended
 * to BookingEvent, which is never updated or deleted. Overwriting a status
 * in place would mean that "when did this become confirmed, and who did it"
 * is unanswerable three months later, which is exactly the question asked
 * when a trip goes wrong.
 */

export const BOOKING_STATUSES = [
  /* Customer has asked. Nothing is held, nothing is promised. */
  'REQUESTED',
  /* Someone is ringing the guesthouse and the driver. */
  'AVAILABILITY_CHECK',
  /* A priced quotation has gone out and we are waiting on the customer. */
  'QUOTED',
  /* Quotation accepted; the deposit is what stands between here and go. */
  'AWAITING_PAYMENT',
  /* Money in and every supplier allocation confirmed. Only now is it real. */
  'CONFIRMED',
  /* We could not run it. Always carries a reason. */
  'REJECTED',
  /* Called off after confirmation, by either side. Always carries a reason. */
  'CANCELLED',
  /* A quotation lapsed or the customer went quiet. Reversible by re-quoting. */
  'EXPIRED',
  /* They went, and came back. */
  'COMPLETED',
];

export const PAYMENT_STATUSES = [
  'UNPAID',
  /* An order exists at the gateway; no verified money yet. */
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'FAILED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
];

/* Where the trip itself is, which is not the same question as where the
 * booking is. A booking can be CONFIRMED while the trip has not departed. */
export const TRIP_STATUSES = ['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CALLED_OFF'];

/* Statuses after which the reservation is over. Used everywhere that needs
 * "is this live" — dashboards, workload counts, inventory release — so the
 * definition exists once rather than as a repeated $nin. */
export const CLOSED_STATUSES = ['REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED'];

/* A traveller on this booking, copied rather than referenced. The customer
 * may edit their saved travellers later and that must not retroactively
 * change who was on a trip that already ran. */
const bookingTravellerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, trim: true, maxlength: 40, default: null },
    idType: { type: String, trim: true, maxlength: 40, default: null },
    idNumber: { type: String, trim: true, maxlength: 60, select: false, default: null },
    isLead: { type: Boolean, default: false },
  },
  { _id: true },
);

const bookingSchema = new Schema(
  {
    /*
     * The human-readable handle, on every email and said down the phone.
     * Unique and immutable. Generated in services/bookingReference.js.
     */
    reference: { type: String, required: true, unique: true, uppercase: true, trim: true },

    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

    /* A fixed departure is picked off a calendar; a custom trip is described
     * and priced individually. They diverge enough in handling to be worth
     * branching on, and not enough to be separate collections. */
    kind: { type: String, enum: ['fixed_departure', 'custom'], required: true, index: true },

    /*
     * The trip as it was when booked, copied not referenced.
     *
     * Prices and itineraries change. A booking has to keep showing what the
     * customer actually agreed to, so the title, slug and headline price are
     * snapshotted here. `tripRef` still points at the live record for an
     * admin who wants today's version.
     */
    trip: {
      slug: { type: String, trim: true, index: true },
      title: { type: String, trim: true, maxlength: 200 },
      destination: { type: String, trim: true, maxlength: 200 },
      durationLabel: { type: String, trim: true, maxlength: 80 },
      imageUrl: { type: String, trim: true, maxlength: 500 },
    },
    tripRef: { type: Schema.Types.ObjectId, ref: 'Journey', default: null },

    /* Set for fixed departures. Null for a custom trip until dates are
     * agreed, which is why the booking carries its own dates too. */
    departure: { type: Schema.Types.ObjectId, ref: 'Departure', default: null, index: true },

    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null },
    /* A custom request often arrives as "sometime in June, give or take a
     * week" rather than a date. */
    dateFlexibilityDays: { type: Number, default: 0, min: 0, max: 60 },

    travellerCount: { type: Number, required: true, min: 1, max: 40 },
    travellers: { type: [bookingTravellerSchema], default: [] },

    /* What the lead traveller gave us. Copied from the customer at creation
     * so a later profile edit does not rewrite the contact details on a trip
     * already under way. */
    contact: {
      name: { type: String, trim: true, maxlength: 120 },
      email: { type: String, trim: true, lowercase: true, maxlength: 254 },
      phone: { type: String, trim: true, maxlength: 32 },
    },

    preferences: {
      roomSharing: { type: String, trim: true, maxlength: 80, default: null },
      roomsRequested: { type: Number, min: 0, max: 20, default: null },
      pickupPoint: { type: String, trim: true, maxlength: 200, default: null },
      transport: { type: String, trim: true, maxlength: 200, default: null },
      accommodation: { type: String, trim: true, maxlength: 200, default: null },
      budgetRange: { type: String, trim: true, maxlength: 80, default: null },
      destinations: { type: [String], default: [] },
      durationDays: { type: Number, min: 1, max: 60, default: null },
      addOns: { type: [String], default: [] },
      specialRequests: { type: String, trim: true, maxlength: 2000, default: null },
    },

    status: { type: String, enum: BOOKING_STATUSES, default: 'REQUESTED', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'UNPAID', index: true },
    tripStatus: { type: String, enum: TRIP_STATUSES, default: 'UPCOMING', index: true },

    /* The quotation currently in force. Superseded versions stay in the
     * Quotation collection; this points at the one the customer is being
     * asked to accept, or accepted. */
    activeQuotation: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },

    /*
     * Money, in paise. See utils/money.js for why nothing here is a float.
     *
     * These are a rolled-up view for listing and filtering — the authoritative
     * breakdown is on the accepted Quotation. They are updated inside the same
     * transaction that writes a Payment, so a list page never disagrees with a
     * booking detail page.
     */
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    totalAmount: minorAmountField({ defaultValue: 0 }),
    advanceAmount: minorAmountField({ defaultValue: 0 }),
    paidAmount: minorAmountField({ defaultValue: 0 }),
    refundedAmount: minorAmountField({ defaultValue: 0 }),
    paymentDeadline: { type: Date, default: null },

    /* The quotation version the customer actually agreed to. The figures
     * above are copied from it rather than read through it, so a later
     * version can never retroactively change what was agreed — this pointer
     * is for answering "agreed to what, exactly", not for computing money. */
    acceptedQuotation: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },

    /* Set when the booking leaves the pipeline unhappily. Required by the
     * routes that set these statuses — a rejection a customer cannot
     * understand generates a phone call and a bad review. */
    closureReason: { type: String, trim: true, maxlength: 1000, default: null },
    closedAt: { type: Date, default: null },
    cancellationRequestedAt: { type: Date, default: null },

    /* Internal only, stripped by the customer serialiser below. */
    internalNotes: { type: String, maxlength: 4000, default: null, select: false },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    /* When, not only who. Mongoose silently drops a write to a path that is
     * not declared, so the service setting this without a field here would
     * have lost the timestamp with no error anywhere. */
    assignedAt: { type: Date, default: null },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },

    /* The enquiry this grew out of, where there was one. Lets the desk see
     * the whole conversation rather than two unconnected records. */
    sourceLead: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },

    /* Replays a double-submitted form instead of creating a second booking.
     * Same mechanism the public lead endpoint uses. */
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true },
);

/* The admin pipeline views: "new requests", "awaiting payment", and so on,
 * each newest first. */
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ paymentStatus: 1, createdAt: -1 });
/* A customer's own list. */
bookingSchema.index({ customer: 1, createdAt: -1 });
/* Upcoming departures across the business. */
bookingSchema.index({ status: 1, startDate: 1 });
bookingSchema.index({ team: 1, status: 1, createdAt: -1 });
bookingSchema.index({ assignedTo: 1, status: 1 });
/* Sparse: most bookings carry no idempotency key. */
bookingSchema.index({ idempotencyKey: 1 }, { sparse: true });

/* Outstanding balance, derived rather than stored — a stored copy is one
 * more thing that can disagree with the payments it is meant to summarise. */
bookingSchema.virtual('balanceAmount').get(function balanceAmount() {
  return Math.max(0, (this.totalAmount ?? 0) - (this.paidAmount ?? 0) + (this.refundedAmount ?? 0));
});

bookingSchema.virtual('isClosed').get(function isClosed() {
  return CLOSED_STATUSES.includes(this.status);
});

/*
 * What the customer is allowed to see.
 *
 * Used by every customer-facing route. Internal notes, vendor costs, the
 * assigned agent and other people's data are not merely hidden in the UI —
 * they never leave the server.
 */
bookingSchema.methods.toCustomerJSON = function toCustomerJSON() {
  const raw = this.toObject({ virtuals: true });

  delete raw.internalNotes;
  delete raw.assignedTo;
  delete raw.team;
  delete raw.sourceLead;
  delete raw.idempotencyKey;
  delete raw.__v;
  for (const traveller of raw.travellers ?? []) delete traveller.idNumber;

  return raw;
};

export const Booking = mongoose.models.Booking ?? mongoose.model('Booking', bookingSchema);
export default Booking;
