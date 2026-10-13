import { RequestMetric, HISTOGRAM_EDGES } from '../models/RequestMetric.js';

/*
 * In-process counters, flushed to MongoDB on a timer.
 *
 * The hot path here runs on every single request, so it does no I/O, no
 * allocation beyond one map entry per distinct route-minute, and no awaiting.
 * Recording a request is a few integer increments on an object already in
 * memory. The database only sees a write every FLUSH_INTERVAL_MS, and then
 * one write per distinct key rather than one per request.
 *
 * WHAT IS LOST, AND WHY THAT IS THE RIGHT TRADE
 *
 * A process killed between flushes loses up to FLUSH_INTERVAL_MS of counters.
 * That is acceptable for traffic statistics in a way it would never be for a
 * lead: nobody makes a decision on the difference between 41,900 and 42,000
 * requests, and buying that last ten seconds would mean a database write on
 * every request, which is exactly the load the dashboard exists to watch for.
 *
 * Errors and security events are *not* handled this way — they are written
 * individually, because losing one of those does change what you conclude.
 */
const FLUSH_INTERVAL_MS = Number(process.env.METRICS_FLUSH_MS ?? 15_000);

/*
 * A ceiling on distinct keys between flushes. Routes are bounded by the API,
 * so this can only be approached by a bug — a parameterised path that escaped
 * normalisation, say. Dropping the overflow keeps a memory leak from becoming
 * an outage, and the counter below makes the drop visible instead of silent.
 */
const MAX_KEYS = 5000;

let counters = new Map();
let droppedKeys = 0;
let timer = null;
let flushing = false;

/* Minute resolution: finer makes the charts noisy and the collection large
 * without making anything clearer at the timescales anyone looks at. */
function bucketFor(date) {
  const ms = date.getTime();
  return new Date(ms - (ms % 60_000));
}

function histogramKey(ms) {
  for (const [key, edge] of HISTOGRAM_EDGES) {
    if (ms <= edge) return key;
  }
  return 'inf';
}

/*
 * The route pattern, not the URL.
 *
 * Fastify knows the pattern it matched, which is the correct answer and costs
 * nothing. The fallbacks matter though: a request that matched nothing has no
 * pattern, and recording its raw URL would let anyone inflate the collection
 * by requesting random paths. So unmatched requests are all recorded under one
 * key, which is also the honest description of what they are.
 */
export function routeOf(request) {
  const pattern = request.routeOptions?.url ?? request.routerPath;
  if (pattern) return pattern;
  return request.is404 || !request.routeOptions ? '(unmatched)' : request.url.split('?')[0];
}

export function recordRequest({ route, method, statusCode, durationMs, at = new Date() }) {
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  const bucket = bucketFor(at);
  const key = `${bucket.getTime()}|${route}|${method}|${statusClass}`;

  let entry = counters.get(key);
  if (!entry) {
    if (counters.size >= MAX_KEYS) {
      droppedKeys += 1;
      return;
    }
    entry = {
      bucket,
      route,
      method,
      statusClass,
      count: 0,
      durationSum: 0,
      durationMax: 0,
      buckets: {},
    };
    counters.set(key, entry);
  }

  entry.count += 1;
  entry.durationSum += durationMs;
  if (durationMs > entry.durationMax) entry.durationMax = durationMs;

  const slot = histogramKey(durationMs);
  entry.buckets[slot] = (entry.buckets[slot] ?? 0) + 1;
}

/*
 * Everything is `$inc` and `$max`, never `$set`.
 *
 * That is what makes the flush safe under clustering: four workers all
 * incrementing the same minute's document converge on the true total, in any
 * order, with no coordination between them. `$set` would have the last worker
 * to finish overwrite the other three.
 */
