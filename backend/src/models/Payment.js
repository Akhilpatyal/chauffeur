import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * One attempt to move money.
 *
 * THE RULE THIS SCHEMA EXISTS TO ENFORCE
 *
 * A payment is `succeeded` only after the server has verified it with the
 * provider — a signed webhook, or a server-to-server fetch of the order. The
 * browser saying "payment complete" is a claim by an untrusted party. Anyone
 * can call that callback with a made-up order id, and a system that confirms
 * a ₹40,000 trip on it will eventually be asked to honour one.
 *
 * So `verifiedAt` and `verificationMethod` are not decoration. The booking
 * confirmation path checks them, and a payment without them cannot confirm
 * anything however hopeful its status looks.
 *
 * WHAT IS DELIBERATELY NOT STORED
 *
 * No card numbers, no CVV, no UPI handles, no provider API keys. The gateway
 * holds all of it; we keep opaque references. Anything else turns this
 * database into a PCI liability for no benefit — we never need to re-charge
 * a card, only to look a transaction up.
 */

export const PAYMENT_RECORD_STATUSES = [
  /* An order exists at the provider; the customer has not finished. */
  'created',
  /* They are in the gateway's flow. */
  'pending',
  /* Verified server-side. Only this status means money. */
  'succeeded',
  'failed',
  /* Abandoned or timed out. */
  'cancelled',
  'refunded',
  'partially_refunded',
];

export const PAYMENT_PURPOSES = ['advance', 'balance', 'addon', 'other'];

const refundSchema = new Schema(
  {
    amount: minorAmountField({ required: true }),
    reason: { type: String, trim: true, maxlength: 500, default: null },
    providerRefundId: { type: String, trim: true, maxlength: 120, default: null },
    status: {
      type: String,
      enum: ['requested', 'processing', 'completed', 'failed'],
      default: 'requested',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
);

const paymentSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    /* The version being paid against, so a later revision cannot retroactively
     * reinterpret what this money was for. */
    quotation: { type: Schema.Types.ObjectId, ref: 'Quotation', default: null },

    purpose: { type: String, enum: PAYMENT_PURPOSES, default: 'advance' },
    status: { type: String, enum: PAYMENT_RECORD_STATUSES, default: 'created', index: true },

    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    /* What we asked for. */
    amount: minorAmountField({ required: true }),
    /* What the provider says actually arrived. They can differ — a partial
     * capture, or a currency conversion — and the difference is the kind of
     * thing nobody notices until the books do not balance. */
    amountReceived: minorAmountField({ defaultValue: 0 }),

    provider: { type: String, trim: true, maxlength: 40, default: null },
    /* Opaque references. Indexed because a webhook arrives knowing only
     * these, and has to find this row fast. */
    providerOrderId: { type: String, trim: true, maxlength: 120, default: null, index: true },
    providerPaymentId: { type: String, trim: true, maxlength: 120, default: null, index: true },
    /* Card last four and the like, as the provider reports it. Enough for a
     * customer to recognise the transaction on their statement, not enough to
     * be worth stealing. */
    methodLabel: { type: String, trim: true, maxlength: 80, default: null },

    /*
     * The two fields that make a success real.
     *
     * Nothing may treat this payment as money without both. See the note at
     * the top of this file.
     */
    verifiedAt: { type: Date, default: null },
    verificationMethod: {
      type: String,
      enum: ['webhook_signature', 'server_fetch', 'manual_admin', null],
      default: null,
    },
    /* Who vouched for it, when a human did. A manually marked payment needs
     * a name against it. */
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },

    failureReason: { type: String, trim: true, maxlength: 500, default: null },

    /*
     * Idempotency, which for payments is not optional.
     *
     * Gateways retry webhooks, and will happily deliver the same event three
     * times. Unique and sparse: the key is set when the caller supplies one,
     * and a duplicate insert fails at the database rather than relying on a
     * read-then-write that two concurrent deliveries both pass.
     */
    idempotencyKey: { type: String, default: null },

    /* Every provider event seen for this payment, in order. Append-only in
     * practice: the service pushes, nothing rewrites. Lets a dispute be
     * reconstructed without asking the provider for their logs. */
    events: {
      type: [
        new Schema(
          {
            at: { type: Date, default: Date.now },
            kind: { type: String, trim: true, maxlength: 80 },
            providerEventId: { type: String, trim: true, maxlength: 120, default: null },
            /* Scrubbed of signatures and keys before it gets here. */
            payload: { type: Schema.Types.Mixed, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    refunds: { type: [refundSchema], default: [] },

    ipHash: { type: String, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ booking: 1, createdAt: -1 });
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
/* The uniqueness that stops a replayed webhook creating a second payment. */
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
/* A provider event id must only ever be applied once. */
paymentSchema.index({ provider: 1, providerPaymentId: 1 }, { sparse: true });

/* Total successfully refunded, derived from the refund rows rather than kept
 * as a counter that can drift from them. */
paymentSchema.virtual('refundedAmount').get(function refundedAmount() {
  return (this.refunds ?? [])
    .filter((refund) => refund.status === 'completed')
    .reduce((sum, refund) => sum + (refund.amount ?? 0), 0);
});

/*
 * The one question the rest of the system asks: is this money?
 *
 * Deliberately stricter than `status === 'succeeded'`. A status can be set by
 * any code path; this also demands the verification evidence, so a route that
 * optimistically marks success without verifying still cannot confirm a trip.
 */
paymentSchema.methods.isVerifiedSuccess = function isVerifiedSuccess() {
  return this.status === 'succeeded' && Boolean(this.verifiedAt) && Boolean(this.verificationMethod);
};

paymentSchema.methods.toCustomerJSON = function toCustomerJSON() {
  const raw = this.toObject({ virtuals: true });
  /* Raw provider payloads can carry contact details and internal notes from
   * the gateway; the customer gets the summary, not the transcript. */
  delete raw.events;
  delete raw.ipHash;
  delete raw.verifiedBy;
  delete raw.idempotencyKey;
  delete raw.__v;
  for (const refund of raw.refunds ?? []) delete refund.requestedBy;
  return raw;
};

export const Payment = mongoose.models.Payment ?? mongoose.model('Payment', paymentSchema);
export default Payment;
