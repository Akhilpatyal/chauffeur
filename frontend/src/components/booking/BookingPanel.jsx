import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Users, Loader2, ArrowRight, X, Info } from 'lucide-react';
import { account, ensureSession, idempotencyKey, isSignedIn, AccountError } from '../../lib/account';
import { navigateTo } from '../../router';
import { rememberReturnTo } from '../account/AuthPage';
import {
  Banner,
  Field,
  inputClass,
  buttonClass,
  secondaryButtonClass,
  formatAmount,
  formatDateRange,
} from '../account/accountUi';

/*
 * The booking panel behind Check Availability.
 *
 * It handles both shapes a request can take, because they are the same
 * conversation at different levels of certainty: a fixed departure picks a
 * date off a calendar, a custom trip describes a wish. Two separate panels
 * would mean two places to maintain the sign-in handoff and the idempotency
 * key below.
 *
 * THREE THINGS IT IS CAREFUL ABOUT
 *
 * It never claims a seat count it does not have. A departure marked
 * `on_request` depends on suppliers we have to ring, so the panel says
 * availability needs confirming rather than inventing a number.
 *
 * It never implies the trip is booked. The button says "Send request" and
 * the note under it says what happens next, because the expensive failure
 * here is somebody buying flights against a departure nobody agreed to run.
 *
 * It keeps the visitor's selection across a sign-in. Losing the dates and
 * traveller count on the way to a login form is the most annoying possible
 * moment to lose them.
 */

/* Held across the sign-in round trip. sessionStorage rather than a query
 * string: this is the visitor's own choice being handed back to them, not
 * something that should survive a shared link. */
const DRAFT_KEY = 'taifer_booking_draft';

export function saveDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Private mode. They retype their dates; nothing breaks. */
  }
}

