import React from 'react';
import { Check, Clock, AlertCircle, X } from 'lucide-react';

/*
 * Shared pieces for the signed-in area.
 *
 * Built on the site's existing palette and type rather than a second design
 * language: somebody who books a trip has just come from the public pages,
 * and an account area that looks like a different product makes them wonder
 * whether they are still on the right site.
 */

/*
 * What a booking status means, in words a traveller would use.
 *
 * The enum names are for the database. "AWAITING_PAYMENT" on a dashboard is
 * a system talking to itself, and more importantly it does not say what the
 * reader should do about it — which is the only reason they are looking.
 */
export const STATUS_COPY = {
  REQUESTED: {
    label: 'Request received',
    tone: 'waiting',
    meaning: 'We are checking whether we can run these dates.',
  },
  AVAILABILITY_CHECK: {
    label: 'Checking availability',
    tone: 'waiting',
    meaning: 'We are confirming rooms, transport and permits with our suppliers.',
  },
  QUOTED: {
    label: 'Quotation ready',
    tone: 'action',
    meaning: 'Review the price and what is included, then accept to hold your place.',
  },
  AWAITING_PAYMENT: {
    label: 'Deposit due',
    tone: 'action',
    meaning: 'Pay the deposit to confirm your place.',
  },
  CONFIRMED: {
    label: 'Confirmed',
    tone: 'good',
    meaning: 'Everything is secured. You are going.',
  },
  COMPLETED: { label: 'Completed', tone: 'neutral', meaning: 'This trip has finished.' },
  REJECTED: {
    label: 'Could not run',
    tone: 'closed',
    meaning: 'We were not able to run this trip.',
  },
  CANCELLED: { label: 'Cancelled', tone: 'closed', meaning: 'This booking was cancelled.' },
  EXPIRED: {
    label: 'Expired',
    tone: 'closed',
    meaning: 'The offer lapsed. Tell us if you would still like to go.',
  },
};

export const PAYMENT_COPY = {
  UNPAID: 'Nothing due yet',
  PENDING: 'Payment in progress',
  PARTIALLY_PAID: 'Deposit paid',
  PAID: 'Paid in full',
  FAILED: 'Payment failed',
  REFUND_PENDING: 'Refund in progress',
  PARTIALLY_REFUNDED: 'Partly refunded',
  REFUNDED: 'Refunded',
};

const TONE_CLASS = {
  waiting: 'bg-[#F4F1E8] text-[#5E6B63] border-[#DDD4C1]',
  /* The one tone that stands out, reserved for a status that needs the
   * reader to do something. If everything is highlighted, nothing is. */
  action: 'bg-[#FFF4DC] text-[#8A5B00] border-[#E8C97A]',
  good: 'bg-[#EEF8F2] text-[#1F7A4D] border-[#C3E4D2]',
  closed: 'bg-[#FDF1EE] text-[#A8412C] border-[#F2D2C9]',
  neutral: 'bg-[#F1EFE7] text-[#5E6B63] border-[#DDD4C1]',
};

export function StatusBadge({ status, className = '' }) {
  const copy = STATUS_COPY[status] ?? { label: status, tone: 'neutral' };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${TONE_CLASS[copy.tone]} ${className}`}
    >
      {copy.label}
    </span>
  );
}

/*
 * The one thing the reader should do next.
 *
 * Driven by the backend's `nextAction`, which comes off the most recent
 * event that asked something of them — not re-derived from the status here.
 * Two places computing "what now" drift apart, and the one that drifts is
 * the one nobody tested.
 */
export function NextAction({ action, className = '' }) {
  if (!action?.label) return null;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-[#E8C97A] bg-[#FFF4DC] p-3.5 ${className}`}
    >
      <AlertCircle aria-hidden="true" className="mt-[2px] h-4 w-4 shrink-0 text-[#8A5B00]" />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-[#5A3D00]">{action.label}</p>
        {action.dueBy && (
          <p className="mt-0.5 text-[12px] text-[#8A5B00]">
            By {new Date(action.dueBy).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </p>
        )}
      </div>
    </div>
  );
}

