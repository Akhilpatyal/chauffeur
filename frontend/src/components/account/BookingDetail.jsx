import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Users, Calendar, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { account } from '../../lib/account';
import QuotationCard from './QuotationCard';
import { linkProps } from '../../router';
import {
  StatusBadge,
  STATUS_COPY,
  PAYMENT_COPY,
  Timeline,
  NextAction,
  Banner,
  Skeleton,
  formatAmount,
  formatDateRange,
  secondaryButtonClass,
  inputClass,
} from './accountUi';

/*
 * One booking in full.
 *
 * Three things, in the order somebody actually wants them: what is happening
 * and what it needs from them, what they asked for, and then the history.
 *
 * The money block only appears once there is an agreed price. A request has
 * `totalAmount: 0` because nothing has been quoted, and a "Total ₹0" row
 * reads as either free or broken — so it is absent, which is the truthful
 * rendering of "no price agreed yet".
 */
export default function BookingDetail({ reference, onError }) {
  const [state, setState] = useState({
    loading: true,
    booking: null,
    timeline: [],
    nextAction: null,
    quotations: [],
  });
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      /* Fetched together so the page never renders a booking without the
       * quotation that is waiting on the reader — which is the one thing on
       * this page they may need to act on. */
      const [response, quotes] = await Promise.all([
        account.bookings.get(reference),
        account.bookings.quotations(reference).catch(() => ({ data: [] })),
      ]);
      setState({
        loading: false,
        booking: response.data,
        timeline: response.meta.timeline ?? [],
        nextAction: response.meta.nextAction ?? null,
        quotations: quotes.data ?? [],
      });
    } catch (error) {
      onError?.(error.message);
      setState({ loading: false, booking: null, timeline: [], nextAction: null, quotations: [] });
    }
  }, [reference, onError]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <Skeleton rows={4} />;

  if (!state.booking) {
    return (
      <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 text-center">
        <p className="font-display text-[19px] text-[#012C18]">We could not find that booking</p>
        <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-[1.7] text-[#5E6B63]">
          Check the reference, or go back to your trips.
        </p>
        <a {...linkProps('/account/trips')} className={`${secondaryButtonClass} mt-4`}>
          My trips
        </a>
      </div>
    );
  }

  const { booking, timeline, nextAction, quotations } = state;
  /* Only the current offer gets the full treatment; superseded versions stay
   * available below it so somebody can see what changed. */
  const liveQuotation = quotations.find((q) => q.status === 'sent');
  const pastQuotations = quotations.filter((q) => q !== liveQuotation);
  const copy = STATUS_COPY[booking.status] ?? {};
  const hasPrice = (booking.totalAmount ?? 0) > 0;
  const paid = booking.paidAmount ?? 0;
  const balance = Math.max(0, (booking.totalAmount ?? 0) - paid);
  const closed = ['REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED'].includes(booking.status);

  async function submitCancellation(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await account.bookings.requestCancellation(booking.reference, cancelReason || undefined);
      setCancelling(false);
      setCancelReason('');
      setNotice('We have your cancellation request and will confirm what it means for your booking.');
      await load();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <a
        {...linkProps('/account/trips')}
        className="-ml-1 inline-flex min-h-[40px] items-center gap-1.5 px-1 text-[13px] font-semibold text-[#5E6B63] transition-colors hover:text-[#012C18]"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        My trips
      </a>

      <Banner kind="ok" onDismiss={() => setNotice(null)}>
        {notice}
      </Banner>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
            {booking.trip?.title ?? 'Custom trip'}
          </h2>
          <p className="mt-1 font-mono text-[12.5px] tracking-wide text-[#8A9189]">
            {booking.reference}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </header>

      {/* What is going on, said plainly, directly under the badge rather than
          leaving the reader to interpret a status name. */}
      <p className="mt-2.5 text-[14px] leading-[1.7] text-[#3B473F]">{copy.meaning}</p>

      {booking.closureReason && (
        <div className="mt-3 rounded-xl border border-[#F2D2C9] bg-[#FDF1EE] p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#A8412C]">
            What happened
          </p>
          <p className="mt-1 text-[13.5px] leading-[1.7] text-[#7A2E1F]">{booking.closureReason}</p>
        </div>
      )}

      <NextAction action={nextAction} className="mt-4" />

      {/* Directly under the status, above the trip details: if there is a
          price waiting to be accepted, that is what the reader came for. */}
      {liveQuotation && (
        <div className="mt-5">
          <QuotationCard
            reference={booking.reference}
            quotation={liveQuotation}
            onChanged={load}
            onError={onError}
          />
        </div>
      )}

      {/* [&>*]:min-w-0 is load-bearing. A grid item's automatic minimum size
          is its min-content width, so one long unbreakable string — an email
          address is the usual one — widens the column past the container and
          the card is clipped rather than wrapped. */}
      <div className="mt-6 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
          <h3 className="font-display text-[18px] text-[#012C18]">Your trip</h3>
          <dl className="mt-3 space-y-0">
            <Row icon={Calendar} label="Dates">
              {formatDateRange(booking.startDate, booking.endDate)}
              {booking.dateFlexibilityDays > 0 && (
                <span className="text-[#8A9189]"> · flexible by {booking.dateFlexibilityDays} days</span>
              )}
            </Row>
            <Row icon={Users} label="Travellers">
              {booking.travellerCount}
            </Row>
            {booking.trip?.destination && (
              <Row icon={MapPin} label="Where">
                {booking.trip.destination}
              </Row>
            )}
            {booking.preferences?.pickupPoint && (
              <Row icon={MapPin} label="Pickup">
                {booking.preferences.pickupPoint}
              </Row>
            )}
            {booking.contact?.phone && (
              <Row icon={Phone} label="Phone">
                {booking.contact.phone}
              </Row>
            )}
            {booking.contact?.email && (
              <Row icon={Mail} label="Email">
                {booking.contact.email}
              </Row>
            )}
          </dl>

          {booking.preferences?.specialRequests && (
            <div className="mt-4 rounded-xl bg-[#F4F1E8] p-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#5E6B63]">
                What you told us
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.7] text-[#3B473F]">
                {booking.preferences.specialRequests}
              </p>
            </div>
          )}
        </section>

        <div className="space-y-4">
          {hasPrice ? (
            <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
              <h3 className="font-display text-[18px] text-[#012C18]">Payment</h3>
              <dl className="mt-3 space-y-1.5 text-[13.5px]">
                <Money label="Total" amount={booking.totalAmount} currency={booking.currency} bold />
                {booking.advanceAmount > 0 && (
                  <Money label="Deposit" amount={booking.advanceAmount} currency={booking.currency} />
                )}
                <Money label="Paid" amount={paid} currency={booking.currency} />
                {balance > 0 && (
                  <Money label="Still to pay" amount={balance} currency={booking.currency} bold />
                )}
              </dl>
              <p className="mt-3 border-t border-[#EFE9DA] pt-2.5 text-[12.5px] text-[#5E6B63]">
                {PAYMENT_COPY[booking.paymentStatus]}
                {booking.paymentDeadline && balance > 0 && (
                  <>
                    {' · due by '}
                    {new Date(booking.paymentDeadline).toLocaleDateString('en-IN', {
                      dateStyle: 'medium',
                    })}
                  </>
                )}
              </p>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-[#DDD4C1] bg-[#FAF9F5] p-5">
              <h3 className="font-display text-[18px] text-[#012C18]">Payment</h3>
              {/* No price yet, so no figures. Showing "₹0" would read as free
                  and "—" as broken; saying why is better than either.
                  Which "why" depends on whether a quotation is already
                  waiting — telling somebody we will send a price while one
                  sits directly above it reads as a system that has lost
                  track of itself. */}
              <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6B63]">
                {liveQuotation
                  ? 'Nothing is due yet. Accept the quotation above and we will send payment details.'
                  : 'Nothing to pay yet. We will send a priced quotation once we have confirmed what this trip needs, and you decide from there.'}
              </p>
            </section>
          )}

          {!closed && !booking.cancellationRequestedAt && (
            <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
              <h3 className="font-display text-[18px] text-[#012C18]">Need to change plans?</h3>
              {cancelling ? (
                <form onSubmit={submitCancellation} className="mt-3">
                  <textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    rows={3}
                    placeholder="Anything you would like us to know (optional)"
                    className={`${inputClass} resize-y`}
                  />
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#F2D2C9] bg-white px-4 text-[13.5px] font-semibold text-[#A8412C] transition-colors hover:bg-[#FDF1EE] disabled:opacity-60"
                    >
                      {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                      Send cancellation request
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelling(false)}
                      className={secondaryButtonClass}
                    >
                      Keep it
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6B63]">
                    Ask us to cancel and we will tell you what the terms mean for your booking.
                    {/* Said before they click, not after: the button records a
                        request, it does not cancel, and implying otherwise
                        sets up a disappointed expectation. */}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelling(true)}
                    className={`${secondaryButtonClass} mt-3`}
                  >
                    Request cancellation
                  </button>
                </>
              )}
            </section>
          )}

          {booking.cancellationRequestedAt && !closed && (
            <section className="rounded-2xl border border-[#E8C97A] bg-[#FFF4DC] p-5">
              <h3 className="font-display text-[18px] text-[#5A3D00]">Cancellation requested</h3>
              <p className="mt-2 text-[13px] leading-[1.7] text-[#8A5B00]">
                We have your request and are working out what the terms mean for this booking. We
                will be in touch.
              </p>
            </section>
          )}
        </div>
      </div>

      {pastQuotations.length > 0 && (
        <section className="mt-6">
          <h3 className="font-display text-[18px] text-[#012C18]">Earlier quotations</h3>
          <p className="mt-1 text-[12.5px] text-[#8A9189]">
            Kept so you can see exactly what was offered and when.
          </p>
          <div className="mt-3 space-y-3">
            {pastQuotations.map((quotation) => (
              <QuotationCard
                key={quotation._id}
                reference={booking.reference}
                quotation={quotation}
                onChanged={load}
                onError={onError}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
        <h3 className="font-display text-[18px] text-[#012C18]">What has happened</h3>
        <p className="mt-1 text-[12.5px] text-[#8A9189]">
          {/* Explains why there are no greyed-out future steps. */}
          Only steps that have actually happened appear here.
        </p>
        <Timeline events={timeline} className="mt-4" />
      </section>
    </div>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 border-b border-[#EFE9DA] py-2 last:border-0">
      <dt className="flex w-[96px] shrink-0 items-center gap-1.5 text-[12.5px] text-[#8A9189]">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
        {label}
      </dt>
      <dd className="m-0 min-w-0 flex-1 break-words text-[13.5px] text-[#3B473F]">{children}</dd>
    </div>
  );
}

function Money({ label, amount, currency, bold = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#5E6B63]">{label}</dt>
      <dd className={`m-0 ${bold ? 'font-semibold text-[#012C18]' : 'text-[#3B473F]'}`}>
        {formatAmount(amount, currency)}
      </dd>
    </div>
  );
}
