# Taifer backend

Lead capture, content API and admin dashboard for the Taifer travel site.

The thing this service exists to get right: **an enquiry that reaches the server
is never lost.** The site's contact form previously showed a success panel
without sending anything anywhere. Everything below follows from not repeating
that — persistence before delivery, a retry path for every notification, and an
alarm when one gets stuck.

---

## Contents

- [How it fits together](#how-it-fits-together)
- [Local setup](#local-setup)
- [Project layout](#project-layout)
- [Environment variables](#environment-variables)
- [Running the tests](#running-the-tests)
- [The admin dashboard](#the-admin-dashboard)
- [Deployment](#deployment)
- [Operations runbook](#operations-runbook)
- [Design decisions worth knowing](#design-decisions-worth-knowing)

---

## How it fits together

```
                  ┌──────────────┐
   browser ──────▶│  CDN / LB    │──▶ GET  /api/v1/journeys        (cached)
                  └──────┬───────┘    POST /api/v1/leads
                         │
                 ┌───────▼────────┐        ┌──────────────┐
                 │  API (N stateless      ─▶   MongoDB    │  leads, content,
                 │  instances)    │        │   (Atlas)    │  audit log
                 └───────┬────────┘        └──────────────┘
                         │ enqueue
                 ┌───────▼────────┐
                 │     Redis      │  cache · rate limits · BullMQ
                 └───────┬────────┘
                         │ consume
                 ┌───────▼────────┐        ┌──────────────┐
                 │  Worker (M     │───────▶│ Email /      │
                 │  instances)    │        │ WhatsApp     │
                 └────────────────┘        └──────────────┘
```

**The API and the workers are separate processes.** A slow email provider must
not consume the concurrency answering HTTP requests, and the two scale on
different signals: the API on request rate, the workers on queue depth.

### What happens when someone submits an enquiry

1. Rate limit and honeypot check, then reCAPTCHA if configured.
2. Idempotency: an `Idempotency-Key` header that has been seen before returns
   the original response instead of creating a second lead.
3. **The lead is written to MongoDB.** This happens before any notification is
   attempted, and it is the step that must not fail.
4. Two jobs are enqueued (admin alert, customer confirmation) and the outcome of
   the enqueue is written back onto the lead.
5. The response is returned.

If step 4 fails — Redis unreachable, for instance — the lead still exists with
its alerts marked `pending`, and the sweeper (every 5 minutes) queues them. A
non-zero "stuck" count appears on the dashboard. That chain is the whole point:
there is no path where a stored lead silently fails to reach anyone.

---

## Local setup

### With Docker (recommended)

```bash
cd backend
cp .env.example .env          # the defaults work as-is for local development
docker compose up -d          # mongo (replica set), redis, api, worker
npm install                   # for the scripts below
npm run seed                  # migrate the hardcoded frontend content
npm run admin:create -- --email you@example.com --name "Your Name"
```

The seed prints what it created; `admin:create` prints a one-time password.

- API: <http://localhost:4000>
- API docs: <http://localhost:4000/api/docs>
- Health: <http://localhost:4000/health> and `/ready`

### Without Docker

You need MongoDB and (optionally) Redis running locally.

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev        # API with file watching
npm run worker:dev # in a second terminal
```

**Redis is optional in development.** Leave `REDIS_URL` empty and the service
degrades deliberately: caching is bypassed, rate limiting falls back to
per-instance counters, and jobs run inline instead of being queued. That keeps a
fresh clone working with one dependency, and it is why the test suite exercises
the inline path. Production refuses to boot without Redis — see
[`src/config/env.js`](src/config/env.js).

### Pointing the site at it

The frontend proxies `/api` to `http://localhost:4000` in development, so no
configuration is needed:

```bash
cd ../frontend && npm run dev   # http://localhost:5173
```

---

## Project layout

```
backend/
├── src/
│   ├── app.js              Fastify app factory (used by server, tests, scripts)
│   ├── server.js           API entrypoint + graceful shutdown
│   ├── config/             env validation, logger, Sentry
│   ├── db/                 MongoDB and Redis connections
│   ├── lib/                cache, queue, errors, validation, crypto
│   ├── models/             Mongoose schemas and indexes
│   ├── modules/            one folder per feature: routes + service + schemas
│   │   ├── leads/          ← the important one
│   │   ├── newsletter/
│   │   ├── content/        registry-driven CRUD for all 7 collections
│   │   ├── auth/
│   │   ├── admin/
│   │   └── health/
│   ├── plugins/            security, auth, error handling, swagger
│   ├── services/           email, WhatsApp, storage, flags, retention, audit
│   ├── utils/              pagination, sanitising, slugs, CSV
│   └── workers/            BullMQ workers + the outbox sweeper
├── admin/                  React admin dashboard (separate Vite app)
├── scripts/                seed, create-admin, export-openapi, retention
├── seed/                   frontend data snapshot + the mapping to schemas
├── tests/                  Jest + in-memory MongoDB
└── load/                   k6 load profile
```

Two things in here are worth understanding before adding a feature:

**`src/modules/content/registry.js`** describes all seven content collections as
data — model, filters, sortable fields, list projection, cache tag. The routes
are generated from it. Adding a content type is an entry in that table, not a new
route file; the alternative is seven near-identical files that drift apart until
one forgets to invalidate its cache.

**`src/lib/validate.js`** makes Zod, not AJV, own request validation, so one
schema both validates and documents each endpoint. The pass-through compilers are
load-bearing — read the comment there before changing them.

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example), validated at boot
by [`src/config/env.js`](src/config/env.js), and the process exits with a clear
message if something required is missing.

The ones you must set in production:

| Variable | Why |
|---|---|
| `MONGODB_URI` | A **separate database per environment**. Never point staging at production. |
| `REDIS_URL` | Required in production: rate limiting across instances and the job queue both depend on it. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` | 32+ characters, all different. Boot fails on placeholders or a short value. |
| `CORS_ORIGINS` | Exact frontend origins, comma-separated. `*` is rejected. |
| `EMAIL_PROVIDER` + `EMAIL_API_KEY` | `resend`, `sendgrid` or `postmark`. Without this, the default `console` provider only logs. |
| `LEAD_ALERT_EMAILS` | Who gets the instant new-enquiry alert. If empty, nobody is told. |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Optional but worth configuring: `WHATSAPP_*` (instant alerts to phones),
`S3_*` (image uploads from the dashboard), `SENTRY_DSN`, `RECAPTCHA_SECRET`,
`FIELD_ENCRYPTION_KEY` (needed once you store payment references).

---

## Running the tests

```bash
npm test               # 95 tests
npm run test:coverage  # with coverage thresholds on the lead paths
npm run lint
```

The suite starts its own in-memory MongoDB per test file and runs with Redis
disabled, so there is nothing to set up and nothing to clean up. It covers:

- lead capture: validation, honeypot, idempotency, duplicate threading, outbox
  state, XSS and NoSQL-operator stripping, maintenance mode
- newsletter: the full double opt-in cycle including expiry and replay
- auth: lockout, refresh rotation, **reuse detection**, CSRF, RBAC
- content: draft visibility, filtering, sorting allow-list, slug stability, audit
- lead management: threading, CSV export (including formula injection), analytics,
  data-subject export and erasure
- the seed mapping, run against the real snapshot

Coverage thresholds are set per directory rather than globally: `leads/` and
`newsletter/` have real floors, because a global average lets a well-tested
utility file hide an untested payment-adjacent path.

### Load testing

```bash
k6 run -e BASE_URL=https://staging-api.taifer.com load/k6-leads.js
```

Target and thresholds are stated in [`load/README.md`](load/README.md) — 5,000
requests/minute sustained with 2x burst headroom. **Run it against staging only:**
the lead scenario writes rows that retention will not clear for two years.

---

## The admin dashboard

A small React app in [`admin/`](admin/), deployed as static files.

```bash
cd admin
npm install
npm run dev      # http://localhost:5174, proxies /api to localhost:4000
npm run build    # -> admin/dist
```

It covers lead management (filter, search, assign, status, notes, CSV export,
re-queue notifications), content CRUD for all seven collections with image
upload, analytics, feature flags, the audit log, and password changes.

Two deliberate choices: the access token is held in memory only, never in
`localStorage`, so an injected script cannot read it; and concurrent 401s share a
single refresh call, because six parallel refreshes would trip the server's reuse
detection and revoke the session.

---

## Deployment

The image is plain Docker, so it runs on Railway, Render, Fly.io, ECS or a VM
without vendor-specific configuration.

```bash
docker build -t taifer-backend .
```

**Deploy two services from the same image tag.** Same tag matters: a worker
running older code than the API will fail jobs whose payload shape it does not
recognise.

| Service | Command | Scale on |
|---|---|---|
| api | `node src/server.js` | request rate / CPU |
| worker | `node src/workers/index.js` | queue depth |

Run at least 2 API instances behind a load balancer. The API is stateless — no
session state in memory — so this works without sticky sessions.

Point the load balancer's health check at **`/ready`**, not `/health`:

- `/health` — is the process alive? Never touches a dependency. Failing means
  *restart the container*.
- `/ready` — can this instance serve? Checks MongoDB and Redis. Failing means
  *stop sending it traffic*, but do not restart it, because the fault is
  downstream.

Conflating the two turns a brief database blip into a restart storm.

### Release checklist

1. CI is green ([`.github/workflows/backend.yml`](../.github/workflows/backend.yml)
   runs lint, tests, audit, and boots the built image before allowing a deploy).
2. `npm run seed` if content mappings changed. It is idempotent — safe to run on
   every release.
3. Confirm `/ready` returns 200 on the new instances before draining the old ones.
4. Check the Settings page: `submissions_enabled` should be on.

### Also set up

- **HTTPS** enforced at the load balancer, redirecting http→https. The app sets
  HSTS in production but cannot redirect traffic it never receives.
- **A CDN** in front of the API. Public GETs already send
  `Cache-Control: s-maxage=…, stale-while-revalidate=600`, so a CDN absorbs most
  read traffic without the request reaching Node.
- **Uptime monitoring** hitting `/health` every minute (UptimeRobot, Better
  Stack). You should learn about downtime before a customer tells you.
- **Log shipping** — logs are structured JSON on stdout, ready for any
  aggregator. Do not leave them in the container.
- **Automated backups.** Atlas snapshots are not a backup strategy until you have
  restored one. Schedule a restore test; "Atlas probably has it" is how people
  discover their snapshots were scoped to the wrong cluster.
- **PM2 cluster mode** only if you self-host on a VM, to use every core. On a
  container platform, run more containers instead.

---

## Operations runbook

### "A customer says they submitted the form and nobody replied"

1. Find the lead in the dashboard by email.
2. If the lead is **not** there, nothing reached the server. Check the browser's
   network tab, the CORS origin list, and whether `submissions_enabled` was off.
3. If the lead **is** there, open it and look at the Notifications block. A
   `failed` or `pending` status with an error message tells you which provider
   refused and why. Use **Re-queue notifications**.
4. Every request carries an `x-request-id`, echoed in error responses and on every
   log line. Search the logs for it to get the full trace.

### "The dashboard shows N leads with stuck alerts"

The sweeper retries every 5 minutes, so a number that is falling needs no action.
If it is not falling, the workers are not running: check `/api/v1/admin/queues`
for queue depth and the worker logs for a provider error. The leads themselves are
safe — they are in MongoDB; only delivery is behind.

### "We need to take the forms offline for maintenance"

Settings → turn off `submissions_enabled`. The forms then show the configured
message instead of appearing to work. Turn it back on afterwards. Do not use this
to manage volume: a visitor who is told "try again later" mostly does not.

### "Someone asked us to delete their data"

Settings is not where this lives — use the compliance endpoints:

```bash
GET    /api/v1/admin/compliance/subject?email=person@example.com   # export
DELETE /api/v1/admin/compliance/subject?email=person@example.com   # erase
```

Leads are anonymised rather than deleted, so historical conversion figures do not
change retroactively; newsletter records are deleted outright. Both actions are
audited.

### "Did someone change this journey's price?"

Settings → Recent activity, or `GET /api/v1/admin/audit?entity=journeys`. Every
content and lead-status change records who, when, and only the fields that
changed.

### Retention

The worker anonymises unconverted leads older than `LEAD_RETENTION_DAYS` (default
730) and deletes unconfirmed newsletter signups after
`NEWSLETTER_UNCONFIRMED_RETENTION_DAYS` (default 30). Converted leads are exempt —
those are customer records with their own retention basis.

Check what it would do before the first run:

```bash
node scripts/run-retention.js --dry-run
```

---

## Design decisions worth knowing

**Persistence before delivery, with an outbox.** The lead row carries the delivery
state of each notification channel. A queue outage leaves a visible `pending`
rather than a silent loss, the sweeper retries it, and the dashboard counts what is
stuck. Notification handlers are idempotent per channel, so a retry caused by
WhatsApp failing does not re-send the admin email.

**Idempotency and duplicate detection are different things.** Idempotency stops
the *same* submission being stored twice (double-click, retry). Duplicate detection
links *different* submissions from the same person into one contact thread, so a
sales agent sees one person who enquired three times, not three unrelated rows.
Gmail dots and plus-tags are folded, so `maya.iyer@gmail.com` and
`mayaiyer+trips@gmail.com` are the same person.

**Spam is discarded with a fake success.** A honeypot hit returns 201 and stores
nothing. A bot that receives a rejection learns the trap and adapts; one that
receives a 201 keeps filling it. Likewise, reCAPTCHA being *unreachable* allows the
submission through and flags it — a lost genuine enquiry costs more than a spam row
someone deletes.

**Cache invalidation is by tag, not by TTL.** An admin edit drops every cached key
derived from that collection immediately. Waiting for a TTL means serving content
the editor can see is wrong, which teaches people to distrust the dashboard.

**Refresh tokens rotate, and reuse revokes the family.** Each refresh token is
single-use. Presenting a used one can only mean theft, so the whole session family
is revoked. One inconvenient re-login beats a silent session takeover.

**Permissions, not roles, at the route.** Routes declare what they need
(`leads:export`); the role-to-permission map lives in one place
([`src/models/AdminUser.js`](src/models/AdminUser.js)). Adding a third role is a
change to that table, not a hunt through every route file.

**`sanitizeFilter` is deliberately off.** Mongoose's global setting wraps any
object-valued filter in `$eq`, which breaks every legitimate operator the server
builds. Injection is blocked where untrusted data actually enters instead: request
bodies run through `stripMongoOperators`, and every query parameter is coerced to a
primitive or a Date by its Zod schema. The reasoning is in
[`src/db/mongoose.js`](src/db/mongoose.js).

**`/api/v1` from the first commit.** Retrofitting a version prefix later means
either breaking the live site or maintaining an unversioned alias forever.

**The Lead schema already has a `booking` block.** Stage, amount, provider and an
encrypted provider reference. When Razorpay or Stripe is wired in, a payment record
attaches by id — no migration of the lead shape, which is the expensive kind of
change once there is real data.

**CSV exports are escaped against formula injection.** A lead whose name starts
with `=` or `@` would otherwise execute as a formula when the export is opened in
Excel. That is a live injection path into the sales team's laptops, not a
formatting nit.

### Known gaps

Worth stating plainly rather than discovering later:

- **Email and WhatsApp templates are not localised.** The site advertises support
  in Hindi and English; the transactional emails are English only.
- **No webhook endpoint for provider delivery events.** Bounces and spam
  complaints from the ESP are not fed back onto the subscriber record, so a
  hard-bouncing address stays `confirmed`. The `bounced` status exists in the
  schema for when that is wired up.
- **The CSV export is capped at 10,000 rows** and buffers in memory. Above that it
  should stream.
- **Content is not versioned.** The audit log records what changed, but there is no
  one-click revert of a journey to yesterday's copy.
- **No end-to-end browser tests.** The API is covered by integration tests and the
  dashboard by hand; a Playwright run over the three public forms would be the
  highest-value addition.

---

## API documentation

Interactive docs at **`/api/docs`**, generated from the route schemas so they
cannot drift from the implementation. Export the spec with:

```bash
npm run openapi:export   # -> openapi.json
```

CI uploads it as an artefact on every run, so a change to a public endpoint's shape
shows up as a reviewable diff rather than a surprise after deploy.

### Endpoints at a glance

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/v1/leads` | All public forms. Send `Idempotency-Key`. |
| `POST` | `/api/v1/newsletter` | Starts double opt-in. |
| `GET` | `/api/v1/newsletter/confirm` | Opt-in link target; redirects to the site. |
| `GET` | `/api/v1/newsletter/unsubscribe` | One-click unsubscribe. |
| `GET` | `/api/v1/{journeys,destinations,group-tours,hotels,testimonials,team,articles}` | Paginated, filterable, cached. |
| `GET` | `/api/v1/{collection}/:slug` | Detail by slug. |
| `GET` | `/api/v1/home` | Homepage bundle in one request. |
| `POST` | `/api/v1/auth/login` · `/refresh` · `/logout` | Access token + httpOnly refresh cookie. |
| `*` | `/api/v1/admin/**` | Authenticated. Leads, content, analytics, audit, flags, uploads, compliance. |
| `GET` | `/health` · `/ready` | Liveness and readiness. |

All errors share one shape:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some fields need attention.", "details": [], "requestId": "…" } }
```
