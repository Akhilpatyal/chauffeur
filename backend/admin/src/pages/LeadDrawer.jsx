import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, Drawer, StatusBadge, formatDate } from '../components/ui.jsx';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

function Facts({ lead }) {
  const prefs = lead.tripPreferences ?? {};
  const rows = [
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Form', lead.source?.replace(/_/g, ' ')],
    ['Interested in', lead.topic || lead.interest?.title],
    ['Destination', prefs.destination],
    ['Vibe', prefs.vibe],
    ['Duration', prefs.duration],
    ['Budget', prefs.budget],
    ['Month', prefs.month],
    ['Travel dates', lead.travelDates],
    ['Travellers', lead.groupSize],
    ['Source page', lead.context?.sourcePage],
    ['Referrer', lead.context?.referrer],
    ['Campaign', [lead.utm?.source, lead.utm?.campaign].filter(Boolean).join(' / ')],
    ['Received', formatDate(lead.createdAt)],
    ['Marketing consent', lead.consent?.marketing ? 'Yes' : 'No'],
  ].filter(([, value]) => value);

  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function LeadDrawer({ id, team, onClose, onChanged }) {
  const [lead, setLead] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.leads.get(id);
      setLead(response.data);
    } catch (caught) {
      setError(caught.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /* Every mutation reloads this lead and tells the list to refresh, so the row
   * behind the drawer cannot disagree with what is on screen. */
  async function run(action, successMessage) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      onChanged?.();
      if (successMessage) setNotice(successMessage);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  if (!lead) {
    return (
      <Drawer title="Lead" onClose={onClose}>
        <Banner>{error}</Banner>
        {!error && <p className="muted">Loading…</p>}
      </Drawer>
    );
  }

  const alerts = lead.notifications ?? {};
  const alertsStuck = ['adminEmail', 'adminWhatsapp', 'customerEmail'].some((channel) =>
    ['pending', 'failed'].includes(alerts[channel]?.status),
  );

  return (
    <Drawer
      title={lead.name}
      subtitle={`${lead.email}${lead.enquiryCount > 1 ? ` · ${lead.enquiryCount} enquiries` : ''}`}
      onClose={onClose}
    >
      <div className="stack">
        <Banner onDismiss={() => setError(null)}>{error}</Banner>
        <Banner kind="ok" onDismiss={() => setNotice(null)}>{notice}</Banner>

        <div className="card">
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="shrink"><StatusBadge value={lead.status} /></div>
            <div>
              <label htmlFor="status-select">Move to</label>
              <select
                id="status-select"
                value={lead.status}
                disabled={busy}
                onChange={(event) =>
                  run(
                    () =>
                      api.leads.setStatus(id, {
                        status: event.target.value,
                        reason: event.target.value === 'lost' ? lostReason || undefined : undefined,
                      }),
                    'Status updated.',
                  )
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-select">Assigned to</label>
              <select
                id="assign-select"
                value={lead.assignedTo?._id ?? ''}
                disabled={busy}
                onChange={(event) =>
                  run(() => api.leads.assign(id, event.target.value || null), 'Assignment updated.')
                }
              >
                <option value="">Unassigned</option>
                {team.map((member) => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label htmlFor="lost-reason">Reason (used when marking lost)</label>
            <input
              id="lost-reason"
              value={lostReason}
              placeholder="e.g. went with another operator"
              onChange={(event) => setLostReason(event.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <strong>Enquiry</strong>
          <div style={{ marginTop: 10 }}><Facts lead={lead} /></div>
          {lead.message && (
            <p
              style={{
                whiteSpace: 'pre-wrap',
                background: '#faf9f5',
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
              }}
            >
              {lead.message}
            </p>
          )}
          <p style={{ marginBottom: 0 }}>
            <a href={`mailto:${lead.email}`}>Reply by email</a>
            {lead.phone && (
              <>
                {' · '}
                <a href={`tel:${lead.phone.replace(/\s/g, '')}`}>Call</a>
                {' · '}
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </>
            )}
          </p>
        </div>

        <div className="card">
          <strong>Notifications</strong>
          <dl className="facts" style={{ marginTop: 10 }}>
            <dt>Admin email</dt>
            <dd>
              {alerts.adminEmail?.status ?? 'unknown'}
              {alerts.adminEmail?.lastError && (
                <div className="muted small">{alerts.adminEmail.lastError}</div>
              )}
            </dd>
            <dt>Admin WhatsApp</dt>
            <dd>{alerts.adminWhatsapp?.status ?? 'unknown'}</dd>
            <dt>Customer confirmation</dt>
            <dd>
              {alerts.customerEmail?.status ?? 'unknown'}
              {alerts.customerEmail?.lastError && (
                <div className="muted small">{alerts.customerEmail.lastError}</div>
              )}
            </dd>
          </dl>
          {alertsStuck && (
            <Banner kind="warn">
              Some alerts have not been delivered. The sweeper retries automatically every five
              minutes; re-queue manually if it stays stuck.
            </Banner>
          )}
          <button
            type="button"
            style={{ marginTop: 10 }}
            disabled={busy}
            onClick={() => run(() => api.leads.resend(id), 'Notifications re-queued.')}
          >
            Re-queue notifications
          </button>
        </div>

        <div className="card">
          <strong>Internal notes</strong>
          <div style={{ marginTop: 10 }}>
            <textarea
              rows={3}
              value={note}
              placeholder="What happened on the call?"
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              type="button"
              className="primary"
              style={{ marginTop: 8 }}
              disabled={busy || note.trim().length === 0}
              onClick={() =>
                run(async () => {
                  await api.leads.addNote(id, note.trim());
                  setNote('');
                }, 'Note added.')
              }
            >
              Add note
            </button>
          </div>

          <div className="stack" style={{ marginTop: 14 }}>
            {(lead.notes ?? []).length === 0 && <p className="muted small">No notes yet.</p>}
            {(lead.notes ?? [])
              .slice()
              .reverse()
              .map((entry) => (
                <div key={entry._id} style={{ borderTop: '1px solid #eee7d8', paddingTop: 8 }}>
                  <div className="muted small">
                    {entry.authorName ?? entry.author?.name ?? 'Someone'} · {formatDate(entry.createdAt)}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{entry.body}</div>
                </div>
              ))}
          </div>
        </div>

        {lead.thread?.length > 0 && (
          <div className="card">
            <strong>Earlier enquiries from this person</strong>
            <div className="stack" style={{ marginTop: 10 }}>
              {lead.thread.map((entry) => (
                <div key={entry._id} style={{ borderTop: '1px solid #eee7d8', paddingTop: 8 }}>
                  <div className="muted small">
                    {formatDate(entry.createdAt)} · {entry.source?.replace(/_/g, ' ')} · {entry.status}
                  </div>
                  <div>{entry.topic || entry.message || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <strong>Status history</strong>
          <div className="stack small" style={{ marginTop: 10 }}>
            {(lead.statusHistory ?? []).map((change, index) => (
              <div key={`${change.to}-${change.at}-${index}`}>
                <span className="muted">{formatDate(change.at)}</span>
                {' — '}
                {change.from ? `${change.from} to ${change.to}` : `created as ${change.to}`}
                {change.byName && <span className="muted"> by {change.byName}</span>}
                {change.reason && <span className="muted"> ({change.reason})</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
