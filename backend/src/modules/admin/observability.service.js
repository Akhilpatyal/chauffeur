import { RequestMetric, HISTOGRAM_EDGES } from '../../models/RequestMetric.js';
import { ErrorEvent } from '../../models/ErrorEvent.js';
import { SecurityEvent } from '../../models/SecurityEvent.js';
import { VisitorSession } from '../../models/VisitorSession.js';
import { Lead } from '../../models/Lead.js';
import { percentileFromBuckets, metricsState, flushMetrics } from '../../services/metrics.js';
import { notFound } from '../../lib/errors.js';

/*
 * The read side of the observability dashboard.
 *
 * Everything here is an aggregation over pre-bucketed data, which is what
 * makes the dashboard cheap enough to leave open. The one rule applied
 * throughout: never compute a statistic the stored data cannot support.
 * Percentiles come from summed histogram buckets, not from averaging
 * per-minute percentiles, because the average of percentiles is a number with
 * no meaning and would be confidently wrong.
 */

const RANGE_PRESETS = {
  '1h': { ms: 60 * 60 * 1000, granularityMs: 60_000 },
  '6h': { ms: 6 * 60 * 60 * 1000, granularityMs: 5 * 60_000 },
  '24h': { ms: 24 * 60 * 60 * 1000, granularityMs: 15 * 60_000 },
  '7d': { ms: 7 * 24 * 60 * 60 * 1000, granularityMs: 60 * 60_000 },
  '30d': { ms: 30 * 24 * 60 * 60 * 1000, granularityMs: 6 * 60 * 60_000 },
};

export function resolveRange(range = '24h') {
  const preset = RANGE_PRESETS[range] ?? RANGE_PRESETS['24h'];
  const until = new Date();
  return { since: new Date(until.getTime() - preset.ms), until, ...preset };
}

const BUCKET_FIELDS = HISTOGRAM_EDGES.map(([key]) => key);

function rateLabelFor(requests, minutes) {
  if (requests === 0) return 'no traffic in this range';
  const perMinute = requests / minutes;
  if (perMinute >= 1) return `${Math.round(perMinute * 10) / 10}/min average`;
  const perHour = perMinute * 60;
  if (perHour >= 1) return `${Math.round(perHour * 10) / 10}/hour average`;
  return `${Math.round(perHour * 24 * 10) / 10}/day average`;
}

/* Summing the histogram once and reading every percentile off the same totals
 * means p50, p95 and p99 can never disagree with each other. */
function sumBuckets(rows) {
  const totals = {};
  for (const key of BUCKET_FIELDS) totals[key] = 0;
  for (const row of rows) {
    for (const key of BUCKET_FIELDS) totals[key] += row.buckets?.[key] ?? 0;
  }
  return totals;
}

/*
 * `$group` accumulators that sum the histogram inside the pipeline.
 *
 * The obvious version pushes every minute's `buckets` object into an array and
 * adds them up in Node. That reads fine at a day's scale and falls over at a
 * month's: a 30-day chart groups into 120 points, and each point would be
 * carrying one object per minute per route per status class — tens of
 * thousands of them, in a pipeline stage with a 100MB ceiling. Summing eight
 * integers per group instead keeps the stage flat whatever the range.
 */
const bucketSumStage = Object.fromEntries(
  BUCKET_FIELDS.map((key) => [`b_${key}`, { $sum: `$buckets.${key}` }]),
);

/* Back into the shape percentileFromBuckets expects. */
const bucketsFromRow = (row) =>
  Object.fromEntries(BUCKET_FIELDS.map((key) => [key, row[`b_${key}`] ?? 0]));

/* `observedMax` is required, not optional: without it a percentile can be
 * reported above the slowest request that ever happened. See the note in
 * services/metrics.js. */
function latencyOf(buckets, observedMax) {
  return {
    p50: percentileFromBuckets(buckets, 0.5, observedMax),
    p95: percentileFromBuckets(buckets, 0.95, observedMax),
    p99: percentileFromBuckets(buckets, 0.99, observedMax),
  };
}

/*
 * The numbers at the top of the dashboard.
 *
 * Pending counters are flushed first. Without that, a dashboard opened
 * seconds after a request would show zero for it and look broken — the most
 * common way to look at the dashboard is right after doing something.
 */
