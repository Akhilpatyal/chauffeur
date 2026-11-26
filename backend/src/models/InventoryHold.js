import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * A temporary claim on seats while a customer finishes checking out.
 *
 * WHY HOLDS EXPIRE RATHER THAN BEING CANCELLED
 *
 * Most abandoned checkouts are never cancelled by anyone — the tab is closed,
 * the phone dies, the customer goes to lunch. A hold that only ends when
 * somebody releases it therefore ends never, and a popular departure silently
 * fills up with seats nobody is buying.
 *
 * So every hold carries `expiresAt` and the sweeper in services/inventory.js
 * returns lapsed ones. The MongoDB TTL index below is a backstop, not the
 * mechanism: TTL deletion runs about once a minute and, more importantly,
 * deleting this row does not decrement the departure's `seatsHeld`. The
 * sweeper does both, in order. The TTL exists only so that rows cannot
 * accumulate forever if the sweeper is down.
 */

export const HOLD_STATUSES = ['active', 'converted', 'released', 'expired'];

const inventoryHoldSchema = new Schema(
  {
    departure: { type: Schema.Types.ObjectId, ref: 'Departure', required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },

    seats: { type: Number, required: true, min: 1, max: 40 },

    status: { type: String, enum: HOLD_STATUSES, default: 'active', index: true },

    expiresAt: { type: Date, required: true, index: true },
    /* Set when the hold became a booking, was given back, or lapsed. Kept
     * rather than deleting the row, so "why did this departure show full at
     * 3pm" is answerable. */
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, trim: true, maxlength: 200, default: null },
  },
  { timestamps: true },
);

/* The sweeper's query: active holds whose time is up. */
inventoryHoldSchema.index({ status: 1, expiresAt: 1 });
/* One active hold per booking per departure — a retried checkout must not
 * stack holds and eat the departure. */
inventoryHoldSchema.index(
  { departure: 1, booking: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

/*
 * Backstop only. Expires rows a week after they lapse, long after the sweeper
 * should have resolved them and decremented the counter — deleting earlier
 * would destroy the audit trail of a departure that filled up, and deleting
 * at all does not itself free the seat.
 */
inventoryHoldSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, name: 'hold_ttl_backstop' },
);

export const InventoryHold =
  mongoose.models.InventoryHold ?? mongoose.model('InventoryHold', inventoryHoldSchema);
export default InventoryHold;
