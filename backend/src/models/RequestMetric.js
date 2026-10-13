import mongoose from 'mongoose';

const { Schema } = mongoose;

/*
 * Pre-aggregated traffic, one document per minute per route per method per
 * status class.
 *
 * WHY AGGREGATED AND NOT ONE ROW PER REQUEST
 *
 * The brief is a site that stays fast with a thousand requests a minute. A
 * row per request would mean a thousand inserts a minute purely to describe
 * the thousand inserts a minute — the observability becomes the load. Worse,
 * every dashboard query would then scan those rows to draw a chart nobody
 * reads at per-request resolution.
 *
 * So the counters are kept in process memory and flushed as `$inc` upserts a
 * few times a minute. At a thousand requests a minute across twenty routes
 * this is tens of writes instead of a thousand, and a chart query reads the
 * minutes it needs directly.
 *
 * WHY ROUTE AND NOT URL
 *
 * `/api/v1/admin/leads/:id` not `/api/v1/admin/leads/665f…`. Grouping by raw
 * URL produces one row per lead ever viewed, which is unbounded cardinality:
 * the collection grows with traffic rather than with the size of the API, and
 * "how slow is the lead detail page" becomes unanswerable.
 */
const requestMetricSchema = new Schema(
  {
    /* Truncated to the minute. The unique index below is what makes a flush
     * idempotent across workers: every process increments the same document. */
    bucket: { type: Date, required: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    /* '2xx', '3xx', '4xx', '5xx'. Keeping the class rather than the exact code
     * holds cardinality down while still separating "working", "client got it
     * wrong" and "we broke". */
    statusClass: { type: String, required: true },

    count: { type: Number, default: 0 },
    durationSum: { type: Number, default: 0 },
    durationMax: { type: Number, default: 0 },

    /*
     * A fixed latency histogram, because percentiles cannot be averaged.
     * Taking the mean of per-minute p99s is a number with no meaning; summing
     * histogram buckets and reading the percentile off the total is correct at
     * any zoom level. The edges are in milliseconds and chosen around what
     * matters here: under 50ms is cached, over 1s is a complaint.
     */
    buckets: {
      le50: { type: Number, default: 0 },
      le100: { type: Number, default: 0 },
      le250: { type: Number, default: 0 },
      le500: { type: Number, default: 0 },
      le1000: { type: Number, default: 0 },
      le2500: { type: Number, default: 0 },
      le5000: { type: Number, default: 0 },
      inf: { type: Number, default: 0 },
    },
  },
  { timestamps: false, versionKey: false },
);

/* The upsert key. Unique so two workers flushing the same minute converge on
 * one document instead of racing to create two. */
requestMetricSchema.index(
  { bucket: 1, route: 1, method: 1, statusClass: 1 },
  { unique: true, name: 'metric_bucket_key' },
);
requestMetricSchema.index({ bucket: -1 });

/*
 * Thirty days, expired by MongoDB rather than by a cron job we would have to
 * remember to run. Long enough to compare this month with last week; short
 * enough that the collection has a ceiling.
 */
requestMetricSchema.index({ bucket: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const HISTOGRAM_EDGES = [
  ['le50', 50],
  ['le100', 100],
  ['le250', 250],
  ['le500', 500],
  ['le1000', 1000],
  ['le2500', 2500],
  ['le5000', 5000],
  ['inf', Number.POSITIVE_INFINITY],
];

export const RequestMetric =
  mongoose.models.RequestMetric ?? mongoose.model('RequestMetric', requestMetricSchema);
export default RequestMetric;
