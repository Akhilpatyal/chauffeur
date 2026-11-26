import React from 'react';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { linkProps } from '../../router';
import { responsiveImage } from '../../lib/images';
import {
  StatusBadge,
  STATUS_COPY,
  PAYMENT_COPY,
  formatAmount,
  formatDateRange,
} from './accountUi';

/*
 * One booking, as a row in the customer's list.
 *
 * WHAT IS DELIBERATELY NOT SHOWN
 *
 * No price at all until there is an agreed one. A request carries
 * `totalAmount: 0` because nothing has been quoted, and rendering "₹0" or
 * "Total: —" next to a trip reads as either free or broken. The money block
 * simply does not appear until a quotation exists, which is also the honest
 * description of the situation.
 *
 * The status badge and the sentence under it both appear, because the badge
 * alone says where the booking is and not what the reader should do about
 * it — which is the only reason they are on this page.
 */
export default function BookingCard({ booking }) {
  const copy = STATUS_COPY[booking.status] ?? {};
  const href = `/account/trips/${booking.reference}`;

  /* An agreed figure exists only once something has been quoted. */
  const hasPrice = (booking.totalAmount ?? 0) > 0;
  const paid = booking.paidAmount ?? 0;
  const balance = Math.max(0, (booking.totalAmount ?? 0) - paid);

  return (
    <a
      {...linkProps(href)}
      className="group flex gap-4 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-3.5 transition-all hover:border-[#043A25]/40 hover:shadow-[0_8px_20px_rgba(1,44,24,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25] sm:p-4"
    >
      {booking.trip?.imageUrl ? (
        <img
          {...responsiveImage(booking.trip.imageUrl, '96px')}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
        />
      ) : (
        /* A placeholder block rather than nothing, so cards in a list keep
           the same shape whether or not a trip has a picture. */
        <span
          aria-hidden="true"
          className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl bg-[#EFE9DA] font-display text-[20px] text-[#B89A5A] sm:h-20 sm:w-20"
        >
          {(booking.trip?.title ?? 'T').charAt(0)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <p className="truncate font-display text-[17px] leading-tight text-[#012C18] sm:text-[18px]">
              {booking.trip?.title ?? 'Custom trip'}
            </p>
            <p className="mt-0.5 font-mono text-[11.5px] tracking-wide text-[#8A9189]">
              {booking.reference}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#5E6B63]">{copy.meaning}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#5E6B63]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
            {formatDateRange(booking.startDate, booking.endDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
            {booking.travellerCount} {booking.travellerCount === 1 ? 'traveller' : 'travellers'}
          </span>
        </div>

        {hasPrice && (
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[#EFE9DA] pt-2.5 text-[12.5px]">
            <span className="font-semibold text-[#012C18]">
              {formatAmount(booking.totalAmount, booking.currency)}
            </span>
            {paid > 0 && (
              <span className="text-[#5E6B63]">
                {formatAmount(paid, booking.currency)} paid
              </span>
            )}
            {balance > 0 && paid > 0 && (
              <span className="text-[#8A5B00]">
                {formatAmount(balance, booking.currency)} to go
              </span>
            )}
            <span className="text-[#8A9189]">{PAYMENT_COPY[booking.paymentStatus]}</span>
          </div>
        )}

        <span className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-[#075333]">
          View details
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </a>
  );
}
