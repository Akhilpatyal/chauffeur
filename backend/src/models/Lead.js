import mongoose from 'mongoose';
import { encryptField, decryptField, encryptionAvailable } from '../lib/crypto.js';

const { Schema } = mongoose;

export const LEAD_SOURCES = [
  'contact_form',
  'plan_my_trip',
  'journey_enquiry',
  'weekend_escape_enquiry',
  'group_tour_enquiry',
  'hotel_enquiry',
  'callback_request',
  'other',
];

/*
 * What the visitor was looking at when they enquired. This is what turns a
 * dashboard full of identical "Custom expedition" rows into a report of which
 * trips people actually ask about.
 */
export const INTEREST_KINDS = [
  'journey',
  'weekend_escape',
  'group_tour',
  'hotel',
  'destination',
];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

/* Per-channel delivery state. This is an outbox: the lead row itself records
 * whether its notifications made it out, so a queue outage is visible and
 * recoverable instead of silent. */
const deliverySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    queuedAt: Date,
    sentAt: Date,
    lastError: String,
    providerMessageId: String,
  },
  { _id: false },
);

const noteSchema = new Schema(
  {
    body: { type: String, required: true, maxlength: 5000 },
    author: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    authorName: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const statusChangeSchema = new Schema(
  {
    from: { type: String, enum: LEAD_STATUSES },
    to: { type: String, enum: LEAD_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    byName: String,
    reason: String,
  },
  { _id: false },
);

const leadSchema = new Schema(
  {
    /* Who */
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 32 },

    /*
     * Normalised email used to group repeat enquiries into one contact thread.
     * Gmail dots and plus-tags are folded so "maya+trip@gmail.com" and
     * "maya@gmail.com" land on the same thread for the sales agent.
     */
    contactKey: { type: String, required: true, index: true },

    /* What they asked for */
    source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
    topic: { type: String, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 5000 },
    travelDates: { type: String, trim: true, maxlength: 120 },
    groupSize: { type: String, trim: true, maxlength: 60 },

    /* Structured answers from the multi-step Plan My Trip modal. */
    tripPreferences: {
      destination: { type: String, trim: true, maxlength: 120 },
      vibe: { type: String, trim: true, maxlength: 120 },
      duration: { type: String, trim: true, maxlength: 120 },
      budget: { type: String, trim: true, maxlength: 120 },
      month: { type: String, trim: true, maxlength: 60 },
    },

    /* The specific journey / tour / stay the enquiry came from, when known. */
    interest: {
      kind: {
        type: String,
        enum: [...INTEREST_KINDS, null],
        default: null,
      },
      slug: { type: String, trim: true, maxlength: 120 },
      title: { type: String, trim: true, maxlength: 200 },
      ref: { type: Schema.Types.ObjectId, refPath: 'interest.refModel' },
      refModel: {
        type: String,
        enum: ['Journey', 'GroupTour', 'Hotel', 'Destination', null],
        default: null,
      },
    },

    /* Where it came from */
    context: {
      sourcePage: { type: String, trim: true, maxlength: 500 },
      referrer: { type: String, trim: true, maxlength: 500 },
      userAgent: { type: String, maxlength: 500 },
      /* The raw IP is never stored. A salted hash is enough to spot abuse
       * patterns while keeping the record out of scope for most of GDPR. */
      ipHash: { type: String, maxlength: 64 },
      country: String,
    },
    utm: {
      source: { type: String, trim: true, maxlength: 120 },
      medium: { type: String, trim: true, maxlength: 120 },
      campaign: { type: String, trim: true, maxlength: 200 },
      term: { type: String, trim: true, maxlength: 200 },
      content: { type: String, trim: true, maxlength: 200 },
      gclid: { type: String, trim: true, maxlength: 200 },
      fbclid: { type: String, trim: true, maxlength: 200 },
    },

    /* Sales pipeline */
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    assignedAt: Date,
    notes: { type: [noteSchema], default: [] },
    tags: { type: [String], default: [] },
    lostReason: { type: String, maxlength: 500 },

    /* Repeat enquiries from the same person inside the dedupe window point at
     * the first lead, so the agent sees one thread rather than three rows. */
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    enquiryCount: { type: Number, default: 1 },
    lastEnquiryAt: { type: Date, default: Date.now },

    /* Notification outbox */
    notifications: {
      adminEmail: { type: deliverySchema, default: () => ({}) },
      adminWhatsapp: { type: deliverySchema, default: () => ({}) },
      customerEmail: { type: deliverySchema, default: () => ({}) },
    },

    /* Consent and compliance */
    consent: {
      marketing: { type: Boolean, default: false },
      termsAcceptedAt: Date,
      capturedAt: { type: Date, default: Date.now },
      ipHash: String,
    },
    anonymisedAt: { type: Date, default: null },

    /*
     * Booking readiness.
     *
     * Deliberately present before bookings go live. When a payment provider is
     * wired in, a Booking document attaches here by id and this block records
     * the pipeline stage; nothing about the lead shape has to change.
     */
    booking: {
      stage: {
        type: String,
        enum: ['enquiry', 'quoted', 'deposit_pending', 'confirmed', 'cancelled'],
        default: 'enquiry',
      },
      quotedAmount: Number,
      currency: { type: String, default: 'INR' },
      provider: { type: String, enum: ['razorpay', 'stripe', null], default: null },
      /* Encrypted at rest, see lib/crypto.js. Never returned to the client. */
      providerRefEncrypted: { type: String, select: false },
      travellerCount: Number,
      departureDate: Date,
    },

    /* Set by the client to make a double-submit a no-op. */
    idempotencyKey: { type: String, default: null },

    /* reCAPTCHA v3 score at submission, for spam triage in the dashboard. */
    spamScore: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        if (ret.booking) delete ret.booking.providerRefEncrypted;
        return ret;
      },
    },
  },
);