export function takeDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BookingPanel({ trip, departures = [], kind = 'fixed_departure', onClose }) {
  const restored = useMemo(() => takeDraft(), []);

  const [form, setForm] = useState(() => ({
    departureId: restored?.departureId ?? departures[0]?._id ?? '',
    travellerCount: restored?.travellerCount ?? 2,
    startDate: restored?.startDate ?? '',
    dateFlexibilityDays: restored?.dateFlexibilityDays ?? 0,
    roomSharing: restored?.roomSharing ?? '',
    pickupPoint: restored?.pickupPoint ?? '',
    budgetRange: restored?.budgetRange ?? '',
    specialRequests: restored?.specialRequests ?? '',
  }));

  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  /*
   * Three states, not two: null means we have not finished asking.
   *
   * Starting at `false` and correcting later looks harmless but is not — the
   * panel is lazily loaded, so the chunk download sits inside that window,
   * and anybody who submitted during it was sent to sign in despite already
   * having a valid session.
   */
  const [signedIn, setSignedIn] = useState(() => (isSignedIn() ? true : null));

  /* The key is generated once per panel, not per submit, so a user who
   * retries after a failed request reuses it — which is the case that
   * actually double-books, more than a double click. */
  const [submissionKey] = useState(() => idempotencyKey());

  useEffect(() => {
    let cancelled = false;
    ensureSession().then((ok) => !cancelled && setSignedIn(ok));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = departures.find((d) => String(d._id) === String(form.departureId));
  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function draft() {
    return { ...form, tripSlug: trip?.slug, kind };
  }

  function goSignIn() {
    /* Both halves: where to come back to, and what they had chosen when they
     * left. Returning somebody to the right page with an empty form is only
     * half the job. */
    saveDraft(draft());
    rememberReturnTo(typeof window !== 'undefined' ? window.location.pathname : '/');
    navigateTo('/signin');
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError(null);
    setFieldErrors({});

    /* If the answer has not arrived yet, wait for it rather than assuming the
     * worse one. Submitting is exactly the moment it is worth a short wait. */
    const authenticated = signedIn ?? (await ensureSession());
    if (!authenticated) {
      setBusy(false);
      goSignIn();
      return;
    }

    try {
      const payload =
        kind === 'fixed_departure'
          ? {
              kind: 'fixed_departure',
              departureId: form.departureId,
              travellerCount: Number(form.travellerCount),
            }
          : {
              kind: 'custom',
              travellerCount: Number(form.travellerCount),
              startDate: form.startDate || undefined,
              dateFlexibilityDays: Number(form.dateFlexibilityDays) || 0,
            };

      const response = await account.bookings.create({
        ...payload,
        idempotencyKey: submissionKey,
        trip: {
          slug: trip?.slug,
          title: trip?.title,
          destination: trip?.destination,
          durationLabel: trip?.durationLabel,
          imageUrl: trip?.imageUrl,
        },
        preferences: {
          roomSharing: form.roomSharing || undefined,
          pickupPoint: form.pickupPoint || undefined,
          budgetRange: form.budgetRange || undefined,
          specialRequests: form.specialRequests || undefined,
        },
      });

      /* Straight to the booking so the first thing they see is the reference
       * and the timeline saying what happens next — rather than a toast that
       * disappears and leaves them wondering whether it worked. */
      navigateTo(`/account/trips/${response.data.reference}`);
    } catch (caught) {
      if (caught instanceof AccountError) {
        setError(caught.message);
        setFieldErrors(caught.fields ?? {});
        if (caught.status === 401) {
          goSignIn();
          return;
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kind === 'custom' ? 'Plan a custom trip' : 'Check availability'}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[#FAF9F5] p-5 sm:max-w-[520px] sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] leading-tight text-[#012C18]">
              {kind === 'custom' ? 'Plan this your way' : 'Check availability'}
            </h2>
            <p className="mt-1 truncate text-[13px] text-[#5E6B63]">{trip?.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5E6B63] transition-colors hover:bg-[#EFE9DA]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <Banner onDismiss={() => setError(null)}>{error}</Banner>

        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          {kind === 'fixed_departure' ? (
            <Field label="Departure" id="booking-departure" error={fieldErrors.departureId}>
              <select
                id="booking-departure"
                className={inputClass}
                value={form.departureId}
                onChange={set('departureId')}
                required
              >
                {departures.length === 0 && <option value="">No dates published yet</option>}
                {departures.map((departure) => (
                  <option key={departure._id} value={departure._id}>
                    {formatDateRange(departure.startDate, departure.endDate)}
                    {departure.pricePerPerson
                      ? ` — ${formatAmount(departure.pricePerPerson, departure.currency)} pp`
                      : ''}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred start" id="booking-start" error={fieldErrors.startDate}>
                <input
                  id="booking-start"
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={set('startDate')}
                />
              </Field>
              <Field label="Flexible by" id="booking-flex" hint="Days either side">
                <select
                  id="booking-flex"
                  className={inputClass}
                  value={form.dateFlexibilityDays}
                  onChange={set('dateFlexibilityDays')}
                >
                  <option value={0}>Fixed dates</option>
                  <option value={3}>3 days</option>
                  <option value={7}>A week</option>
                  <option value={14}>Two weeks</option>
                </select>
              </Field>
            </div>
          )}

          <Field label="Travellers" id="booking-travellers" error={fieldErrors.travellerCount}>
            <input
              id="booking-travellers"
              type="number"
              min={1}
              max={40}
              className={inputClass}
              value={form.travellerCount}
              onChange={set('travellerCount')}
              required
            />
          </Field>

          <Field label="Room sharing" id="booking-rooms" hint="Optional">
            <select
              id="booking-rooms"
              className={inputClass}
              value={form.roomSharing}
              onChange={set('roomSharing')}
            >
              <option value="">No preference</option>
              <option value="Twin sharing">Twin sharing</option>
              <option value="Triple sharing">Triple sharing</option>
              <option value="Private room">Private room</option>
            </select>
          </Field>

          {kind === 'custom' && (
            <Field label="Budget per person" id="booking-budget" hint="Optional, helps us plan">
              <input
                id="booking-budget"
                className={inputClass}
                value={form.budgetRange}
                onChange={set('budgetRange')}
                placeholder="₹20,000–30,000"
              />
            </Field>
          )}

          <Field label="Anything we should know" id="booking-notes" hint="Optional">
            <textarea
              id="booking-notes"
              rows={3}
              className={`${inputClass} resize-y`}
              value={form.specialRequests}
              onChange={set('specialRequests')}
              placeholder="Dietary needs, altitude concerns, anything else."
            />
          </Field>

          {/* Selected departure summary, including whether the seat count
              means anything. `showsLiveSeats` is false for an on-request
              departure, and in that case no number is published at all. */}
          {selected && (
            <div className="rounded-xl bg-[#F4F1E8] p-3.5 text-[12.5px] leading-[1.7] text-[#3B473F]">
              <p className="flex items-center gap-1.5 font-semibold text-[#012C18]">
                <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
                {formatDateRange(selected.startDate, selected.endDate)}
              </p>
              {selected.pricePerPerson > 0 && (
                <p className="mt-1 flex items-center gap-1.5">
                  <Users aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
                  {formatAmount(selected.pricePerPerson, selected.currency)} per person · about{' '}
                  <strong>
                    {formatAmount(
                      selected.pricePerPerson * Number(form.travellerCount || 1),
                      selected.currency,
                    )}
                  </strong>{' '}
                  in total
                </p>
              )}
              <p className="mt-1 text-[#5E6B63]">
                {selected.showsLiveSeats
                  ? `${selected.seatsAvailable} of ${selected.capacity} seats free`
                  : 'Availability confirmed when we check with our suppliers.'}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-[#E8C97A] bg-[#FFF4DC] p-3">
            <Info aria-hidden="true" className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#8A5B00]" />
            <p className="text-[12.5px] leading-[1.6] text-[#5A3D00]">
              {/* The most important sentence on the panel. */}
              This sends a request, not a booking. We check availability by hand and come back to
              you with a price — usually within a working day. Nothing is charged now.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={`${buttonClass} flex-1`}
              disabled={busy || (kind === 'fixed_departure' && departures.length === 0)}
            >
              {busy ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  {signedIn ? 'Send request' : 'Sign in and send'}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </button>
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Not now
            </button>
          </div>

          {!signedIn && (
            <p className="text-center text-[12px] text-[#8A9189]">
              You need an account to track the request. Your dates and preferences are kept while
              you sign in.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