export async function trafficSummary({ range = '24h' } = {}) {
  await flushMetrics().catch(() => {});
  const { since, until } = resolveRange(range);

  const rows = await RequestMetric.find({ bucket: { $gte: since } })
    .select('route method statusClass count durationSum durationMax buckets')
    .lean();

  const totals = rows.reduce(
    (acc, row) => {
      acc.requests += row.count;
      acc.durationSum += row.durationSum;
      acc.durationMax = Math.max(acc.durationMax, row.durationMax ?? 0);
      if (row.statusClass === '5xx') acc.serverErrors += row.count;
      if (row.statusClass === '4xx') acc.clientErrors += row.count;
      return acc;
    },
    { requests: 0, durationSum: 0, durationMax: 0, serverErrors: 0, clientErrors: 0 },
  );

  const histogram = sumBuckets(rows);
  const minutes = Math.max(1, (until - since) / 60_000);

  return {
    range,
    since,
    until,
    requests: totals.requests,
    /* Per minute, because the capacity question is asked in requests per
     * minute and a figure the reader has to divide is one they will misread. */
    requestsPerMinute: Math.round((totals.requests / minutes) * 10) / 10,
    /*
     * The same rate in whichever unit is actually readable.
     *
     * A quiet week is a real and common state for this site, and "57 requests,
     * 0/min average" printed side by side looks like a broken counter rather
     * than a quiet week. Switching the unit once the rate drops below one a
     * minute keeps the pair consistent with each other.
     */
    rateLabel: rateLabelFor(totals.requests, minutes),
    avgDurationMs: totals.requests > 0 ? Math.round(totals.durationSum / totals.requests) : 0,
    maxDurationMs: Math.round(totals.durationMax),
    latencyMs: latencyOf(histogram, totals.durationMax),
    serverErrors: totals.serverErrors,
    clientErrors: totals.clientErrors,
    /* Only 5xx counts against us. Folding 4xx in would make a day of people
     * mistyping URLs look like an outage. */
    errorRate:
      totals.requests > 0
        ? Math.round((totals.serverErrors / totals.requests) * 10_000) / 100
        : 0,
    /* Surfaced so the dashboard can say "this is accurate as of N seconds
     * ago" rather than implying it is live to the millisecond. */
    collector: metricsState(),
  };
}

/*
 * The traffic chart.
 *
 * Buckets are rolled up server-side to the granularity of the range — a
 * 30-day chart at minute resolution is 43,200 points for maybe 900 pixels of
 * screen, which is slow to send and no more informative.
 */