/*
 * Indexes. Every one of these backs a query the dashboard actually issues.
 * Verify with .explain('executionStats') after changing any dashboard filter.
 */
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ email: 1, createdAt: -1 });
leadSchema.index({ contactKey: 1, createdAt: -1 });
leadSchema.index({ 'interest.slug': 1, createdAt: -1 });
leadSchema.index({ 'utm.source': 1, createdAt: -1 });

/* Free-text search across the fields an agent types into the search box. */
leadSchema.index(
  { name: 'text', email: 'text', message: 'text', topic: 'text' },
  { name: 'lead_search', weights: { name: 5, email: 5, topic: 2, message: 1 } },
);

/* Idempotency: unique only where the key exists, so most leads (no key) are
 * unaffected while a retried submit collides instead of duplicating. */
leadSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

/* Drives the outbox sweeper: find leads whose alerts never went out. */
leadSchema.index({ 'notifications.adminEmail.status': 1, createdAt: 1 });
leadSchema.index({ 'notifications.customerEmail.status': 1, createdAt: 1 });
leadSchema.index({ 'notifications.adminWhatsapp.status': 1, createdAt: 1 });

/* Retention sweep target: untouched, unconverted leads. */
leadSchema.index({ anonymisedAt: 1, status: 1, updatedAt: 1 });

leadSchema.virtual('isAnonymised').get(function isAnonymised() {
  return Boolean(this.anonymisedAt);
});

leadSchema.methods.setPaymentRef = function setPaymentRef(reference) {
  this.booking.providerRefEncrypted = encryptionAvailable()
    ? encryptField(reference)
    : reference;
};

leadSchema.methods.getPaymentRef = function getPaymentRef() {
  return decryptField(this.booking?.providerRefEncrypted);
};

export const Lead = mongoose.models.Lead ?? mongoose.model('Lead', leadSchema);
export default Lead;
