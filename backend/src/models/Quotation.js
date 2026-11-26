import mongoose from 'mongoose';
import { minorAmountField, DEFAULT_CURRENCY } from '../utils/money.js';

const { Schema } = mongoose;

/*
 * A priced offer against a booking.
 *
 * VERSIONS ARE NEVER OVERWRITTEN
 *
 * When the desk changes a price or an itinerary materially, a new version is
 * created and the previous one becomes `superseded`. It is not edited in
 * place. Two reasons, and the second is the real one:
 *
 *   - The customer accepted a specific set of numbers at a specific moment,
 *     and "what exactly did they agree to" has to be answerable later.
 *   - Editing an accepted quotation would silently move the goalposts after
 *     agreement. Whether or not anyone would do that deliberately, a schema
 *     that permits it is a schema that will eventually do it by accident.
 *
 * So acceptance is recorded against a version, and a changed quotation needs
 * fresh acceptance. Payment is only ever requested against an accepted,
 * unexpired version — enforced in the service, not just hoped for.
 */

export const QUOTATION_STATUSES = [
  /* Being written. Not visible to the customer. */
  'draft',
  'sent',
  'accepted',
  'declined',
  /* The customer asked for changes; the desk owes them a new version. */
  'changes_requested',
  /* A newer version exists. */
  'superseded',
  'expired',
];

/*
 * One line of the price breakdown.
 *
 * `unitAmount` × `quantity` rather than a single total, because a customer
 * reading "Accommodation ₹24,000" cannot check it, and "Accommodation, 4
 * nights × ₹6,000" they can. Arithmetic a reader can follow is arithmetic
 * they argue with less.
 */
const quotationItemSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    detail: { type: String, trim: true, maxlength: 500, default: null },
    category: {
      type: String,
      enum: ['accommodation', 'transport', 'activity', 'permit', 'meals', 'service', 'discount', 'tax', 'other'],
      default: 'other',
    },
    quantity: { type: Number, default: 1, min: 0 },
    unitLabel: { type: String, trim: true, maxlength: 60, default: null },
    /* Negative allowed: a discount is a line item like any other, and
     * modelling it as a separate field means it gets forgotten in a total. */
    unitAmount: minorAmountField({ required: true, allowNegative: true }),
    /* Denormalised quantity × unitAmount, computed on save. Stored so a
     * historic quotation keeps its arithmetic even if the rounding rule here
     * ever changes. */
    amount: minorAmountField({ allowNegative: true, defaultValue: 0 }),

    /* Internal cost, for margin. Never leaves the server — stripped by
     * toCustomerJSON and not selected by the customer-facing queries. */
    vendorCost: { ...minorAmountField({ allowNegative: true }), select: false },
  },
  { _id: true },
);

/* Exported so the parent can apply it before totalling, rather than relying
 * on this hook having already run — see computeTotals below. */
function lineAmount(item) {
  if (typeof item.unitAmount !== 'number') return item.amount ?? 0;
  return Math.round(item.unitAmount * (item.quantity ?? 1));
}

quotationItemSchema.pre('validate', function computeAmount(next) {
  this.amount = lineAmount(this);
  next();
});

const quotationSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    /* 1, 2, 3… unique per booking, enforced by the index below. */
    version: { type: Number, required: true, min: 1 },

    status: { type: String, enum: QUOTATION_STATUSES, default: 'draft', index: true },

    /* What is being offered, which for a custom trip is most of the value. */
    summary: { type: String, trim: true, maxlength: 2000, default: null },
    itinerary: {
      type: [
        new Schema(
          {
            day: { type: Number, min: 1 },
            title: { type: String, trim: true, maxlength: 200 },
            detail: { type: String, trim: true, maxlength: 2000 },
            stay: { type: String, trim: true, maxlength: 200 },
            meals: { type: String, trim: true, maxlength: 120 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    travellerCount: { type: Number, min: 1, max: 40, default: null },
    roomConfiguration: { type: String, trim: true, maxlength: 300, default: null },
    transportDetail: { type: String, trim: true, maxlength: 500, default: null },

    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },

    currency: { type: String, default: DEFAULT_CURRENCY, maxlength: 3 },
    items: { type: [quotationItemSchema], default: [] },

    /* Computed from items on save rather than supplied, so the total a
     * customer accepts always equals the lines they were shown. A total
     * passed in by a caller is a total that can disagree with its items. */
    subtotal: minorAmountField({ defaultValue: 0 }),
    taxAmount: minorAmountField({ defaultValue: 0 }),
    totalAmount: minorAmountField({ defaultValue: 0 }),

    advanceAmount: minorAmountField({ defaultValue: 0 }),
    paymentDeadline: { type: Date, default: null },

    cancellationTerms: { type: String, trim: true, maxlength: 3000, default: null },

    /* After this the offer lapses, because a Himalayan guesthouse will not
     * hold a room indefinitely on a maybe. */
    expiresAt: { type: Date, default: null, index: true },

    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    /* What the customer said when declining or asking for changes. The desk
     * needs it to produce a better version. */
    customerResponse: { type: String, trim: true, maxlength: 2000, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    /* Why this version differs from the last. Shown to the customer on a
     * revision so they are not left comparing two PDFs line by line. */
    revisionReason: { type: String, trim: true, maxlength: 1000, default: null },
  },
  { timestamps: true },
);

/* One version number per booking, enforced by the database rather than by
 * whoever remembers to check — two admins quoting at once would otherwise
 * both write version 2. */
quotationSchema.index({ booking: 1, version: 1 }, { unique: true });
quotationSchema.index({ booking: 1, status: 1 });
/* The sweeper that expires lapsed offers. */
quotationSchema.index({ status: 1, expiresAt: 1 });

/* Totals are derived, every time, from the lines. */
quotationSchema.pre('validate', function computeTotals(next) {
  const lines = this.items ?? [];

  /*
   * Each line is totalled here rather than trusted from the subdocument's own
   * pre-validate hook, because that hook has not run yet.
   *
   * Mongoose validates subdocuments as part of validating the parent, so on a
   * first save every `item.amount` is still 0 at this point. Reading them
   * here produced a quotation whose total was zero — and, worse, whose
   * deposit was then silently clamped to zero against it, because the guard
   * below compares the two. The figures only looked right on a second save,
   * once the amounts had been persisted. Computing them here makes the first
   * save correct and leaves the subdocument hook as the backstop.
   */
  for (const item of lines) item.amount = lineAmount(item);

  const taxable = lines.filter((item) => item.category !== 'tax');
  const taxes = lines.filter((item) => item.category === 'tax');

  this.subtotal = taxable.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  this.taxAmount = taxes.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  this.totalAmount = this.subtotal + this.taxAmount;

  /* A deposit larger than the trip is a typo, and catching it here is
   * cheaper than refunding it later. */
  if (this.advanceAmount > this.totalAmount) {
    this.advanceAmount = this.totalAmount;
  }

  next();
});

quotationSchema.virtual('balanceAmount').get(function balanceAmount() {
  return Math.max(0, (this.totalAmount ?? 0) - (this.advanceAmount ?? 0));
});

/* Only an accepted, unexpired quotation may be paid against. Expressed once
 * here so no route has to reassemble the rule. */
quotationSchema.methods.isPayable = function isPayable(now = new Date()) {
  if (this.status !== 'accepted') return false;
  if (this.expiresAt && this.expiresAt < now) return false;
  return (this.advanceAmount ?? 0) > 0;
};

quotationSchema.methods.toCustomerJSON = function toCustomerJSON() {
  const raw = this.toObject({ virtuals: true });
  delete raw.createdBy;
  delete raw.__v;
  /* Margin is ours. Even though vendorCost is select:false, a document that
   * happened to be loaded with it would otherwise serialise it. */
  for (const item of raw.items ?? []) delete item.vendorCost;
  return raw;
};

export const Quotation = mongoose.models.Quotation ?? mongoose.model('Quotation', quotationSchema);
export default Quotation;
