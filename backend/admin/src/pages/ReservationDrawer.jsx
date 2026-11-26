import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import QuotationPanel from './QuotationPanel.jsx';
import {
  Banner,
  Drawer,
  StatusBadge,
  Spinner,
  Empty,
  money,
  formatDate,
  formatDay,
} from '../components/ui.jsx';

/*
 * One reservation, for the desk.
 *
 * The moves on offer come from the server, which also enforces them — a
 * second copy of the lifecycle table here would drift, and the UI would
 * start offering moves that are refused. The disabled states below are a
 * courtesy to the reader, never the authorisation: that is the API's job.
 */
const label = (status) => String(status ?? '').replace(/_/g, ' ').toLowerCase();

export default function ReservationDrawer({ id, user, team, onClose, onChanged }) {
  const [state, setState] = useState({ loading: true });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [move, setMove] = useState({ to: '', reason: '', note: '', customerVisible: true });
  const [note, setNote] = useState({ body: '', customerVisible: false });

  const held = new Set(user?.permissions ?? []);
  const canManage = held.has('bookings.manage');
  const canAssign = held.has('bookings.assign');

  const load = useCallback(async () => {
    try {
      const response = await api.reservations.get(id);
      setState({
        loading: false,
        booking: response.data,
        timeline: response.meta.timeline ?? [],
        allocations: response.meta.allocations ?? [],
        blockers: response.meta.confirmationBlockers ?? [],
        transitions: response.meta.allowedTransitions ?? [],
      });
    } catch (caught) {
      setError(caught.message);
      setState({ loading: false });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return (
      <Drawer title="Reservation" onClose={onClose}>
        <Spinner>Loading reservation…</Spinner>
      </Drawer>
    );
  }

  if (!state.booking) {
    return (
      <Drawer title="Reservation" onClose={onClose}>
        <Banner onDismiss={() => setError(null)}>{error}</Banner>
        <Empty>This reservation could not be opened.</Empty>
      </Drawer>
    );
  }

  const { booking, timeline, allocations, blockers, transitions } = state;
  const confirmBlocked = move.to === 'CONFIRMED' && blockers.length > 0;
  const needsReason = transitions.some((option) => option.to === move.to && option.reasonRequired);

  async function submitMove(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.reservations.transition(booking._id, {
        to: move.to,
        reason: move.reason || undefined,
        note: move.note || undefined,
        customerVisible: move.customerVisible,
      });
      setMove({ to: '', reason: '', note: '', customerVisible: true });
      setNotice('Moved.');
      await load();
      onChanged?.();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitNote(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.reservations.addNote(booking._id, {
        body: note.body,
        customerVisible: note.customerVisible,
      });
      setNote({ body: '', customerVisible: false });
      setNotice('Note added.');
      await load();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function reassign(event) {
    const value = event.target.value;
    setBusy(true);
    setError(null);
    try {
      await api.reservations.assign(booking._id, value || null);
      await load();
      onChanged?.();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      title={booking.reference}
      subtitle={booking.trip?.title ?? 'Custom trip'}
      onClose={onClose}
    >
      <Banner onDismiss={() => setError(null)}>{error}</Banner>
      <Banner kind="ok" onDismiss={() => setNotice(null)}>{notice}</Banner>

      <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
        <StatusBadge value={booking.status} />
        <span className="muted small">
          {booking.kind === 'fixed_departure' ? 'Fixed departure' : 'Custom trip'} ·{' '}
          {booking.travellerCount} travelling · requested {formatDate(booking.createdAt)}
        </span>
      </div>

      {booking.cancellationRequestedAt && (
        <div className="card warn-cell" style={{ marginBottom: 12 }}>
          <strong>Cancellation requested</strong>
          <p className="small" style={{ margin: '4px 0 0' }}>
            Asked {formatDate(booking.cancellationRequestedAt)}. The customer is waiting to hear
            what the terms mean for them.
          </p>
        </div>
      )}

      <div className="two-col">
        <section className="card">
          <h4>Trip</h4>
          <Row label="Dates">
            {formatDay(booking.startDate)} – {formatDay(booking.endDate)}
            {booking.dateFlexibilityDays > 0 && (
              <span className="muted"> · flexible by {booking.dateFlexibilityDays} days</span>
            )}
          </Row>
          <Row label="Where">{booking.trip?.destination ?? '—'}</Row>
          <Row label="Pickup">{booking.preferences?.pickupPoint ?? '—'}</Row>
          <Row label="Rooms">{booking.preferences?.roomSharing ?? '—'}</Row>
          {booking.preferences?.specialRequests && (
            <Row label="Asked for">{booking.preferences.specialRequests}</Row>
          )}
        </section>

        <section className="card">
          <h4>Customer</h4>
          <Row label="Name">{booking.customer?.name ?? booking.contact?.name ?? '—'}</Row>
          <Row label="Email">{booking.customer?.email ?? booking.contact?.email ?? '—'}</Row>
          <Row label="Phone">{booking.customer?.phone ?? booking.contact?.phone ?? '—'}</Row>
          {booking.customer?.emergencyContact?.name && (
            <Row label="In emergency">
              {booking.customer.emergencyContact.name}
              {booking.customer.emergencyContact.phone && ` · ${booking.customer.emergencyContact.phone}`}
            </Row>
          )}
          <Row label="Assigned">
            {canAssign ? (
              <select value={booking.assignedTo?._id ?? ''} onChange={reassign} disabled={busy}>
                <option value="">Unassigned</option>
                {team.map((member) => (
                  <option key={member._id} value={member._id}>{member.name}</option>
                ))}
              </select>
            ) : (
              booking.assignedTo?.name ?? <span className="muted">unassigned</span>
            )}
          </Row>
        </section>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h4>Money</h4>
        {booking.totalAmount > 0 ? (
          <>
            <Row label="Total">{money(booking.totalAmount, booking.currency)}</Row>
            {booking.advanceAmount > 0 && (
              <Row label="Deposit">{money(booking.advanceAmount, booking.currency)}</Row>
            )}
            <Row label="Paid">{money(booking.paidAmount ?? 0, booking.currency)}</Row>
            <Row label="Payment">{label(booking.paymentStatus)}</Row>
          </>
        ) : (
          /* Nothing quoted yet, so nothing to show. A zero here would read as
             a free trip rather than an unpriced one. */
          <p className="muted small" style={{ margin: 0 }}>
            Not priced yet — no quotation has been sent.
          </p>
        )}
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h4>Suppliers</h4>
        {allocations.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            Nothing booked with a supplier yet.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Our cost</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td className="small">
                      {allocation.detail}
                      <div className="muted">{label(allocation.service)}</div>
                    </td>
                    <td className="small">{allocation.vendor?.name ?? allocation.vendorName ?? '—'}</td>
                    <td className="small">{label(allocation.status)}</td>
                    {/* Internal only. This column is why the drawer is behind
                        bookings.view and never reaches a customer payload. */}
                    <td className="small">{money(allocation.cost, allocation.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canManage && transitions.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h4>Move this on</h4>

          {/* Shown before anything is chosen, so the reason a trip cannot be
              confirmed is visible rather than discovered by pressing. */}
          {blockers.length > 0 && (
            <div className="warn-cell" style={{ padding: 10, marginBottom: 10 }}>
              <strong className="small">Not ready to confirm</strong>
              <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submitMove}>
            <div className="row">
              <div>
                <label htmlFor="move-to">New status</label>
                <select
                  id="move-to"
                  value={move.to}
                  onChange={(event) => setMove((c) => ({ ...c, to: event.target.value }))}
                >
                  <option value="">Choose…</option>
                  {transitions.map((option) => (
                    <option key={option.to} value={option.to}>{label(option.to)}</option>
                  ))}
                </select>
              </div>
            </div>

            {needsReason && (
              <div style={{ marginTop: 8 }}>
                <label htmlFor="move-reason">
                  Reason — the customer is shown this
                </label>
                <textarea
                  id="move-reason"
                  rows={2}
                  value={move.reason}
                  onChange={(event) => setMove((c) => ({ ...c, reason: event.target.value }))}
                  placeholder="Why this trip cannot run, in words they will understand."
                />
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <label htmlFor="move-note">Note (optional)</label>
              <textarea
                id="move-note"
                rows={2}
                value={move.note}
                onChange={(event) => setMove((c) => ({ ...c, note: event.target.value }))}
              />
            </div>

            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={move.customerVisible}
                onChange={(event) => setMove((c) => ({ ...c, customerVisible: event.target.checked }))}
              />
              Show this step on the customer’s timeline
            </label>

            <button
              type="submit"
              className="primary"
              style={{ marginTop: 10 }}
              disabled={busy || !move.to || confirmBlocked || (needsReason && !move.reason.trim())}
            >
              {busy ? 'Working…' : move.to ? `Move to ${label(move.to)}` : 'Move'}
            </button>
            {confirmBlocked && (
              <p className="muted small" style={{ marginTop: 6 }}>
                Clear the blockers above before confirming.
              </p>
            )}
          </form>
        </section>
      )}

      {/*
        Pricing sits below the pipeline controls, not above them.

        It was the other way round, on the reasoning that a quotation is what
        the next move depends on. In use that was wrong: moving a booking on
        is the frequent action and quoting is the occasional one, and the
        builder is tall enough that it pushed the status control off the
        bottom of the drawer entirely — somebody looking for "how do I change
        the status" scrolled, hit the quotation form, and concluded there
        wasn't one.
      */}
      {canManage && (
        <QuotationPanel bookingId={booking._id} onChanged={() => { load(); onChanged?.(); }} />
      )}

      {canManage && (
        <section className="card" style={{ marginTop: 12 }}>
          <h4>Add a note</h4>
          <form onSubmit={submitNote}>
            <textarea
              rows={3}
              value={note.body}
              onChange={(event) => setNote((c) => ({ ...c, body: event.target.value }))}
              placeholder="What happened, what was agreed, who said it."
            />
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={note.customerVisible}
                onChange={(event) => setNote((c) => ({ ...c, customerVisible: event.target.checked }))}
              />
              {/* Defaults to off. An internal note the customer can read is a
                  worse mistake than one they cannot. */}
              The customer can read this
            </label>
            <button type="submit" style={{ marginTop: 10 }} disabled={busy || !note.body.trim()}>
              Add note
            </button>
          </form>
        </section>
      )}

      <section className="card" style={{ marginTop: 12 }}>
        <h4>History</h4>
        {timeline.length === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <ol className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {timeline.map((event) => (
              <li key={event._id} style={{ borderLeft: '2px solid #e4e4e7', paddingLeft: 12, marginBottom: 10 }}>
                <div className="small">
                  <strong>{event.title}</strong>
                  {!event.customerVisible && <span className="muted"> · internal</span>}
                </div>
                {event.description && (
                  <div className="small" style={{ marginTop: 2 }}>{event.description}</div>
                )}
                <div className="muted small" style={{ marginTop: 2 }}>
                  {formatDate(event.createdAt)}
                  {event.actorName && ` · ${event.actorName}`}
                  {event.actorType && ` (${event.actorType})`}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Drawer>
  );
}

function Row({ label: name, children }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: 'baseline', marginTop: 6 }}>
      <span className="muted small" style={{ minWidth: 104, flex: '0 0 auto' }}>{name}</span>
      <span className="small" style={{ minWidth: 0, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}
