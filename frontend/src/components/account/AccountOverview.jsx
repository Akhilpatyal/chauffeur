import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { account } from '../../lib/account';
import { linkProps } from '../../router';
import BookingCard from './BookingCard';
import { Skeleton, Empty, secondaryButtonClass } from './accountUi';

/*
 * The first screen after signing in.
 *
 * Answers one question — what, if anything, needs me? — before anything
 * else. A dashboard that opens with totals makes the reader hunt for the one
 * booking that is waiting on them, which is the only reason most people
 * visit this page at all.
 *
 * So: things needing action first, then what is coming up, then history.
 * Counts appear as labels on those groups rather than as a row of tiles,
 * because "3" in a box is a number you have to go and interpret.
 */

/* Statuses where the ball is in the customer's court. Derived here rather
 * than fetched: the server already tells us the status, and a round trip to
 * ask "is this one waiting on them" for each booking would be three
 * requests to answer one question. */
const NEEDS_CUSTOMER = new Set(['QUOTED', 'AWAITING_PAYMENT']);

export default function AccountOverview({ onError }) {
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    account.bookings
      .list('all')
      .then((response) => !cancelled && setBookings(response.data))
      .catch((error) => {
        if (cancelled) return;
        onError?.(error.message);
        setBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (!bookings) return <Skeleton rows={3} />;

  if (bookings.length === 0) {
    return (
      <Empty
        title="No trips yet"
        action={
          <a {...linkProps('/journeys')} className={secondaryButtonClass}>
            Browse journeys
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        }
      >
        When you ask us about a trip it will appear here, and you can follow it from request
        through to the day you leave.
      </Empty>
    );
  }

  const waitingOnYou = bookings.filter((b) => NEEDS_CUSTOMER.has(b.status));
  const inProgress = bookings.filter(
    (b) => ['REQUESTED', 'AVAILABILITY_CHECK'].includes(b.status),
  );
  const upcoming = bookings.filter(
    (b) => b.status === 'CONFIRMED' && b.tripStatus !== 'COMPLETED',
  );
  const past = bookings.filter((b) =>
    ['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(b.status),
  );

  return (
    <div className="space-y-8">
      {waitingOnYou.length > 0 && (
        <Group
          title="Waiting on you"
          note="These need a decision before they can go further."
          bookings={waitingOnYou}
          emphasis
        />
      )}

      {inProgress.length > 0 && (
        <Group
          title="With us"
          note="We are checking availability and will come back to you."
          bookings={inProgress}
        />
      )}

      {upcoming.length > 0 && (
        <Group title="Confirmed trips" note="Packed and ready." bookings={upcoming} />
      )}

      {past.length > 0 && (
        <Group title="Past and closed" bookings={past.slice(0, 3)}>
          {past.length > 3 && (
            <a
              {...linkProps('/account/trips')}
              className="mt-3 inline-flex min-h-[40px] items-center gap-1 px-1 text-[12.5px] font-semibold text-[#075333]"
            >
              See all {past.length}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          )}
        </Group>
      )}
    </div>
  );
}

function Group({ title, note, bookings, emphasis = false, children }) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h2
          className={`font-display text-[20px] ${emphasis ? 'text-[#8A5B00]' : 'text-[#012C18]'}`}
        >
          {title}
        </h2>
        <span className="text-[13px] text-[#8A9189]">{bookings.length}</span>
      </div>
      {note && <p className="mt-0.5 text-[13px] text-[#5E6B63]">{note}</p>}

      <div className="mt-3 space-y-3">
        {bookings.map((booking) => (
          <BookingCard key={booking._id} booking={booking} />
        ))}
      </div>
      {children}
    </section>
  );
}