/*
 * The booking timeline.
 *
 * Rendered entirely from recorded events. There is no fixed list of stages
 * with dates slotted in, so a step that has not happened simply is not here
 * — which is the whole reason the backend stores history rather than a
 * progress percentage. A greyed-out "Payment" row with no date would imply
 * we know it is coming, and for a request that may be refused we do not.
 */
export function Timeline({ events = [], className = '' }) {
  if (events.length === 0) return null;

  return (
    <ol className={`relative space-y-0 ${className}`}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <li key={event._id ?? `${event.type}-${index}`} className="relative flex gap-3.5 pb-5 last:pb-0">
            {/* The connector stops at the last entry rather than trailing
                into empty space, which would read as "more to come". */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[11px] top-6 bottom-0 w-px bg-[#DDD4C1]"
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border-2 ${
                isLast ? 'border-[#075333] bg-[#075333]' : 'border-[#DDD4C1] bg-[#FAF9F5]'
              }`}
            >
              {isLast ? (
                <Clock className="h-3 w-3 text-white" strokeWidth={2.5} />
              ) : (
                <Check className="h-3 w-3 text-[#8A9189]" strokeWidth={3} />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[#012C18]">{event.title}</p>
              {event.description && (
                <p className="mt-0.5 text-[12.5px] leading-[1.6] text-[#5E6B63]">
                  {event.description}
                </p>
              )}
              <p className="mt-1 text-[11.5px] text-[#98A09A]">
                {new Date(event.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* Rupees from paise. The backend stores integers; nothing here does
 * arithmetic on them, only formatting. */
export function formatAmount(minor, currency = 'INR') {
  if (typeof minor !== 'number') return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatDateRange(start, end) {
  if (!start) return 'Dates to be agreed';
  const from = new Date(start);
  const to = end ? new Date(end) : null;
  const day = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  if (!to) return `${day(from)} ${from.getFullYear()}`;
  return from.getFullYear() === to.getFullYear()
    ? `${day(from)} – ${day(to)} ${to.getFullYear()}`
    : `${day(from)} ${from.getFullYear()} – ${day(to)} ${to.getFullYear()}`;
}

export function Banner({ kind = 'error', children, onDismiss }) {
  if (!children) return null;
  const tone =
    kind === 'ok'
      ? 'border-[#C3E4D2] bg-[#EEF8F2] text-[#1F7A4D]'
      : kind === 'warn'
        ? 'border-[#E8C97A] bg-[#FFF4DC] text-[#8A5B00]'
        : 'border-[#F2D2C9] bg-[#FDF1EE] text-[#A8412C]';

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[13px] ${tone}`}
    >
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-black/5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/*
 * A loading state that reserves the space the content will occupy.
 *
 * A spinner that collapses to nothing when content arrives causes exactly the
 * layout shift the rest of this site was tuned to remove.
 */
export function Skeleton({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-[#EFE9DA]" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DDD4C1] bg-[#FAF9F5] px-6 py-10 text-center">
      <p className="font-display text-[19px] text-[#012C18]">{title}</p>
      {children && (
        <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-[1.7] text-[#5E6B63]">
          {children}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, id }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#5E6B63]">
        {label}
      </span>
      {children}
      {/* The hint goes under the input, where somebody looks after typing;
          the error replaces it, because two messages compete. */}
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] text-[#A8412C]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-[#8A9189]">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#DDD4C1] bg-white px-3.5 py-2.5 text-[15px] text-[#012C18] outline-none transition-colors placeholder:text-[#A8B0A8] focus:border-[#075333] focus:ring-2 focus:ring-[#075333]/20';

export const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#043A25] px-5 text-[14px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]';

export const secondaryButtonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#DDD4C1] bg-white px-5 text-[14px] font-semibold text-[#012C18] transition-colors hover:border-[#075333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]';
