import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import {
  Banner,
  Drawer,
  Stat,
  Tabs,
  Empty,
  Spinner,
  LineChart,
  RangePicker,
  SeverityBadge,
  Pager,
  formatMs,
  formatCount,
  formatAgo,
  formatDate,
  roleLabel,
} from '../components/ui.jsx';

/*
 * Monitoring.
 *
 * Four questions, four tabs: is the site up and fast, what is broken, is
 * anybody trying to get in, and are visitors turning into enquiries.
 *
 * Two deliberate choices run through the whole screen. Percentiles are shown
 * rather than averages, because an average response time hides exactly the
 * requests people complain about. And every figure that could be mistaken for
 * something it is not carries the thing it should be compared against — the
 * attributed conversions next to the total enquiries, the bot sessions next to
 * the human ones — so a number cannot quietly be read as more than it is.
 */
const TABS = [
  { key: 'traffic', label: 'Traffic' },
  { key: 'errors', label: 'Errors' },
  { key: 'security', label: 'Security' },
  { key: 'visitors', label: 'Visitors' },
];

const SECURITY_LABELS = {
  'login.success': 'Signed in',
  'login.failed': 'Failed sign-in',
  'login.locked': 'Account locked',
  'password.changed': 'Password changed',
  'token.refreshed': 'Session refreshed',
  'token.reuse_detected': 'Session token replayed',
  'session.revoked': 'Sessions ended',
  'permission.denied': 'Permission denied',
  'rate_limit.exceeded': 'Rate limit hit',
  'csrf.failed': 'CSRF check failed',
  'upload.rejected': 'Upload rejected',
  'recaptcha.failed': 'Captcha failed',
  'spam.blocked': 'Spam blocked',
};

export default function Observability({ user }) {
  const [tab, setTab] = useState('traffic');
  const [range, setRange] = useState('24h');
  const [error, setError] = useState(null);
  const [openErrors, setOpenErrors] = useState(0);

  const can = useCallback(
    (permission) => (user.permissions ?? []).includes(permission),
    [user.permissions],
  );

  const tabs = TABS.filter((item) =>
    item.key === 'security' ? can('security.view') : can('observability.view'),
  ).map((item) => (item.key === 'errors' ? { ...item, count: openErrors } : item));

  const download = async (dataset) => {
    try {
      const response = await api.observability.exportCsv(dataset, range);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taifer-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Monitoring</h2>
          <p>
            Traffic, failures, security events and the visitor funnel. Response times are shown as
            percentiles, because an average hides the slow requests people actually notice.
          </p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'traffic' && (
        <Traffic
          range={range}
          onError={setError}
          canExport={can('observability.export')}
          onExport={() => download('routes')}
        />
      )}
      {tab === 'errors' && (
        <Errors
          range={range}
          canResolve={can('observability.resolve')}
          canExport={can('observability.export')}
          onExport={() => download('errors')}
          onError={setError}
          onOpenCount={setOpenErrors}
        />
      )}
      {tab === 'security' && (
        <Security
          range={range}
          canExport={can('observability.export')}
          onExport={() => download('security')}
          onError={setError}
        />
      )}
      {tab === 'visitors' && (
        <Visitors
          range={range}
          canExport={can('observability.export')}
          onExport={() => download('visitors')}
          onError={setError}
        />
      )}
    </>
  );
}