export async function flushMetrics() {
  if (flushing || counters.size === 0) return 0;
  flushing = true;

  /* Swapped out before awaiting anything, so requests arriving during the
   * write land in the new map and are not lost or double-counted. */
  const pending = counters;
  counters = new Map();

  try {
    const operations = [...pending.values()].map((entry) => {
      const inc = {
        count: entry.count,
        durationSum: entry.durationSum,
      };
      for (const [slot, value] of Object.entries(entry.buckets)) {
        inc[`buckets.${slot}`] = value;
      }

      return {
        updateOne: {
          filter: {
            bucket: entry.bucket,
            route: entry.route,
            method: entry.method,
            statusClass: entry.statusClass,
          },
          update: { $inc: inc, $max: { durationMax: entry.durationMax } },
          upsert: true,
        },
      };
    });

    /* Unordered: one failing key should not abandon the rest of the batch. */
    await RequestMetric.bulkWrite(operations, { ordered: false });
    return operations.length;
  } catch (error) {
    /*
     * Counters are not put back. A failed flush that re-queued its batch
     * would retry the same failing write forever while new traffic piled up
     * behind it — the metrics would then be the thing that took the site down.
     * Losing a window of statistics is the lesser harm, and it is visible:
     * the chart has a gap, which is a truthful signal that something was
     * wrong with the database at that moment.
     */
    throw error;
  } finally {
    flushing = false;
  }
}

export function startMetricsFlusher(logger) {
  if (timer) return;
  timer = setInterval(() => {
    flushMetrics().catch((error) => {
      logger?.warn({ err: error }, 'metrics flush failed; this window of counters is lost');
    });
  }, FLUSH_INTERVAL_MS);
  /* Unref'd so a pending flush timer never holds the process open on
   * shutdown; the explicit flush in stopMetricsFlusher is what persists the
   * final window. */
  timer.unref?.();
}

export async function stopMetricsFlusher() {
  if (timer) clearInterval(timer);
  timer = null;
  /* One last flush, so a graceful restart does not throw away the window it
   * was in the middle of. */
  await flushMetrics().catch(() => {});
}

/* Test and health-check seam: lets a caller assert on what is pending without
 * waiting for a timer, and surfaces the overflow counter. */
export function metricsState() {
  return { pendingKeys: counters.size, droppedKeys, flushIntervalMs: FLUSH_INTERVAL_MS };
}

export function resetMetrics() {
  counters = new Map();
  droppedKeys = 0;
}

/*
 * Percentiles from summed histogram buckets.
 *
 * Linear interpolation inside the bucket that contains the target rank, which
 * is the standard approach and is honest about its own precision: a p99 of
 * 340ms read off these edges means "between 250 and 500, nearer 500", not
 * 340 exactly. Reporting it as an exact figure the data cannot support would
 * be worse than reporting a range.
 *
 * `observedMax` is the clamp, and it is not an optimisation.
 *
 * Interpolation knows only the bucket edges, so a single request of 681ms
 * lands in the 500–1000 bucket and the p99 is reported as 905ms — larger than
 * the slowest request that has ever happened. The dashboard then prints "99th
 * percentile 905ms" directly above "slowest seen 681ms", which is impossible
 * on its face and makes a reader rightly distrust every other number on the
 * page. A percentile cannot exceed the largest value in the set, and
 * durationMax is that value, so it is passed in and the estimate is capped.
 */
export function percentileFromBuckets(buckets, percentile, observedMax = Number.POSITIVE_INFINITY) {
  const edges = HISTOGRAM_EDGES.map(([key, edge]) => [key, edge]);
  const total = edges.reduce((sum, [key]) => sum + (buckets?.[key] ?? 0), 0);
  if (total === 0) return 0;

  const target = total * percentile;
  let cumulative = 0;
  let lower = 0;

  const cap = (value) => Math.min(Math.round(value), Math.round(observedMax));

  for (const [key, edge] of edges) {
    const inBucket = buckets?.[key] ?? 0;
    if (cumulative + inBucket >= target) {
      /* The open-ended top bucket has no upper edge to interpolate towards,
       * so the honest answer is the largest value actually seen. */
      if (!Number.isFinite(edge)) return cap(Number.isFinite(observedMax) ? observedMax : lower);
      if (inBucket === 0) return cap(lower);
      const within = (target - cumulative) / inBucket;
      return cap(lower + (edge - lower) * within);
    }
    cumulative += inBucket;
    if (Number.isFinite(edge)) lower = edge;
  }

  return cap(lower);
}
