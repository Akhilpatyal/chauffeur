# Load testing

Run these against **staging**, never production: the lead scenario writes rows,
and the retention job will not clean them up for two years.

```bash
# install k6: https://k6.io/docs/get-started/installation/
k6 run -e BASE_URL=https://staging-api.taifer.com load/k6-leads.js
```

## What the thresholds mean

| Threshold | Why this number |
|---|---|
| reads p95 < 300ms | These are Redis-cached and CDN-fronted; anything slower means the cache is missing or an index is not being used. |
| writes p95 < 800ms | One insert plus two queue pushes. Slower means MongoDB or Redis is saturated. |
| `lead_submit_failures` < 0.1% | A dropped enquiry is lost revenue. 429s are excluded — throttling a flood is correct behaviour, not a failure. |
| `http_req_failed` < 1% | Overall error budget across both scenarios. |

## Reading a failed run

- **Reads slow, writes fine** — cache misses. Check `redis_connected_clients`
  and whether `invalidateTags` is being called more often than expected.
- **Writes slow, reads fine** — MongoDB write contention or a missing index on
  `leads`. Re-check with `.explain('executionStats')` on the dedupe query.
- **Queue depth climbing in `/api/v1/admin/queues`** — the workers are the
  bottleneck, not the API. Scale the worker deployment, not the API one.
- **429s appearing below the target rate** — `RATE_LIMIT_*` is set too low for
  real traffic, or the limiter is running in-memory across several instances.