function Traffic({ range, onError, canExport, onExport }) {
  const [data, setData] = useState(null);
  const [sort, setSort] = useState('requests');

  useEffect(() => {
    let live = true;
    Promise.all([
      api.observability.summary(range),
      api.observability.series(range),
      api.observability.routes({ range, sort, limit: 50 }),
    ])
      .then(([summary, series, routes]) => {
        if (!live) return;
        setData({ summary: summary.data, series: series.data, routes: routes.data });
      })
      .catch((requestError) => live && onError(requestError.message));
    return () => {
      live = false;
    };
  }, [range, sort, onError]);

  if (!data) return <Spinner>Loading traffic…</Spinner>;
  const { summary, series, routes } = data;

  return (
    <>
      <div className="stats">
        <Stat label="Requests" value={formatCount(summary.requests)} note={summary.rateLabel} />
        <Stat
          label="Median response"
          value={formatMs(summary.latencyMs.p50)}
          note="half of requests are faster than this"
        />
        <Stat
          label="95th percentile"
          value={formatMs(summary.latencyMs.p95)}
          /* The number worth watching: one request in twenty is slower than
             this, which is the experience people describe as "the site is
             slow" long before the average moves. */
          note="1 request in 20 is slower"
          warn={summary.latencyMs.p95 > 1000}
        />
        <Stat
          label="99th percentile"
          value={formatMs(summary.latencyMs.p99)}
          note={`slowest seen ${formatMs(summary.maxDurationMs)}`}
          warn={summary.latencyMs.p99 > 3000}
        />
        <Stat
          label="Failures"
          value={`${summary.errorRate}%`}
          note={`${formatCount(summary.serverErrors)} server errors`}
          warn={summary.errorRate > 1}
        />
        <Stat
          label="Rejected requests"
          value={formatCount(summary.clientErrors)}
          /* Kept out of the failure rate: a day of people mistyping URLs is
             not an outage, and folding it in would make one look like one. */
          note="bad input or denied — not outages"
        />
      </div>

      <section className="card">
        <h3>Requests over time</h3>
        <LineChart
          points={series}
          series={[
            { key: 'requests', label: 'Requests', color: '#6b8f71' },
            { key: 'serverErrors', label: 'Server errors', color: '#b4503f' },
          ]}
        />
      </section>

      <section className="card">
        <h3>Response time over time</h3>
        <LineChart
          points={series}
          series={[
            { key: 'p95DurationMs', label: '95th percentile (ms)', color: '#9a7b4f' },
            { key: 'avgDurationMs', label: 'Average (ms)', color: '#8a8a8a' },
          ]}
        />
      </section>

      <div className="toolbar">
        <label className="shrink">
          <span className="muted small">Order by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="requests">Busiest</option>
            <option value="time">Total time consumed</option>
            <option value="slowest">Slowest (95th percentile)</option>
            <option value="errors">Most failures</option>
          </select>
        </label>
        <div className="spacer" />
        {canExport && (
          <button type="button" className="shrink" onClick={onExport}>
            Export CSV
          </button>
        )}
      </div>

      <p className="muted small">
        “Total time consumed” is usually the one to act on: a slow endpoint called twice a day
        costs less than a middling one called constantly.
      </p>

      {routes.length === 0 ? (
        <Empty>No requests recorded in this range.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Requests</th>
              <th>Median</th>
              <th>95th</th>
              <th>99th</th>
              <th>Slowest</th>
              <th>Failures</th>
              <th>Total time</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((row) => (
              <tr key={`${row.method} ${row.route}`}>
                <td>
                  <span className="badge">{row.method}</span> <code>{row.route}</code>
                </td>
                <td>{formatCount(row.requests)}</td>
                <td>{formatMs(row.latencyMs.p50)}</td>
                <td className={row.latencyMs.p95 > 1000 ? 'warn-cell' : undefined}>
                  {formatMs(row.latencyMs.p95)}
                </td>
                <td>{formatMs(row.latencyMs.p99)}</td>
                <td>{formatMs(row.maxDurationMs)}</td>
                <td className={row.serverErrors > 0 ? 'warn-cell' : undefined}>
                  {row.serverErrors > 0 ? `${formatCount(row.serverErrors)} (${row.errorRate}%)` : '—'}
                </td>
                <td>{formatMs(row.totalTimeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted small">
        Counters are held in memory and written every {Math.round(summary.collector.flushIntervalMs / 1000)}{' '}
        seconds, so a few of the most recent requests may not be in these totals yet — one write
        per batch instead of one per request is what keeps the monitoring off the hot path.
        {summary.collector.droppedKeys > 0 &&
          ` ${summary.collector.droppedKeys} counter keys were dropped after hitting the in-memory ceiling.`}
      </p>
    </>
  );
}

function Errors({ range, canResolve, canExport, onExport, onError, onOpenCount }) {
  const [state, setState] = useState(null);
  const [filters, setFilters] = useState({ status: 'open', q: '', page: 1 });
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.observability.errors({ ...filters, range });
      setState(response);
      onOpenCount(response.meta.openCount);
    } catch (requestError) {
      onError(requestError.message);
      setState({ data: [], meta: { total: 0 } });
    }
  }, [filters, range, onError, onOpenCount]);

  useEffect(() => {
    load();
  }, [load]);

  if (!state) return <Spinner>Loading errors…</Spinner>;

  return (
    <>
      <div className="toolbar">
        <label className="shrink">
          <span className="muted small">Status</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}
          >
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="">All</option>
          </select>
        </label>
        <label>
          <span className="muted small">Search</span>
          <input
            value={filters.q}
            placeholder="Message or type"
            onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })}
          />
        </label>
        <div className="spacer" />
        {canExport && (
          <button type="button" className="shrink" onClick={onExport}>
            Export CSV
          </button>
        )}
      </div>

      <p className="muted small">
        One row per distinct fault, not per occurrence — a broken deploy that throws eight thousand
        times is one row with a count of eight thousand. A fault marked resolved reopens by itself
        if it happens again, so the status reflects reality rather than intent.
      </p>

      {state.data.length === 0 ? (
        <Empty>
          {filters.status === 'open'
            ? 'Nothing is failing right now.'
            : 'No errors match those filters.'}
        </Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fault</th>
              <th>Where</th>
              <th>Occurrences</th>
              <th>First seen</th>
              <th>Last seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((group) => (
              <tr key={group._id} onClick={() => setOpen(group)} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>{group.name}</strong>
                  <div className="muted small">{group.message}</div>
                </td>
                <td className="muted small">
                  {group.method} <code>{group.route ?? '—'}</code>
                </td>
                <td>
                  {formatCount(group.count)}
                  {group.regressionCount > 0 && (
                    /* Worth its own line: a fault that came back after being
                       declared fixed is a different kind of problem. */
                    <div className="muted small">
                      came back {group.regressionCount}×
                    </div>
                  )}
                </td>
                <td className="muted small">{formatAgo(group.firstSeenAt)}</td>
                <td className="muted small">{formatAgo(group.lastSeenAt)}</td>
                <td>
                  <span className={`badge ${group.status === 'open' ? 'new' : group.status === 'resolved' ? 'won' : 'contacted'}`}>
                    {group.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        meta={{
          page: state.meta.page,
          pages: Math.max(1, Math.ceil(state.meta.total / state.meta.pageSize)),
          total: state.meta.total,
          hasPrev: state.meta.page > 1,
          hasNext: state.meta.page * state.meta.pageSize < state.meta.total,
        }}
        onPage={(page) => setFilters({ ...filters, page })}
      />

      {open && (
        <ErrorDetail
          group={open}
          canResolve={canResolve}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null);
            load();
          }}
          onError={onError}
        />
      )}
    </>
  );
}

function ErrorDetail({ group, canResolve, onClose, onChanged, onError }) {
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.observability
      .error(group._id)
      .then((response) => {
        setDetail(response.data);
        setNote(response.data.note ?? '');
      })
      .catch((requestError) => onError(requestError.message));
  }, [group._id, onError]);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.observability.setErrorStatus(group._id, { status, note: note || undefined });
      onChanged();
    } catch (requestError) {
      onError(requestError.message);
      setBusy(false);
    }
  };

  return (
    <Drawer title={group.name} subtitle={group.message} onClose={onClose}>
      {!detail ? (
        <Spinner />
      ) : (
        <>
          <dl className="kv">
            <dt>Occurrences</dt>
            <dd>{formatCount(detail.count)}</dd>
            <dt>First seen</dt>
            <dd>{formatDate(detail.firstSeenAt)}</dd>
            <dt>Last seen</dt>
            <dd>{formatDate(detail.lastSeenAt)}</dd>
            <dt>Endpoint</dt>
            <dd>
              {detail.method} <code>{detail.route ?? '—'}</code> → {detail.statusCode}
            </dd>
            {detail.code && (
              <>
                <dt>Code</dt>
                <dd>
                  <code>{detail.code}</code>
                </dd>
              </>
            )}
            {detail.regressionCount > 0 && (
              <>
                <dt>Reopened</dt>
                <dd>
                  {detail.regressionCount}× after being marked fixed
                  {detail.resolvedAt && ` — last declared fixed ${formatAgo(detail.resolvedAt)}`}
                </dd>
              </>
            )}
            {detail.resolvedBy && (
              <>
                <dt>Resolved by</dt>
                <dd>{detail.resolvedBy.name}</dd>
              </>
            )}
          </dl>

          {detail.stack && (
            <>
              <h4>Where it was thrown</h4>
              {/* Only the first few frames are stored: the rest are framework
                  internals, and keeping them for thousands of groups would be
                  megabytes of text nobody reads. */}
              <pre className="trace">{detail.stack}</pre>
            </>
          )}

          <h4>Recent occurrences</h4>
          {detail.samples.length === 0 ? (
            <Empty>No samples recorded.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Request id</th>
                </tr>
              </thead>
              <tbody>
                {[...detail.samples].reverse().map((sample, index) => (
                  <tr key={`${sample.correlationId ?? 'none'}-${index}`}>
                    <td className="muted small">{formatDate(sample.at)}</td>
                    <td className="muted small">
                      {/* "Only affects callers" or "only this one person" is
                          visible here and nowhere in a count. */}
                      {sample.userRole ? roleLabel(sample.userRole) : 'not signed in'}
                    </td>
                    <td className="muted small">
                      <code>{sample.correlationId ?? '—'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canResolve ? (
            <>
              <hr />
              <label>
                <span>Note</span>
                <input
                  value={note}
                  placeholder="What was done about it"
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <div className="row">
                {detail.status !== 'acknowledged' && (
                  <button type="button" disabled={busy} onClick={() => setStatus('acknowledged')}>
                    Acknowledge
                  </button>
                )}
                {detail.status !== 'resolved' && (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => setStatus('resolved')}
                  >
                    Mark fixed
                  </button>
                )}
                {detail.status !== 'open' && (
                  <button type="button" disabled={busy} onClick={() => setStatus('open')}>
                    Reopen
                  </button>
                )}
              </div>
              <p className="muted small">
                Marking this fixed is a claim about the code. If the same fault happens again it
                will reopen on its own and the reopen will be counted.
              </p>
            </>
          ) : (
            <p className="muted small">
              You can read this but not change its status.
            </p>
          )}
        </>
      )}
    </Drawer>
  );
}

function Security({ range, canExport, onExport, onError }) {
  const [state, setState] = useState(null);
  const [filters, setFilters] = useState({ type: '', severity: '', page: 1 });

  useEffect(() => {
    let live = true;
    api.observability
      .security({ ...filters, range })
      .then((response) => live && setState(response))
      .catch((requestError) => live && onError(requestError.message));
    return () => {
      live = false;
    };
  }, [filters, range, onError]);

  if (!state) return <Spinner>Loading security events…</Spinner>;

  const { bySeverity, byType, topFailingSources } = state.meta;

  return (
    <>
      <div className="stats">
        <Stat label="Events" value={formatCount(state.meta.total)} />
        <Stat label="Routine" value={formatCount(bySeverity.info ?? 0)} note="sign-ins, refreshes" />
        <Stat
          label="Worth a look"
          value={formatCount(bySeverity.warn ?? 0)}
          note="failed sign-ins, denials, rate limits"
          warn={(bySeverity.warn ?? 0) > 20}
        />
        <Stat
          label="Needs attention today"
          value={formatCount(bySeverity.critical ?? 0)}
          note="lockouts, replayed session tokens"
          warn={(bySeverity.critical ?? 0) > 0}
        />
      </div>

      {topFailingSources.length > 0 && (
        <section className="card">
          <h3>Sources failing to sign in</h3>
          <p className="muted small">
            Addresses are stored as keyed hashes, never as addresses. One failure is somebody’s
            caps lock; several accounts tried from one source is somebody working through a list.
          </p>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Attempts</th>
                <th>Accounts tried</th>
                <th>Last attempt</th>
              </tr>
            </thead>
            <tbody>
              {topFailingSources.map((source) => (
                <tr key={source.ipHash}>
                  <td>
                    <code>{source.ipHash?.slice(0, 12) ?? 'unknown'}…</code>
                  </td>
                  <td>{source.attempts}</td>
                  <td className={source.accountsTried > 2 ? 'warn-cell' : undefined}>
                    {source.accountsTried}
                  </td>
                  <td className="muted small">{formatAgo(source.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="toolbar">
        <label className="shrink">
          <span className="muted small">Event</span>
          <select
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value, page: 1 })}
          >
            <option value="">All events</option>
            {byType.map((row) => (
              <option key={row.type} value={row.type}>
                {SECURITY_LABELS[row.type] ?? row.type} ({row.count})
              </option>
            ))}
          </select>
        </label>
        <label className="shrink">
          <span className="muted small">Severity</span>
          <select
            value={filters.severity}
            onChange={(event) => setFilters({ ...filters, severity: event.target.value, page: 1 })}
          >
            <option value="">Any</option>
            <option value="critical">Critical</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </label>
        <div className="spacer" />
        {canExport && (
          <button type="button" className="shrink" onClick={onExport}>
            Export CSV
          </button>
        )}
      </div>

      {state.data.length === 0 ? (
        <Empty>Nothing recorded in this range.</Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Account</th>
              <th>Source</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((event) => (
              <tr key={event._id}>
                <td className="muted small" title={formatDate(event.createdAt)}>
                  {formatAgo(event.createdAt)}
                </td>
                <td>
                  <SeverityBadge value={event.severity} />{' '}
                  {SECURITY_LABELS[event.type] ?? event.type}
                </td>
                <td className="muted small">
                  {event.actorEmail ?? '—'}
                  {event.actorRole && <div>{roleLabel(event.actorRole)}</div>}
                </td>
                <td className="muted small">
                  <code>{event.ipHash?.slice(0, 12) ?? '—'}</code>
                </td>
                <td className="muted small">
                  {event.detail ? Object.entries(event.detail).map(([key, value]) => (
                    <div key={key}>
                      {key.replace(/_/g, ' ')}: {String(value)}
                    </div>
                  )) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        meta={{
          page: state.meta.page,
          pages: Math.max(1, Math.ceil(state.meta.total / state.meta.pageSize)),
          total: state.meta.total,
          hasPrev: state.meta.page > 1,
          hasNext: state.meta.page * state.meta.pageSize < state.meta.total,
        }}
        onPage={(page) => setFilters({ ...filters, page })}
      />
    </>
  );
}

function Visitors({ range, canExport, onExport, onError }) {
  const [data, setData] = useState(null);
  const [includeBots, setIncludeBots] = useState(false);

  useEffect(() => {
    let live = true;
    api.observability
      .visitors({ range, includeBots: String(includeBots) })
      .then((response) => live && setData(response.data))
      .catch((requestError) => live && onError(requestError.message));
    return () => {
      live = false;
    };
  }, [range, includeBots, onError]);

  if (!data) return <Spinner>Loading visitors…</Spinner>;

  return (
    <>
      <div className="stats">
        <Stat label="Visits" value={formatCount(data.sessions)} note={`${formatCount(data.botSessions)} crawlers excluded`} />
        <Stat label="Pages viewed" value={formatCount(data.pageViews)} note={`${data.pagesPerSession} per visit`} />
        <Stat
          label="Turned into enquiries"
          value={formatCount(data.converted)}
          note={`${data.conversionRate}% of visits`}
        />
        <Stat
          label="Enquiries in total"
          value={formatCount(data.enquiriesInRange)}
          /* The honest caveat, printed where it cannot be missed. Without it
             the attributed figure reads as the total and the marketing looks
             half as effective as it is. */
          note={
            data.attributionGap > 0
              ? `${formatCount(data.attributionGap)} arrived without a tracked visit`
              : 'all attributed to a visit'
          }
        />
      </div>

      <div className="toolbar">
        <label className="check shrink">
          <input
            type="checkbox"
            checked={includeBots}
            onChange={(event) => setIncludeBots(event.target.checked)}
          />
          <span>Include crawlers</span>
        </label>
        <div className="spacer" />
        {canExport && (
          <button type="button" className="shrink" onClick={onExport}>
            Export CSV
          </button>
        )}
      </div>

      <section className="card">
        <h3>Visits and enquiries over time</h3>
        <LineChart
          points={data.series}
          series={[
            { key: 'sessions', label: 'Visits', color: '#6b8f71' },
            { key: 'converted', label: 'Enquiries', color: '#9a7b4f' },
          ]}
        />
      </section>

      <div className="two-col">
        <section className="card">
          <h3>Landing pages</h3>
          <p className="muted small">
            The row to act on is one with traffic and no enquiries — that page is doing the work of
            getting people here and nothing else.
          </p>
          {data.topLanding.length === 0 ? (
            <Empty>No visits in this range.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Visits</th>
                  <th>Enquiries</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.topLanding.map((row) => (
                  <tr key={row.path}>
                    <td>
                      <code>{row.path}</code>
                    </td>
                    <td>{formatCount(row.sessions)}</td>
                    <td>{row.converted}</td>
                    <td
                      className={
                        row.sessions >= 20 && row.converted === 0 ? 'warn-cell' : undefined
                      }
                    >
                      {row.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h3>Where they came from</h3>
          {data.sources.length === 0 ? (
            <Empty>No visits in this range.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Visits</th>
                  <th>Enquiries</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((row) => (
                  <tr key={row.source}>
                    <td>{row.source}</td>
                    <td>{formatCount(row.sessions)}</td>
                    <td>{row.converted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <h3>Devices</h3>
          <p className="muted small">
            A conversion rate that collapses on one device is usually a broken form, not a
            disinterested audience.
          </p>
          <table>
            <tbody>
              {data.devices.map((row) => (
                <tr key={row.device ?? 'unknown'}>
                  <td>{row.device ?? 'unknown'}</td>
                  <td>{formatCount(row.sessions)} visits</td>
                  <td>
                    {row.sessions > 0
                      ? `${Math.round((row.converted / row.sessions) * 1000) / 10}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Last page before leaving</h3>
          <p className="muted small">
            Only visits that saw more than one page, so a single-page visit is not counted as
            abandoning anything.
          </p>
          {data.topExit.length === 0 ? (
            <Empty>Nothing to show yet.</Empty>
          ) : (
            <table>
              <tbody>
                {data.topExit.map((row) => (
                  <tr key={row.path}>
                    <td>
                      <code>{row.path}</code>
                    </td>
                    <td>{formatCount(row.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <p className="muted small">
        Visits are counted from an id the browser keeps for one tab session. No cookie is set, no
        address is stored, and nothing here identifies a person.
      </p>
    </>
  );
}
