import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, Bars, Stat, Empty, Spinner, StatusBadge, formatAgo } from '../components/ui.jsx';

const RANGES = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

function since(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days));
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export default function Dashboard({ user, onOpenLeads }) {
  /*
   * A caller has no analytics permission, so the company-wide dashboard would
   * be an error banner — the first thing they ever saw. What they need instead
   * is their own queue: which of the enquiries assigned to them is still
   * waiting. Both are "the dashboard"; which one you get follows from what you
   * are allowed to know.
   */
  if (!(user?.permissions ?? []).includes('analytics.view')) {
    return <MyWork onOpenLeads={onOpenLeads} />;
  }

  return <TeamDashboard onOpenLeads={onOpenLeads} />;
}

/*
 * The caller's view: their own work, oldest first.
 *
 * Oldest first rather than newest, because the enquiry somebody has been
 * waiting longest on is the one that needs answering — a newest-first list
 * quietly buries exactly the person most likely to give up on us.
 */
function MyWork({ onOpenLeads }) {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    /*
     * `sort=createdAt` is ascending — the server's convention is a leading `-`
     * for descending — and there is no multi-status filter, so the closed
     * states are dropped client-side. Both details were wrong in the first
     * version of this and the request simply 422'd.
     */
    api.leads
      .list({ sort: 'createdAt', limit: 50 })
      .then((response) => {
        if (cancelled) return;
        const openOnly = response.data.filter(
          (lead) => !['won', 'lost', 'spam'].includes(lead.status),
        );
        setLeads({ ...response, data: openOnly.slice(0, 25), openCount: openOnly.length });
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught.message);
        setLeads({ data: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const waiting = leads?.data.filter((lead) => lead.status === 'new').length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Your work</h2>
          <p>The enquiries assigned to you, the longest-waiting first.</p>
        </div>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      {!leads ? (
        <Spinner />
      ) : (
        <>
          <div className="stats">
            <Stat label="Open with you" value={leads.openCount ?? leads.data.length} />
            <Stat
              label="Not yet contacted"
              value={waiting}
              note={waiting > 0 ? 'these are waiting on you' : 'nothing outstanding'}
              warn={waiting > 0}
            />
          </div>

          {leads.data.length === 0 ? (
            <Empty>Nothing assigned to you right now.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Asking about</th>
                  <th>Waiting</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.data.map((lead) => (
                  <tr key={lead._id} onClick={onOpenLeads} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{lead.name}</strong>
                    </td>
                    <td className="muted small">{lead.topic ?? lead.interest?.label ?? '—'}</td>
                    <td className="muted small">{formatAgo(lead.createdAt)}</td>
                    <td>
                      <StatusBadge value={lead.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button type="button" className="link" style={{ marginTop: 12 }} onClick={onOpenLeads}>
            Open the full list
          </button>
        </>
      )}
    </>
  );
}

function TeamDashboard({ onOpenLeads }) {
  const [range, setRange] = useState('30');
  const [data, setData] = useState(null);
  const [queues, setQueues] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setError(null);
    Promise.all([
      api.analytics({ from: since(range), granularity: range === '90' ? 'week' : 'day' }),
      api.queues().catch(() => null),
    ])
      .then(([analytics, queueCounts]) => {
        if (cancelled) return;
        setData(analytics.data);
        setQueues(queueCounts?.data ?? null);
      })
      .catch((caught) => !cancelled && setError(caught.message));

    // Guards against a slow response for an old range landing after a new one.
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = data?.totals;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p>Where enquiries are coming from and what is happening to them.</p>
        </div>
        <select
          className="shrink"
          style={{ width: 170 }}
          value={range}
          onChange={(event) => setRange(event.target.value)}
          aria-label="Date range"
        >
          {RANGES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      {/*
        A non-zero stuck count means enquiries were saved but their alerts never
        reached the team, so it is surfaced first and styled as a warning rather
        than buried in a log.
      */}
      {data?.stuckNotifications > 0 && (
        <Banner kind="warn">
          {data.stuckNotifications} lead{data.stuckNotifications === 1 ? '' : 's'} had alerts that
          did not go out. The sweeper retries every five minutes; open the lead and use
          “Re-queue notifications” if it stays stuck.
        </Banner>
      )}

      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stack">
          <div className="grid cols-4">
            <Stat label="Enquiries" value={totals.total} note={RANGES.find((r) => r.key === range)?.label} />
            <Stat label="Unhandled" value={totals.unhandled} note="Still marked new" warn={totals.unhandled > 0} />
            <Stat label="Converted" value={totals.converted} note="Became a booking" />
            <Stat
              label="Conversion"
              value={`${(totals.conversionRate * 100).toFixed(1)}%`}
              note={`${totals.lost} lost`}
            />
          </div>

          <div className="card">
            <strong>Enquiries over time</strong>
            <Bars series={data.overTime} />
          </div>

          <div className="grid cols-2">
            <div className="card">
              <strong>Most enquired</strong>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Journey or destination</th>
                    <th>Enquiries</th>
                    <th>Converted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byInterest.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        Nothing recorded yet.
                      </td>
                    </tr>
                  )}
                  {data.byInterest.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.count}</td>
                      <td>{row.converted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <strong>Top source pages</strong>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Enquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySourcePage.length === 0 && (
                    <tr>
                      <td colSpan={2} className="muted">
                        Nothing recorded yet.
                      </td>
                    </tr>
                  )}
                  {data.bySourcePage.map((row) => (
                    <tr key={row.page}>
                      <td className="mono">{row.page}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid cols-2">
            <div className="card">
              <strong>By form</strong>
              <table style={{ marginTop: 8 }}>
                <tbody>
                  {data.bySource.map((row) => (
                    <tr key={row.source}>
                      <td>{row.source.replace(/_/g, ' ')}</td>
                      <td style={{ textAlign: 'right' }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="link" style={{ marginTop: 10 }} onClick={onOpenLeads}>
                Open the lead list
              </button>
            </div>

            <div className="card">
              <strong>Campaigns</strong>
              {data.byCampaign.length === 0 ? (
                <p className="muted small">No UTM-tagged traffic in this range.</p>
              ) : (
                <table style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Campaign</th>
                      <th>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCampaign.map((row) => (
                      <tr key={`${row.source}-${row.campaign}`}>
                        <td>{row.source}</td>
                        <td>{row.campaign ?? '—'}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {queues?.counts && (
                <p className="muted small" style={{ marginTop: 10 }}>
                  Queue: {queues.counts.waiting} waiting, {queues.counts.active} active,{' '}
                  {queues.counts.failed} failed
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