export async function trafficSeries({ range = '24h' } = {}) {
  await flushMetrics().catch(() => {});
  const { since, granularityMs } = resolveRange(range);

  const rows = await RequestMetric.aggregate([
    { $match: { bucket: { $gte: since } } },
    {
      $group: {
        _id: {
          $toDate: {
            $subtract: [{ $toLong: '$bucket' }, { $mod: [{ $toLong: '$bucket' }, granularityMs] }],
          },
        },
        requests: { $sum: '$count' },
        durationSum: { $sum: '$durationSum' },
        durationMax: { $max: '$durationMax' },
        serverErrors: { $sum: { $cond: [{ $eq: ['$statusClass', '5xx'] }, '$count', 0] } },
        clientErrors: { $sum: { $cond: [{ $eq: ['$statusClass', '4xx'] }, '$count', 0] } },
        ...bucketSumStage,
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => {
    const histogram = bucketsFromRow(row);
    return {
      at: row._id,
      requests: row.requests,
      serverErrors: row.serverErrors,
      clientErrors: row.clientErrors,
      avgDurationMs: row.requests > 0 ? Math.round(row.durationSum / row.requests) : 0,
      p95DurationMs: percentileFromBuckets(histogram, 0.95, row.durationMax),
    };
  });
}

/*
 * Per-route table, sorted by whatever the reader is hunting for.
 *
 * Sorting by total time rather than by average is the default elsewhere in
 * this file's spirit but not here: both are offered, because they answer
 * different questions. A slow endpoint called twice a day matters less than a
 * middling one called constantly, and only total time shows that.
 */
export async function routeBreakdown({ range = '24h', sort = 'requests', limit = 50 } = {}) {
  await flushMetrics().catch(() => {});
  const { since } = resolveRange(range);

  const rows = await RequestMetric.aggregate([
    { $match: { bucket: { $gte: since } } },
    {
      $group: {
        _id: { route: '$route', method: '$method' },
        requests: { $sum: '$count' },
        durationSum: { $sum: '$durationSum' },
        durationMax: { $max: '$durationMax' },
        serverErrors: { $sum: { $cond: [{ $eq: ['$statusClass', '5xx'] }, '$count', 0] } },
        clientErrors: { $sum: { $cond: [{ $eq: ['$statusClass', '4xx'] }, '$count', 0] } },
        ...bucketSumStage,
      },
    },
  ]);

  const table = rows.map((row) => {
    const histogram = bucketsFromRow(row);
    return {
      route: row._id.route,
      method: row._id.method,
      requests: row.requests,
      avgDurationMs: row.requests > 0 ? Math.round(row.durationSum / row.requests) : 0,
      maxDurationMs: Math.round(row.durationMax ?? 0),
      latencyMs: latencyOf(histogram, row.durationMax ?? 0),
      serverErrors: row.serverErrors,
      clientErrors: row.clientErrors,
      errorRate:
        row.requests > 0 ? Math.round((row.serverErrors / row.requests) * 10_000) / 100 : 0,
      /* Total milliseconds this route consumed. The one column that ranks
       * "where would optimising actually help" correctly. */
      totalTimeMs: Math.round(row.durationSum),
    };
  });

  const comparators = {
    requests: (a, b) => b.requests - a.requests,
    slowest: (a, b) => b.latencyMs.p95 - a.latencyMs.p95,
    errors: (a, b) => b.serverErrors - a.serverErrors || b.errorRate - a.errorRate,
    time: (a, b) => b.totalTimeMs - a.totalTimeMs,
  };

  return table.sort(comparators[sort] ?? comparators.requests).slice(0, limit);
}

export async function listErrors({ status, range, route, q, page = 1, pageSize = 25 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (route) filter.route = route;
  if (range) filter.lastSeenAt = { $gte: resolveRange(range).since };
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ message: new RegExp(safe, 'i') }, { name: new RegExp(safe, 'i') }];
  }

  const [items, total, openCount] = await Promise.all([
    ErrorEvent.find(filter)
      /* Newest occurrence first, not highest count: a thousand copies of a
       * fault fixed last week is less urgent than one that started an hour
       * ago, and the count column is right there for ranking by volume. */
      .sort({ lastSeenAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      /* Samples excluded from the list: they are the bulk of each document and
       * only the detail view reads them. */
      .select('-samples -stack')
      .populate('resolvedBy', 'name email')
      .lean(),
    ErrorEvent.countDocuments(filter),
    ErrorEvent.countDocuments({ status: 'open' }),
  ]);

  return { items, total, page, pageSize, openCount };
}

export async function getError(id) {
  const group = await ErrorEvent.findById(id).populate('resolvedBy', 'name email').lean();
  if (!group) throw notFound('Error group');
  return group;
}

/*
 * Acknowledging and resolving.
 *
 * `resolvedAt` is kept even after a regression reopens the group, because
 * "fixed, then came back twice" is the useful history and overwriting it would
 * erase the evidence that the fix did not hold.
 */
export async function setErrorStatus(id, { status, note }, actor) {
  const group = await ErrorEvent.findById(id);
  if (!group) throw notFound('Error group');

  group.status = status;
  if (note !== undefined) group.note = note;
  if (status === 'resolved') {
    group.resolvedAt = new Date();
    group.resolvedBy = actor.id;
  }
  await group.save();
  return group.toJSON();
}

export async function securityTimeline({
  range = '24h',
  type,
  severity,
  ipHash,
  actorEmail,
  page = 1,
  pageSize = 50,
} = {}) {
  const { since } = resolveRange(range);
  const filter = { createdAt: { $gte: since } };
  if (type) filter.type = type;
  if (severity) filter.severity = severity;
  if (ipHash) filter.ipHash = ipHash;
  if (actorEmail) filter.actorEmail = String(actorEmail).toLowerCase();

  const [items, total, byType, bySeverity] = await Promise.all([
    SecurityEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('actor', 'name email role')
      .lean(),
    SecurityEvent.countDocuments(filter),
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
  ]);

  /*
   * The addresses with the most failed sign-ins, which is the one view that
   * turns a flat timeline into an answer. A single failure is somebody's
   * caps lock; forty from one address is somebody working through a list.
   */
  const topFailingSources = await SecurityEvent.aggregate([
    { $match: { createdAt: { $gte: since }, type: { $in: ['login.failed', 'login.locked'] } } },
    {
      $group: {
        _id: '$ipHash',
        attempts: { $sum: 1 },
        /* Distinct addresses tried from one source: one is a forgotten
         * password, a dozen is enumeration. */
        accounts: { $addToSet: '$actorEmail' },
        lastAt: { $max: '$createdAt' },
      },
    },
    { $sort: { attempts: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        ipHash: '$_id',
        attempts: 1,
        accountsTried: { $size: '$accounts' },
        lastAt: 1,
      },
    },
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    byType: byType.map((row) => ({ type: row._id, count: row.count })),
    bySeverity: Object.fromEntries(bySeverity.map((row) => [row._id, row.count])),
    topFailingSources,
  };
}

/*
 * The visitor funnel.
 *
 * Bots are excluded from every figure by default and counted separately, so
 * the conversion rate is a rate among people. Reporting a rate that silently
 * includes crawlers understates it by whatever the crawl volume happens to be
 * that week, which makes the number useless for comparing two weeks.
 */
export async function visitorSummary({ range = '24h', includeBots = false } = {}) {
  const { since, granularityMs } = resolveRange(range);
  const base = { startedAt: { $gte: since } };
  const human = includeBots ? base : { ...base, isBot: false };

  const [sessions, botSessions, converted, pageViewTotal] = await Promise.all([
    VisitorSession.countDocuments(human),
    VisitorSession.countDocuments({ ...base, isBot: true }),
    VisitorSession.countDocuments({ ...human, converted: true }),
    VisitorSession.aggregate([
      { $match: human },
      { $group: { _id: null, views: { $sum: '$pageViewCount' } } },
    ]),
  ]);

  const [topLanding, topExit, series, sources] = await Promise.all([
    VisitorSession.aggregate([
      { $match: human },
      {
        $group: {
          _id: '$landingPath',
          sessions: { $sum: 1 },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 15 },
      {
        $project: {
          _id: 0,
          path: '$_id',
          sessions: 1,
          converted: 1,
          /* The number the lead table cannot produce: enquiries over
           * visitors, per page. A page with traffic and no enquiries is the
           * most actionable row on the dashboard. */
          conversionRate: {
            $cond: [
              { $gt: ['$sessions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$converted', '$sessions'] }, 100] }, 2] },
              0,
            ],
          },
        },
      },
    ]),
    VisitorSession.aggregate([
      { $match: { ...human, pageViewCount: { $gt: 1 } } },
      { $group: { _id: '$exitPath', sessions: { $sum: 1 } } },
      { $sort: { sessions: -1 } },
      { $limit: 15 },
      { $project: { _id: 0, path: '$_id', sessions: 1 } },
    ]),
    VisitorSession.aggregate([
      { $match: human },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: '$startedAt' },
                { $mod: [{ $toLong: '$startedAt' }, granularityMs] },
              ],
            },
          },
          sessions: { $sum: 1 },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, at: '$_id', sessions: 1, converted: 1 } },
    ]),
    VisitorSession.aggregate([
      { $match: human },
      {
        $group: {
          _id: {
            /* Campaign attribution first, referrer second, direct last. A
             * visit that carries a utm_source arrived from a campaign even if
             * the browser also sent a referrer. */
            $ifNull: ['$utm.source', { $ifNull: ['$referrerHost', 'direct'] }],
          },
          sessions: { $sum: 1 },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { sessions: -1 } },
      { $limit: 15 },
      { $project: { _id: 0, source: '$_id', sessions: 1, converted: 1 } },
    ]),
  ]);

  const [devices, enquiries] = await Promise.all([
    VisitorSession.aggregate([
      { $match: human },
      {
        $group: {
          _id: '$device',
          sessions: { $sum: 1 },
          converted: { $sum: { $cond: ['$converted', 1, 0] } },
        },
      },
      { $sort: { sessions: -1 } },
      { $project: { _id: 0, device: '$_id', sessions: 1, converted: 1 } },
    ]),
    Lead.countDocuments({ createdAt: { $gte: since } }),
  ]);

  const views = pageViewTotal[0]?.views ?? 0;

  return {
    range,
    since,
    sessions,
    botSessions,
    pageViews: views,
    pagesPerSession: sessions > 0 ? Math.round((views / sessions) * 100) / 100 : 0,
    converted,
    conversionRate: sessions > 0 ? Math.round((converted / sessions) * 10_000) / 100 : 0,
    /* Shown beside the attributed count on purpose. Enquiries arrive from
     * people with tracking blocked and from the phone, so attributed will
     * always be lower — printing only the attributed figure would quietly
     * understate the marketing and nobody would know why. */
    enquiriesInRange: enquiries,
    attributionGap: Math.max(0, enquiries - converted),
    topLanding,
    topExit,
    sources,
    devices,
    series,
  };
}

/*
 * One row per interesting thing, flattened for CSV.
 *
 * Export is a separate permission because these rows carry more than the
 * dashboard shows: hashed addresses, user agents, correlation ids. Fine on
 * screen for someone investigating, worth a deliberate decision before it
 * leaves the building as a file.
 */
export async function observabilityExport({ dataset, range = '24h' }) {
  const { since } = resolveRange(range);

  if (dataset === 'routes') return routeBreakdown({ range, limit: 500 });

  if (dataset === 'errors') {
    const rows = await ErrorEvent.find({ lastSeenAt: { $gte: since } })
      .sort({ lastSeenAt: -1 })
      .limit(5000)
      .select('-samples -stack')
      .lean();
    return rows;
  }

  if (dataset === 'security') {
    const rows = await SecurityEvent.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(10_000)
      .lean();
    return rows;
  }

  if (dataset === 'visitors') {
    const rows = await VisitorSession.find({ startedAt: { $gte: since } })
      .sort({ startedAt: -1 })
      .limit(10_000)
      /* Page-by-page history excluded: it is the bulk of the document and a
       * spreadsheet cannot do anything with a nested array anyway. */
      .select('-pageViews')
      .lean();
    return rows;
  }

  throw notFound('Dataset');
}
