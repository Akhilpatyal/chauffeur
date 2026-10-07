import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, Bars, Stat } from '../components/ui.jsx';

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

export default function Dashboard({ onOpenLeads }) {
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
