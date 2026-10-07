import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { Banner, Pager, StatusBadge, formatDate } from '../components/ui.jsx';
import LeadDrawer from './LeadDrawer.jsx';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES = [
  'contact_form',
  'plan_my_trip',
  'journey_enquiry',
  'group_tour_enquiry',
  'hotel_enquiry',
  'callback_request',
  'other',
];

const EMPTY_FILTERS = {
  status: '',
  source: '',
  assignedTo: '',
  search: '',
  from: '',
  to: '',
  includeDuplicates: false,
  page: 1,
  limit: 25,
};

const checkboxLabelStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: 400,
  fontSize: 13,
  color: 'inherit',
};

export default function Leads({ user }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [result, setResult] = useState(null);
  const [team, setTeam] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /* Only non-empty filters are sent, so the query the server sees matches the
   * index it is expected to use. */
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
      setResult(await api.leads.list(query));
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

  const setField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    // Any filter change resets to page 1; staying on page 4 of a new filter set
    // shows an empty table and looks like a bug.
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  };

  async function exportCsv() {
    try {
      const response = await api.leads.exportCsv(query);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taifer-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Leads</h2>
          <p>
            One row per person by default. Follow-up enquiries are folded into the same contact
            thread.
          </p>
        </div>
        <div className="row shrink">
          <button type="button" className="shrink" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="shrink primary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <div>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Name, email or phone"
              value={filters.search}
              onChange={setField('search')}
            />
          </div>
          <div>
            <label htmlFor="status">Status</label>
            <select id="status" value={filters.status} onChange={setField('status')}>
              <option value="">Any</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source">Form</label>
            <select id="source" value={filters.source} onChange={setField('source')}>
              <option value="">Any</option>
              {SOURCES.map((source) => (
                <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assignedTo">Assigned to</label>
            <select id="assignedTo" value={filters.assignedTo} onChange={setField('assignedTo')}>
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {team.map((member) => (
                <option key={member._id} value={member._id}>{member.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="from">From</label>
            <input id="from" type="date" value={filters.from} onChange={setField('from')} />
          </div>
          <div>
            <label htmlFor="to">To</label>
            <input id="to" type="date" value={filters.to} onChange={setField('to')} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <label className="shrink" style={checkboxLabelStyle}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={filters.includeDuplicates}
              onChange={setField('includeDuplicates')}
            />
            Show every submission separately
          </label>
          <button type="button" className="shrink link" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Interest</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Alerts</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result?.data.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">No leads match these filters.</td>
              </tr>
            )}
            {result?.data.map((lead) => {
              /* Surfaced per row because a lead whose alerts never went out is
               * one nobody on the team knows about yet. */
              const alertsStuck =
                ['pending', 'failed'].includes(lead.notifications?.adminEmail?.status) ||
                ['pending', 'failed'].includes(lead.notifications?.customerEmail?.status);

              return (
                <tr key={lead._id}>
                  <td className="small">{formatDate(lead.createdAt)}</td>
                  <td>
                    {lead.name}
                    {lead.enquiryCount > 1 && (
                      <span className="muted small"> · {lead.enquiryCount} enquiries</span>
                    )}
                  </td>
                  <td className="small">
                    <div>{lead.email}</div>
                    {lead.phone && <div className="muted">{lead.phone}</div>}
                  </td>
                  <td className="small">
                    {lead.topic || lead.tripPreferences?.destination || lead.interest?.title || '—'}
                    <div className="muted">{lead.source?.replace(/_/g, ' ')}</div>
                  </td>
                  <td><StatusBadge value={lead.status} /></td>
                  <td className="small">
                    {lead.assignedTo?.name ?? <span className="muted">—</span>}
                  </td>
                  <td className="small">
                    {alertsStuck ? <span className="badge lost">stuck</span> : <span className="muted">sent</span>}
                  </td>
                  <td>
                    <button type="button" className="link" onClick={() => setOpenId(lead._id)}>
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager meta={result?.meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />

      {openId && (
        <LeadDrawer
          id={openId}
          team={team}
          user={user}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
