import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, Empty, Spinner, money, formatDay } from '../components/ui.jsx';

/*
 * Building and sending a quotation.
 *
 * MONEY IS TYPED IN RUPEES AND HELD IN PAISE
 *
 * The desk types 14000; the API is sent 1400000. The conversion happens at
 * the edge, in `toMinor`, and nowhere else — every number between here and
 * the database is an integer, so no total ever drifts by a paisa.
 *
 * THE TOTAL SHOWN HERE IS NOT AUTHORITATIVE
 *
 * It is computed locally only so the desk can see the figure change as they
 * type. The server recomputes from the lines on save and that is the number
 * the customer is shown, which is why this preview is labelled as one.
 */
const toMinor = (rupees) => Math.round(Number(rupees || 0) * 100);
const toRupees = (minor) => (minor === null || minor === undefined ? '' : String(minor / 100));

const CATEGORIES = [
  'accommodation', 'transport', 'activity', 'permit',
  'meals', 'service', 'discount', 'tax', 'other',
];

const blankLine = () => ({
  label: '', category: 'other', quantity: 1, unitLabel: '', unitAmount: '', vendorCost: '',
});

export default function QuotationPanel({ bookingId, onChanged }) {
  const [state, setState] = useState({ loading: true, quotations: [] });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);

  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.reservations.quotations(bookingId);
      setState({ loading: false, quotations: response.data ?? [] });
    } catch (caught) {
      setError(caught.message);
      setState({ loading: false, quotations: [] });
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <Spinner>Loading quotations…</Spinner>;

  const { quotations } = state;
  const live = quotations.find((q) => ['draft', 'sent'].includes(q.status));

  function startBuilding(basedOn) {
    setForm({
      summary: basedOn?.summary ?? '',
      items: basedOn?.items?.length
        ? basedOn.items.map((item) => ({
            label: item.label,
            category: item.category,
            quantity: item.quantity,
            unitLabel: item.unitLabel ?? '',
            unitAmount: toRupees(item.unitAmount),
            vendorCost: toRupees(item.vendorCost),
          }))
        : [blankLine()],
      advanceAmount: toRupees(basedOn?.advanceAmount) || '',
      cancellationTerms: basedOn?.cancellationTerms ?? '',
      expiresAt: '',
      paymentDeadline: '',
      revisionReason: '',
    });
    setBuilding(true);
    setNotice(null);
  }

  const setLine = (index, key) => (event) =>
    setForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [key]: event.target.value };
      return { ...current, items };
    });

  const previewTotal = (form?.items ?? []).reduce(
    (sum, item) => sum + toMinor(item.unitAmount) * Number(item.quantity || 0),
    0,
  );

  async function save(andSend) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        summary: form.summary || null,
        items: form.items
          /* A line with no label and no price is an empty row the desk
             tabbed past, not something to send to a customer. */
          .filter((item) => item.label.trim() || item.unitAmount !== '')
          .map((item) => ({
            label: item.label.trim(),
            category: item.category,
            quantity: Number(item.quantity || 1),
            unitLabel: item.unitLabel || null,
            unitAmount: toMinor(item.unitAmount),
            ...(item.vendorCost === '' ? {} : { vendorCost: toMinor(item.vendorCost) }),
          })),
        advanceAmount: form.advanceAmount === '' ? 0 : toMinor(form.advanceAmount),
        cancellationTerms: form.cancellationTerms || null,
        expiresAt: form.expiresAt || null,
        paymentDeadline: form.paymentDeadline || null,
        revisionReason: form.revisionReason || null,
      };

      const created = await api.reservations.createQuotation(bookingId, payload);

      if (andSend) {
        await api.reservations.sendQuotation(created.data._id);
        setNotice(`Version ${created.data.version} sent to the customer.`);
      } else {
        setNotice(`Draft v${created.data.version} saved. The customer cannot see it yet.`);
      }

      setBuilding(false);
      setForm(null);
      await load();
      onChanged?.();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendExisting(quotation) {
    setBusy(true);
    setError(null);
    try {
      await api.reservations.sendQuotation(quotation._id);
      setNotice(`Version ${quotation.version} sent.`);
      await load();
      onChanged?.();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <h4>Quotations</h4>
      <Banner onDismiss={() => setError(null)}>{error}</Banner>
      <Banner kind="ok" onDismiss={() => setNotice(null)}>{notice}</Banner>

      {quotations.length === 0 && !building && (
        <Empty>No quotation yet. Until one is accepted this booking has no price.</Empty>
      )}

      {quotations.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Total</th>
                <th>Deposit</th>
                <th>Valid until</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quotations.map((quotation) => (
                <tr key={quotation._id}>
                  <td className="small">v{quotation.version}</td>
                  <td className="small">{String(quotation.status).replace(/_/g, ' ')}</td>
                  <td className="small">{money(quotation.totalAmount, quotation.currency)}</td>
                  <td className="small">
                    {quotation.advanceAmount > 0
                      ? money(quotation.advanceAmount, quotation.currency)
                      : <span className="muted">none</span>}
                  </td>
                  <td className="small">
                    {quotation.expiresAt ? formatDay(quotation.expiresAt) : <span className="muted">—</span>}
                  </td>
                  <td>
                    {quotation.status === 'draft' && (
                      <button type="button" className="shrink primary" disabled={busy}
                        onClick={() => sendExisting(quotation)}>
                        Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!building && (
        <button type="button" onClick={() => startBuilding(live ?? quotations[0])} disabled={busy}>
          {quotations.length === 0 ? 'Build a quotation' : 'New version'}
        </button>
      )}

      {building && form && (
        <div style={{ marginTop: 10 }}>
          {/* Said plainly, because it is the thing most easily assumed
              otherwise: a new version replaces the live offer. */}
          {live && (
            <p className="muted small" style={{ marginTop: 0 }}>
              This creates version {(quotations[0]?.version ?? 0) + 1}. The current{' '}
              {live.status} version is superseded — the customer sees only the new one.
            </p>
          )}

          <label htmlFor="q-summary">What is being offered</label>
          <textarea
            id="q-summary"
            rows={2}
            value={form.summary}
            onChange={(event) => setForm((c) => ({ ...c, summary: event.target.value }))}
            placeholder="A sentence the customer reads above the price."
          />

          {/*
            A stacked block per line rather than a seven-column table. The
            drawer is 620px wide, which gave each cell about 55px: the price
            rendered as "6(" and the unit as "nig". Numbers the desk cannot
            read while typing them is the one thing this panel must not do.
          */}
          <div className="stack" style={{ marginTop: 10, gap: 10 }}>
            {form.items.map((item, index) => (
              <div
                key={index}
                className="card"
                style={{ padding: 10, display: 'grid', gap: 8 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8 }}>
                  <div>
                    <label htmlFor={`line-label-${index}`}>Line</label>
                    <input
                      id={`line-label-${index}`}
                      value={item.label}
                      onChange={setLine(index, 'label')}
                      placeholder="Accommodation, permit…"
                    />
                  </div>
                  <div>
                    <label htmlFor={`line-cat-${index}`}>Category</label>
                    <select
                      id={`line-cat-${index}`}
                      value={item.category}
                      onChange={setLine(index, 'category')}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div>
                    <label htmlFor={`line-qty-${index}`}>Qty</label>
                    <input
                      id={`line-qty-${index}`}
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={setLine(index, 'quantity')}
                    />
                  </div>
                  <div>
                    <label htmlFor={`line-unit-${index}`}>Unit</label>
                    <input
                      id={`line-unit-${index}`}
                      value={item.unitLabel}
                      onChange={setLine(index, 'unitLabel')}
                      placeholder="nights"
                    />
                  </div>
                  <div>
                    <label htmlFor={`line-price-${index}`}>Price ₹</label>
                    {/* Negative is allowed on purpose: a discount is a line
                        like any other, so it cannot be forgotten in a total. */}
                    <input
                      id={`line-price-${index}`}
                      type="number"
                      step="1"
                      value={item.unitAmount}
                      onChange={setLine(index, 'unitAmount')}
                    />
                  </div>
                  <div>
                    <label htmlFor={`line-cost-${index}`}>Our cost ₹</label>
                    <input
                      id={`line-cost-${index}`}
                      type="number"
                      step="1"
                      value={item.vendorCost}
                      onChange={setLine(index, 'vendorCost')}
                      placeholder="optional"
                    />
                  </div>
                </div>

                <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="muted small">
                    Line total{' '}
                    {money(toMinor(item.unitAmount) * Number(item.quantity || 0))}
                    {item.vendorCost !== '' && item.unitAmount !== '' && (
                      <>
                        {' · margin '}
                        {money(
                          (toMinor(item.unitAmount) - toMinor(item.vendorCost)) *
                            Number(item.quantity || 0),
                        )}
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    className="shrink link"
                    onClick={() =>
                      setForm((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
            <button type="button" className="shrink"
              onClick={() => setForm((c) => ({ ...c, items: [...c.items, blankLine()] }))}>
              Add line
            </button>
            <span className="muted small">
              Preview total {money(previewTotal)} — the server recalculates from the lines on save.
            </span>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label htmlFor="q-advance">Deposit ₹</label>
              <input id="q-advance" type="number" step="1" value={form.advanceAmount}
                onChange={(event) => setForm((c) => ({ ...c, advanceAmount: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="q-expires">Price holds until</label>
              <input id="q-expires" type="date" value={form.expiresAt}
                onChange={(event) => setForm((c) => ({ ...c, expiresAt: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="q-deadline">Payment due by</label>
              <input id="q-deadline" type="date" value={form.paymentDeadline}
                onChange={(event) => setForm((c) => ({ ...c, paymentDeadline: event.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <label htmlFor="q-terms">Cancellation terms</label>
            <textarea
              id="q-terms"
              rows={2}
              value={form.cancellationTerms}
              onChange={(event) => setForm((c) => ({ ...c, cancellationTerms: event.target.value }))}
              placeholder="What the customer gets back, and by when."
            />
            {/* No default text and no suggestion. An invented cancellation
                term is a consumer protection problem, not a copy problem. */}
            <p className="muted small" style={{ marginTop: 4 }}>
              Left blank, the quotation carries no cancellation terms at all rather than
              implying any.
            </p>
          </div>

          {quotations.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label htmlFor="q-reason">What changed since the last version</label>
              <input id="q-reason" value={form.revisionReason}
                onChange={(event) => setForm((c) => ({ ...c, revisionReason: event.target.value }))}
                placeholder="Shown to the customer, so they are not left comparing two prices." />
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="shrink" disabled={busy} onClick={() => save(false)}>
              Save draft
            </button>
            <button type="button" className="shrink primary" disabled={busy}
              onClick={() => save(true)}>
              {busy ? 'Working…' : 'Save and send'}
            </button>
            <button type="button" className="shrink link" disabled={busy}
              onClick={() => { setBuilding(false); setForm(null); }}>
              Cancel
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>
            Sending does not charge anything. The price is written onto the booking only when
            the customer accepts.
          </p>
        </div>
      )}
    </section>
  );
}
