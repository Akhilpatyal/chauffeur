import React, { useState } from 'react';
import { Check, Loader2, FileText, Clock } from 'lucide-react';
import { account, AccountError } from '../../lib/account';
import { Banner, formatAmount, inputClass, secondaryButtonClass } from './accountUi';

/*
 * A quotation, as the customer sees it.
 *
 * ITEMISED, NOT SUMMARISED
 *
 * The lines are shown in full rather than behind a "view breakdown" toggle.
 * A price somebody has to work to see is a price they read with suspicion,
 * and "Accommodation, 4 nights × ₹6,000" is arithmetic a reader can follow
 * and therefore argue with less than "Accommodation ₹24,000".
 *
 * WHAT ACCEPTING MEANS IS SAID BEFORE THE BUTTON, NOT AFTER
 *
 * Accepting charges nothing. It is the moment the price becomes binding on
 * us, which is worth saying plainly next to the control rather than leaving
 * somebody to discover it.
 */
const STATUS_LABEL = {
  sent: { text: 'Awaiting your answer', tone: 'bg-[#FFF4DC] text-[#8A5B00] border-[#E8C97A]' },
  accepted: { text: 'Accepted', tone: 'bg-[#E8F3EC] text-[#1C5E3A] border-[#BBD9C7]' },
  declined: { text: 'Declined', tone: 'bg-[#FDF1EE] text-[#A8412C] border-[#F2D2C9]' },
  changes_requested: { text: 'Changes requested', tone: 'bg-[#F4F1E8] text-[#5E6B63] border-[#DDD4C1]' },
  superseded: { text: 'Replaced by a newer version', tone: 'bg-[#F4F1E8] text-[#8A9189] border-[#E3DDCB]' },
  expired: { text: 'Expired', tone: 'bg-[#F4F1E8] text-[#8A9189] border-[#E3DDCB]' },
};

