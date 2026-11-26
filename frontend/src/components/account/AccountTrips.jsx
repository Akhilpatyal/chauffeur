import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { account } from '../../lib/account';
import { linkProps } from '../../router';
import BookingCard from './BookingCard';
import { Skeleton, Empty, secondaryButtonClass } from './accountUi';

/*
 * Every booking, filtered.
 *
 * The scopes come from the server rather than being computed here, so
 * "upcoming" means the same thing on this page as it does in the API and in
 * the admin's pipeline. Three definitions of upcoming is two too many, and
 * the one that drifts is the one that counts a rejected request as a trip
 * somebody is going on.
 */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'In progress' },
  { key: 'upcoming', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Closed' },
];

const EMPTY_COPY = {
  all: {
    title: 'No trips yet',
    body: 'When you ask us about a trip it will appear here.',
  },
  pending: {
    title: 'Nothing in progress',
    body: 'No requests are with us at the moment.',
  },
  upcoming: {
    title: 'No confirmed trips',
    body: 'A trip appears here once the deposit is paid and every supplier has confirmed.',
  },
  completed: { title: 'No completed trips yet', body: 'Your finished trips will be listed here.' },
  cancelled: {
    title: 'Nothing closed',
    body: 'Requests we could not run, and bookings you cancelled, would appear here.',
  },
};

export default function AccountTrips({ onError }) {
  const [scope, setScope] = useState('all');
  const [state, setState] = useState({ loading: true, items: [], total: 0 });

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    account.bookings
      .list(scope)
      .then((response) => {
        if (cancelled) return;
        setState({ loading: false, items: response.data, total: response.meta.total });
      })
      .catch((error) => {
        if (cancelled) return;
        onError?.(error.message);
        setState({ loading: false, items: [], total: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [scope, onError]);

  const empty = EMPTY_COPY[scope] ?? EMPTY_COPY.all;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setScope(filter.key)}
            aria-pressed={scope === filter.key}
            className={`inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
              scope === filter.key
                ? 'border-[#043A25] bg-[#043A25] text-[#FAF9F5]'
                : 'border-[#DDD4C1] bg-white text-[#3B473F] hover:border-[#075333]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {state.loading ? (
          <Skeleton rows={3} />
        ) : state.items.length === 0 ? (
          <Empty
            title={empty.title}
            action={
              scope === 'all' ? (
                <a {...linkProps('/journeys')} className={secondaryButtonClass}>
                  Browse journeys
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={secondaryButtonClass}
                >
                  Show all trips
                </button>
              )
            }
          >
            {empty.body}
          </Empty>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-[#8A9189]">
              {state.total} {state.total === 1 ? 'booking' : 'bookings'}
            </p>
            <div className="space-y-3">
              {state.items.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
