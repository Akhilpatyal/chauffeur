import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * One thing we need from one supplier for one booking.
 *
 * WHY THIS IS NOT A FIELD ON Booking
 *
 * A Spiti trip needs rooms in Kaza, rooms in Tabo, a vehicle for six days and
 * an inner line permit — four suppliers, four separate yes-or-nos, arriving
 * over two days. A single `vendorConfirmed: true` on the booking would have
 * to mean "all of them", so the first confirmation either overstates the
 * position or the field cannot be set until the last one lands, losing the
 * progress in between.
 *
 * Worse, it makes the dangerous case invisible: three suppliers confirmed and
 * the fourth refusing is the situation where a booking must NOT be confirmed,
 * and it is indistinguishable from "nobody asked yet" in a boolean.
 *
 * So each requirement is a row, and a booking is confirmable only when every
 * one of its rows is CONFIRMED. The check lives in services/inventory.js and
 * the confirmation route calls it; paying does not bypass it.
 */

export const ALLOCATION_STATUSES = [
  /* We have asked the supplier and are waiting. */
  'REQUESTED',
  /* They are holding it, usually informally and usually not for long. */
  'HELD',
  /* Confirmed with a reference. The only status that counts towards
   * confirming a booking. */
  'CONFIRMED',
  /* They cannot do it. The booking needs an alternative or must be refused. */
  'REJECTED',
  /* We gave it back — the booking was cancelled, or we went elsewhere. */
  'RELEASED',
];

const vendorAllocationSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null, index: true },
    /* Kept as text too, so an allocation reads sensibly before a vendor
     * record exists — the desk often rings someone before adding them. */
    vendorName: { type: String, trim: true, maxlength: 160, default: null },

    service: {
      type: String,
      enum: ['accommodation', 'transport', 'guide', 'activity', 'permit', 'meals', 'other'],
      required: true,
    },
    /* "2 twin rooms, Kaza, nights 2–3" — what was actually asked for. */
    detail: { type: String, required: true, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 160, default: null },

    /* Which nights or days this covers, where it matters. */
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    quantity: { type: Number, min: 0, default: 1 },

    status: { type: String, enum: ALLOCATION_STATUSES, default: 'REQUESTED', index: true },

    /* The supplier's own reference, which is what gets quoted back at them
     * when a traveller turns up and they have no record. */
    confirmationRef: { type: String, trim: true, maxlength: 120, default: null },
    confirmedAt: { type: Date, default: null },
    /* An informal hold is worth recording with its expiry, because "they are
     * holding it till Tuesday" is otherwise in somebody's head. */
    holdExpiresAt: { type: Date, default: null },

    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },

    /*
     * Our cost, which is never the customer's business.
     *
     * `select: false` so it cannot leak through a careless populate, and the
     * customer-facing booking serialiser does not include allocations at all.
     */
    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    cost: { ...minorAmountField(), select: false },
    amountPaidToVendor: { ...minorAmountField({ defaultValue: 0 }), select: false },
    vendorPaymentDue: { type: Date, default: null, select: false },

    notes: { type: String, maxlength: 2000, default: null, select: false },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/* "What is outstanding on this booking", which is the question the
 * confirmation check asks. */
vendorAllocationSchema.index({ booking: 1, status: 1 });
/* "What have we asked this vendor for", for chasing. */
vendorAllocationSchema.index({ vendor: 1, status: 1, createdAt: -1 });
/* The sweeper that chases holds about to lapse. */
vendorAllocationSchema.index({ status: 1, holdExpiresAt: 1 }, { sparse: true });

/* Statuses that still need a human to do something. */
vendorAllocationSchema.statics.OUTSTANDING = ['REQUESTED', 'HELD'];

export const VendorAllocation =
  mongoose.models.VendorAllocation ?? mongoose.model('VendorAllocation', vendorAllocationSchema);
export default VendorAllocation;
