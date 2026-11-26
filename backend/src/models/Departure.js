import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * One dated run of a fixed-departure trip.
 *
 * WHY SEATS ARE THREE NUMBERS AND NOT ONE
 *
 * `capacity`, `seatsHeld` and `seatsBooked` are separate because they answer
 * different questions and move at different times. A seat held during
 * checkout is not sold — it may be released in fifteen minutes — but it is
 * also not available. Collapsing them into "seatsLeft" means either two
 * customers can pay for the same last seat, or seats sit unsellable after an
 * abandoned checkout.
 *
 * HOW THE LAST SEAT IS PROTECTED
 *
 * Not with a read-then-write. Two requests can both read "1 left" and both
 * decide they may proceed. The claim is a single conditional update —
 * `findOneAndUpdate` with the availability condition in the filter — so
 * MongoDB applies them one at a time against the document and the second
 * matches nothing. See services/inventory.js; `claimSeats` below is the
 * expression of that condition.
 *
 * WHAT THIS DOES NOT CLAIM TO KNOW
 *
 * Capacity here is our own vehicle and our own allocation. It is not a live
 * feed from a guesthouse in Kaza. A departure with seats free still needs its
 * supplier allocations confirmed before a booking is confirmed — which is
 * what VendorAllocation is for. `confirmationMode` records which of the two
 * a given departure is, so the UI never implies live availability we do not
 * have.
 */

export const DEPARTURE_STATUSES = [
  /* Published and taking bookings. */
  'open',
  /* Minimum group size reached; it is running. */
  'guaranteed',
  /* No seats left. */
  'full',
  /* Too few bookings, or a pass closed. */
  'cancelled',
  /* Past. */
  'departed',
];

const departureSchema = new Schema(
  {
    /* The journey this is a run of. Slug as well as ref, so a departure can
     * be looked up from a URL without a join. */
    tripSlug: { type: String, required: true, trim: true, index: true },
    tripRef: { type: Schema.Types.ObjectId, ref: 'Journey', default: null },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },

    capacity: { type: Number, required: true, min: 1, max: 200 },
    /* Reserved during an active checkout. Released on expiry, failure or
     * cancellation by the sweeper in services/inventory.js. */
    seatsHeld: { type: Number, default: 0, min: 0 },
    seatsBooked: { type: Number, default: 0, min: 0 },

    /* Below this the departure may not run. Shown to customers up front so a
     * trip that might not happen is never a surprise. */
    minimumGroupSize: { type: Number, default: 1, min: 1 },

    status: { type: String, enum: DEPARTURE_STATUSES, default: 'open', index: true },

    /*
     * Whether the seat count means anything.
     *
     *   'managed'  — our own vehicle and allocation. The numbers are real and
     *                can be shown as "N seats left".
     *   'on_request' — capacity depends on suppliers we have to ring. The UI
     *                must say availability needs confirming, never a count.
     *
     * Defaulting to `on_request` is deliberate: the honest answer when nobody
     * has configured this is "we will check", not an invented number.
     */
    confirmationMode: {
      type: String,
      enum: ['managed', 'on_request'],
      default: 'on_request',
    },

    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    /* Headline per-person price for this run. A quotation may differ once
     * room configuration and add-ons are known. */
    pricePerPerson: minorAmountField({ defaultValue: 0 }),

    pickupPoint: { type: String, trim: true, maxlength: 200, default: null },
    note: { type: String, trim: true, maxlength: 500, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
  { timestamps: true },
);

/*
 * One run per trip per start date — stops a double-entered departure
 * splitting its bookings across two records. This also serves the listing
 * query (a trip's future runs, soonest first); declaring it twice, once
 * plain and once unique, just creates two identical indexes.
 */
departureSchema.index({ tripSlug: 1, startDate: 1 }, { unique: true });
departureSchema.index({ status: 1, startDate: 1 });

/* Seats neither sold nor held. Never negative, however the counters got
 * there. */
departureSchema.virtual('seatsAvailable').get(function seatsAvailable() {
  return Math.max(0, (this.capacity ?? 0) - (this.seatsBooked ?? 0) - (this.seatsHeld ?? 0));
});

/* Whether a seat count may be shown at all — see `confirmationMode`. */
departureSchema.virtual('showsLiveSeats').get(function showsLiveSeats() {
  return this.confirmationMode === 'managed';
});

/*
 * The filter that makes a claim atomic.
 *
 * Used as the query of a findOneAndUpdate that increments seatsHeld. Because
 * the availability test is part of the filter rather than a prior read, two
 * concurrent claims for the last seat cannot both match.
 */
departureSchema.statics.claimFilter = function claimFilter(id, seats) {
  return {
    _id: id,
    status: { $in: ['open', 'guaranteed'] },
    /* `$expr` so the comparison is against this document's own fields rather
     * than a value the caller read a moment ago and may be stale. */
    $expr: {
      $gte: [
        { $subtract: ['$capacity', { $add: ['$seatsBooked', '$seatsHeld'] }] },
        seats,
      ],
    },
  };
};

departureSchema.methods.toPublicJSON = function toPublicJSON() {
  const raw = this.toObject({ virtuals: true });
  delete raw.createdBy;
  delete raw.__v;
  /* A count is only published where it is real. Elsewhere the client is told
   * availability is confirmed on request, and has no number to misreport. */
  if (!this.showsLiveSeats) {
    delete raw.capacity;
    delete raw.seatsHeld;
    delete raw.seatsBooked;
    delete raw.seatsAvailable;
  }
  return raw;
};

export const Departure = mongoose.models.Departure ?? mongoose.model('Departure', departureSchema);
export default Departure;
