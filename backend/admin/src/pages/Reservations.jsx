import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { Banner, Pager, StatusBadge, Empty, Spinner, money, formatDate, formatDay } from '../components/ui.jsx';
import ReservationDrawer from './ReservationDrawer.jsx';

/*
 * The reservation pipeline.
 *
 * Organised around the question the desk actually asks — "what needs me
 * next?" — rather than around the data model. The first four views are the
 * working queue in the order a booking moves through it; the last two are the
 * ones that otherwise get forgotten, which is why they are tabs rather than
 * filter combinations somebody has to remember to assemble.
 */
const VIEWS = [
  { key: 'new', label: 'New', statuses: ['REQUESTED'] },
  { key: 'checking', label: 'Checking', statuses: ['AVAILABILITY_CHECK'] },
  { key: 'quoted', label: 'Quoted', statuses: ['QUOTED'] },
  { key: 'awaiting_payment', label: 'Awaiting payment', statuses: ['AWAITING_PAYMENT'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['CONFIRMED'] },
  /* No count: "somebody asked to cancel" is not a status, so it cannot be
   * read off the per-status totals the list returns. A number assembled from
   * the wrong source is worse than none. */
  { key: 'cancellation_requested', label: 'Cancellation asked' },
  { key: 'open', label: 'All open' },
  { key: 'closed', label: 'Closed', statuses: ['REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED'] },
];

const EMPTY_FILTERS = { view: 'new', search: '', assignedTo: '', kind: '', page: 1, pageSize: 25 };

export default function Reservations({ user }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [result, setResult] = useState(null);
  const [team, setTeam] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const params = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value === '' || value === false) continue;
      params[key] = value;
    }
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.reservations.list(query));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.team().then((response) => setTeam(response.data)).catch(() => setTeam([]));
  }, []);

  const setField = (field) => (event) =>
    /* Any filter change resets to page 1 — staying on page 4 of a new filter
     * set shows an empty table and reads as a bug. */
    setFilters((current) => ({ ...current, [field]: event.target.value, page: 1 }));

  const counts = result?.meta?.counts ?? {};
  const countFor = (view) =>
    view.statuses ? view.statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0) : undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Reservations</h2>
          <p>
            Requests, quotations and confirmed trips. A request is not a booking until somebody
            here confirms it.
          </p>
        </div>
        <div className="row shrink">
          <button type="button" className="shrink" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      {/* Counts come from the same scoped query as the rows, so a team
          manager's tabs add up to their own list rather than the company's. */}
      <div className="tabs" role="tablist">
        {VIEWS.map((view) => {
          const count = countFor(view);
          return (
            <button
              key={view.key}
              type="button"
              role="tab"
              aria-selected={filters.view === view.key}
              onClick={() => setFilters((current) => ({ ...current, view: view.key, page: 1 }))}
            >
              {view.label}
              {count > 0 && <em>{count}</em>}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <div>
            <label htmlFor="res-search">Search</label>
            <input
              id="res-search"
              placeholder="Reference, name, email or trip"
              value={filters.search}
              onChange={setField('search')}
            />
          </div>
          <div>
            <label htmlFor="res-assigned">Assigned to</label>
            <select id="res-assigned" value={filters.assignedTo} onChange={setField('assignedTo')}>
              <option value="">Anyone</option>
              {team.map((member) => (
                <option key={member._id} value={member._id}>{member.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="res-kind">Type</label>
            <select id="res-kind" value={filters.kind} onChange={setField('kind')}>
              <option value="">Any</option>
              <option value="fixed_departure">Fixed departure</option>
              <option value="custom">Custom trip</option>
            </select>
          </div>
          <div className="shrink" style={{ alignSelf: 'flex-end' }}>
            <button type="button" className="shrink link" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {loading && !result && <Spinner>Loading reservations…</Spinner>}

      {result && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Trip</th>
                <th>Customer</th>
                <th>Travelling</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Assigned</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <Empty>Nothing in this view.</Empty>
                  </td>
                </tr>
              )}
              {result.data.map((booking) => (
                <tr key={booking._id}>
                  <td className="mono small">
                    {booking.reference}
                    <div className="muted">{formatDate(booking.createdAt)}</div>
                  </td>
                  <td className="small">
                    {booking.trip?.title ?? 'Custom trip'}
                    <div className="muted">
                      {booking.kind === 'fixed_departure' ? 'Fixed departure' : 'Custom'}
                      {' · '}
                      {booking.travellerCount} travelling
                    </div>
                  </td>
                  <td className="small">
                    {booking.customer?.name ?? booking.contact?.name ?? '—'}
                    <div className="muted">{booking.customer?.email ?? booking.contact?.email}</div>
                  </td>
                  <td className="small">{formatDay(booking.startDate)}</td>
                  <td>
                    <StatusBadge value={booking.status} />
                    {/* Flagged on the row because a cancellation nobody has
                        answered is the thing most likely to be missed. */}
                    {booking.cancellationRequestedAt && (
                      <div className="muted small">cancellation asked</div>
                    )}
                  </td>
                  <td className="small">
                    {booking.totalAmount > 0 ? (
                      <>
                        {money(booking.totalAmount, booking.currency)}
                        <div className="muted">{String(booking.paymentStatus).toLowerCase().replace(/_/g, ' ')}</div>
                      </>
                    ) : (
                      /* No quotation yet, so no figure. A "₹0" here reads as
                         free rather than as not-yet-priced. */
                      <span className="muted">not priced</span>
                    )}
                  </td>
                  <td className="small">
                    {booking.assignedTo?.name ?? <span className="muted">unassigned</span>}
                  </td>
                  <td>
                    <button type="button" className="shrink" onClick={() => setOpenId(booking._id)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The endpoint returns total/page/pageSize; the page figures are
          derived here, as on the monitoring screens. */}
      {result && (
        <Pager
          meta={{
            page: result.meta.page,
            pages: Math.max(1, Math.ceil(result.meta.total / result.meta.pageSize)),
            total: result.meta.total,
            hasPrev: result.meta.page > 1,
            hasNext: result.meta.page * result.meta.pageSize < result.meta.total,
          }}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
        />
      )}

      {openId && (
        <ReservationDrawer
          id={openId}
          user={user}
          team={team}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
