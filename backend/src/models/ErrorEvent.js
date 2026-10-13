import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Errors, grouped rather than listed.
 *
 * A raw error log is unusable within a day: one broken deploy produces eight
 * thousand copies of the same stack trace and buries the single interesting
 * failure underneath. So each distinct fault is one document, identified by a
 * fingerprint, carrying a count and a handful of recent examples.
 *
 * The group is the unit of work: it can be acknowledged, resolved, and will
 * reopen by itself if it happens again after being resolved — which is the
 * only honest way to track whether a fix worked.
 */
const occurrenceSchema = new Schema(
  {
    at: { type: Date, required: true },
    correlationId: String,
    route: String,
    method: String,
    statusCode: Number,
    /* Who hit it, when they were signed in. Makes "only affects callers" or
     * "only this one user" visible, which a count never shows. */
    userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    userRole: String,
    ipHash: String,
    userAgent: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const errorEventSchema = new Schema(
  {
    /* Stable across occurrences, derived from the error name, the route and
     * the top of the stack — deliberately not from the message, because
     * messages interpolate ids and would fingerprint every occurrence apart. */
    fingerprint: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
    code: String,
    route: String,
    method: String,
    statusCode: Number,

    /* First few frames only. A full trace is megabytes across thousands of
     * groups and the frames past the first few are framework internals. */
    stack: { type: String, maxlength: 4000 },

    count: { type: Number, default: 1 },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, index: true },

    /* Capped at a handful by the recording service: enough to spot a pattern,
     * not an unbounded array that eventually breaks the document size limit. */
    samples: { type: [occurrenceSchema], default: [] },

    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
      index: true,
    },
    /* Set when resolved, and compared against lastSeenAt to detect a
     * regression: an error seen after it was marked fixed is reopened. */
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    note: { type: String, maxlength: 1000 },
    regressionCount: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

/* The dashboard's default view: what is broken now, worst first. */
errorEventSchema.index({ status: 1, lastSeenAt: -1 });
errorEventSchema.index({ count: -1 });
errorEventSchema.index({ route: 1, lastSeenAt: -1 });

export const ErrorEvent =
  mongoose.models.ErrorEvent ?? mongoose.model('ErrorEvent', errorEventSchema);
export default ErrorEvent;