export default function QuotationCard({ reference, quotation, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState(null);

  const open = quotation.status === 'sent';
  const status = STATUS_LABEL[quotation.status] ?? STATUS_LABEL.superseded;
  const expired = quotation.expiresAt && new Date(quotation.expiresAt) < new Date();

  async function accept() {
    setBusy(true);
    try {
      await account.bookings.acceptQuotation(reference, quotation._id);
      setNotice('Accepted. We will be in touch with payment details.');
      await onChanged?.();
    } catch (error) {
      onError?.(error instanceof AccountError ? error.message : 'Could not accept this quotation.');
    } finally {
      setBusy(false);
    }
  }

  async function respond(outcome) {
    setBusy(true);
    try {
      await account.bookings.respondToQuotation(reference, quotation._id, {
        outcome,
        message: message || undefined,
      });
      setResponding(false);
      setMessage('');
      setNotice(
        outcome === 'decline'
          ? 'Thank you for letting us know.'
          : 'We will come back to you with a revised quotation.',
      );
      await onChanged?.();
    } catch (error) {
      onError?.(error instanceof AccountError ? error.message : 'Could not send your answer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border p-5 ${
        open ? 'border-[#E8C97A] bg-[#FFFDF7]' : 'border-[#E3DDCB] bg-[#FAF9F5]'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-[18px] text-[#012C18]">
            <FileText aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" />
            {quotation.version > 1 ? `Quotation, version ${quotation.version}` : 'Your quotation'}
          </h3>
          {quotation.revisionReason && (
            <p className="mt-1 text-[12.5px] leading-[1.7] text-[#5E6B63]">
              <span className="font-semibold">What changed:</span> {quotation.revisionReason}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${status.tone}`}
        >
          {status.text}
        </span>
      </header>

      <Banner kind="ok" onDismiss={() => setNotice(null)}>
        {notice}
      </Banner>

      {quotation.summary && (
        <p className="mt-3 text-[13.5px] leading-[1.7] text-[#3B473F]">{quotation.summary}</p>
      )}

      <dl className="mt-4 space-y-0">
        {quotation.items?.map((item) => (
          <div
            key={item._id ?? item.label}
            className="flex items-baseline justify-between gap-3 border-b border-[#EFE9DA] py-2 last:border-0"
          >
            <dt className="min-w-0 text-[13.5px] text-[#3B473F]">
              {item.label}
              {item.quantity !== 1 && (
                <span className="text-[#8A9189]">
                  {' · '}
                  {item.quantity}
                  {item.unitLabel ? ` ${item.unitLabel}` : ''} ×{' '}
                  {formatAmount(item.unitAmount, quotation.currency)}
                </span>
              )}
              {item.detail && (
                <span className="block text-[12.5px] text-[#8A9189]">{item.detail}</span>
              )}
            </dt>
            <dd className="m-0 shrink-0 text-[13.5px] tabular-nums text-[#3B473F]">
              {formatAmount(item.amount, quotation.currency)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 border-t border-[#DDD4C1] pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold text-[#012C18]">Total</span>
          <span className="text-[15px] font-semibold tabular-nums text-[#012C18]">
            {formatAmount(quotation.totalAmount, quotation.currency)}
          </span>
        </div>
        {quotation.advanceAmount > 0 && (
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-[#5E6B63]">Deposit to confirm</span>
            <span className="text-[13px] tabular-nums text-[#5E6B63]">
              {formatAmount(quotation.advanceAmount, quotation.currency)}
            </span>
          </div>
        )}
      </div>

      {quotation.inclusions?.length > 0 && (
        <List title="Included" items={quotation.inclusions} />
      )}
      {quotation.exclusions?.length > 0 && (
        <List title="Not included" items={quotation.exclusions} />
      )}

      {/* Absent entirely when the desk has not written terms, rather than
          showing a reassuring default that would not be true. */}
      {quotation.cancellationTerms && (
        <div className="mt-4 rounded-xl border border-[#E8C97A] bg-[#FFF8E7] p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#8A5B00]">
            If you need to cancel
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#5A3D00]">
            {quotation.cancellationTerms}
          </p>
        </div>
      )}

      {quotation.expiresAt && open && !expired && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#5E6B63]">
          <Clock aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
          This price holds until{' '}
          {new Date(quotation.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.
        </p>
      )}

      {open && expired && (
        <p className="mt-3 text-[12.5px] leading-[1.7] text-[#A8412C]">
          This quotation has passed its date. Ask us for an up-to-date price and we will send one.
        </p>
      )}

      {open && !expired && (
        <div className="mt-4">
          {responding ? (
            <div>
              <label
                htmlFor={`response-${quotation._id}`}
                className="text-[12.5px] font-semibold text-[#3B473F]"
              >
                Anything you would like us to know?
              </label>
              <textarea
                id={`response-${quotation._id}`}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Too expensive, different dates, a different hotel…"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => respond('request_changes')}
                  className={secondaryButtonClass}
                >
                  {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  Ask for changes
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => respond('decline')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#F2D2C9] bg-white px-4 text-[13.5px] font-semibold text-[#A8412C] transition-colors hover:bg-[#FDF1EE] disabled:opacity-60"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setResponding(false)}
                  className={secondaryButtonClass}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={accept}
                  disabled={busy}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#043A25] px-5 text-[14px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18] disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  )}
                  Accept this quotation
                </button>
                <button
                  type="button"
                  onClick={() => setResponding(true)}
                  disabled={busy}
                  className={secondaryButtonClass}
                >
                  Not quite right
                </button>
              </div>
              {/* Before the button, not after it. */}
              <p className="mt-2.5 text-[12.5px] leading-[1.7] text-[#5E6B63]">
                Accepting charges you nothing. It tells us to hold your trip and send payment
                details.
              </p>
            </>
          )}
        </div>
      )}

      {quotation.status === 'accepted' && (
        <p className="mt-4 text-[13px] leading-[1.7] text-[#1C5E3A]">
          You accepted this on{' '}
          {new Date(quotation.acceptedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.
        </p>
      )}
    </section>
  );
}

function List({ title, items }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[#5E6B63]">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-[13px] leading-[1.7] text-[#3B473F]">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
