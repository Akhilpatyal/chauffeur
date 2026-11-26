import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Append-only history for one booking.
 *
 * WHY A SEPARATE COLLECTION
 *
 * The Booking document holds only current state. Every transition lands here
 * and nothing in this collection is ever updated or deleted. That is what
 * makes "when was this confirmed, and who confirmed it" answerable in March
 * about a trip that ran in October — which is precisely the question asked
 * when something has gone wrong and nobody can remember.
 *
 * It also drives the customer's timeline directly. The timeline is not a
 * hardcoded list of steps with dates filled in: it is these rows, in order.
 * A step that has not happened has no row, so a future stage can never render
 * as complete, which is the usual failure of a pretty progress bar.
 *
 * WHAT customerVisible MEANS
 *
 * The same stream serves two readers. An admin sees everything; a customer
 * sees the subset marked visible. "Rang the Kaza guesthouse, no answer, will
 * try tomorrow" is a real event worth recording and not one to show someone
 * who is wondering whether their holiday is happening. Marking it on the row
 * rather than filtering by type keeps the decision with the person writing
 * the event, who knows what it says.
 */

export const BOOKING_EVENT_TYPES = [
  'request.submitted',
  'availability.started',
  'availability.confirmed',
  'availability.unavailable',
  'alternative.proposed',
  'quotation.sent',
  'quotation.revised',
  'quotation.accepted',
  'quotation.declined',
  'quotation.changes_requested',
  'quotation.expired',
  'payment.requested',
  'payment.initiated',
  'payment.succeeded',
  'payment.failed',
  'payment.refunded',
  'booking.confirmed',
  'booking.rejected',
  'booking.cancelled',
  'documents.issued',
  'instructions.sent',
  'trip.started',
  'trip.completed',
  'review.requested',
  'vendor.requested',
  'vendor.confirmed',
  'vendor.rejected',
  'note.added',
  'customer.message',
  'admin.message',
];

const bookingEventSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },

    type: { type: String, enum: BOOKING_EVENT_TYPES, required: true, index: true },

    /* Written for the reader, not derived from the type at render time. The
     * wording of "we could not get the Chandratal permit" belongs with the
     * event, not in a switch statement in a component. */
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: null },

    /* Who caused it. `system` covers anything automatic — a quotation
     * expiring, a hold being released by the sweeper. */
    actorKind: {
      type: String,
      enum: ['customer', 'admin', 'system', 'vendor'],
      required: true,
      index: true,
    },
    actor: { type: Schema.Types.ObjectId, default: null },
    actorName: { type: String, trim: true, maxlength: 120, default: null },

    /* False by default: an event has to be deliberately published to the
     * customer. The safe direction for a mistake is an internal note the
     * customer never sees, not an internal note they do. */
    customerVisible: { type: Boolean, default: false, index: true },

    /* Set when the event leaves the customer with something to do. The
     * dashboard reads the most recent one to decide what to tell them next. */
    customerAction: {
      label: { type: String, trim: true, maxlength: 120, default: null },
      /* Relative, so it survives a domain change and cannot be used to
       * bounce somebody off-site from an email. */
      path: { type: String, trim: true, maxlength: 200, default: null },
      dueBy: { type: Date, default: null },
    },

    /* The state transition, where there was one. Recording both sides means
     * the history reconstructs without replaying business rules. */
    statusFrom: { type: String, default: null },
    statusTo: { type: String, default: null },

    /* Anything structured worth keeping — a quotation version, a payment id,
     * a vendor reference. Scrubbed of secrets by the service that writes it. */
    meta: { type: Schema.Types.Mixed, default: null },
  },
  {
    /* No updatedAt: nothing here is ever updated, and a column implying it
     * might be invites someone to try. */
    timestamps: { createdAt: true, updatedAt: false },
  },
);

/* The timeline query: one booking, oldest first. */
bookingEventSchema.index({ booking: 1, createdAt: 1 });
/* The customer's narrower view of the same thing. */
bookingEventSchema.index({ booking: 1, customerVisible: 1, createdAt: 1 });

/*
 * A guard rather than a convention.
 *
 * `findOneAndUpdate` and friends would otherwise let a future route quietly
 * rewrite history — which is the one thing this collection exists to prevent.
 * Failing loudly at the model is the only version of this rule that survives
 * somebody in a hurry.
 */
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  bookingEventSchema.pre(op, function blockMutation(next) {
    next(
      new Error(
        'BookingEvent is append-only: record a new event rather than editing or deleting history.',
      ),
    );
  });
}

export const BookingEvent =
  mongoose.models.BookingEvent ?? mongoose.model('BookingEvent', bookingEventSchema);
export default BookingEvent;
