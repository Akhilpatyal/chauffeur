import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { upcomingDepartures, scheduleNote } from '../../data/departures';

/*
 * Upcoming departures, grouped by month.
 *
 * Built entirely from the schedule rules in data/departures.js — a weekday, a
 * cadence and the months the route is actually open — so the dates compute
 * forward from today and can never go stale the way a hand-written list does.
 * That was the point of those rules: an itinerary advertising "departs 14
 * March" eighteen months after the fact is the clearest possible signal that
 * nobody is minding the site.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * No seat counts and no "only 2 left". The site has no live inventory, so any
 * number shown would be invented, and invented scarcity is both the oldest
 * dark pattern in travel and a prohibited practice under India's 2023
 * consumer-protection guidance. See data/companyFacts.js — the same rule
 * removed the fabricated ratings.
 *
 * What a reader gets instead is true and more useful: which dates run, what
 * the route's season actually is, and why some months are missing.
 */
const MONTHS_SHOWN = 4;

export default function AvailabilityCalendar({ slug, nights = 2, onSelectDate, className = '' }) {
  const [expanded, setExpanded] = useState(false);

  /* Generated once per slug rather than on every render: the walk forward is
   * cheap but it allocates, and this sits inside a page that re-renders on
   * scroll-driven animation. */
  const departures = useMemo(
    () => upcomingDepartures(slug, { count: expanded ? 24 : 8, nights }),
    [slug, nights, expanded],
  );

  const note = scheduleNote(slug);

  const byMonth = useMemo(() => {
    const groups = new Map();
    for (const d of departures) {
      const key = d.start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    }
    return [...groups.entries()];
  }, [departures]);

  if (departures.length === 0) {
    /* A closed season is a fact worth stating rather than an empty box. */
    return note ? (
      <section
        aria-labelledby="trip-dates-heading"
        className={`rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 ${className}`}
      >
        <h3
          id="trip-dates-heading"
          className="flex items-center gap-2 font-display text-[19px] text-[#012C18]"
        >
          <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" strokeWidth={2} />
          Departure dates
        </h3>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-[#5E6B63]">{note}</p>
      </section>
    ) : null;
  }

  const shown = expanded ? byMonth : byMonth.slice(0, MONTHS_SHOWN);

  return (
    <section
      aria-labelledby="trip-dates-heading"
      className={`rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 ${className}`}
      data-reveal
    >
      <h3
        id="trip-dates-heading"
        className="flex items-center gap-2 font-display text-[19px] text-[#012C18]"
      >
        <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" strokeWidth={2} />
        Departure dates
      </h3>

      {note && <p className="mt-2 text-[12.5px] leading-[1.6] text-[#5E6B63]">{note}</p>}

      <div className="mt-4 space-y-4">
        {shown.map(([month, dates]) => (
          <div key={month}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#8A9189]">
              {month}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {dates.map((d) => {
                const content = (
                  <>
                    <span className="font-display text-[17px] leading-none text-[#012C18]">
                      {d.day}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-[#8A9189]">
                      {d.month}
                    </span>
                  </>
                );

                /* A button only where there is somewhere to go. Rendering a
                 * clickable-looking tile that does nothing is worse than a
                 * plain one. */
                return (
                  <li key={d.id}>
                    {onSelectDate ? (
                      <button
                        type="button"
                        onClick={() => onSelectDate(d)}
                        aria-label={`Enquire about the departure on ${d.label}`}
                        className="flex min-h-[56px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E3DDCB] bg-white transition-colors hover:border-[#075333] hover:bg-[#F4F1E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
                      >
                        {content}
                      </button>
                    ) : (
                      <span className="flex min-h-[56px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#E3DDCB] bg-white">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {byMonth.length > MONTHS_SHOWN && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="-ml-1 mt-3 inline-flex min-h-[40px] items-center gap-1 px-1 text-[12.5px] font-semibold text-[#075333] transition-colors hover:text-[#012C18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
        >
          Show later dates
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}

      <p className="mt-3 text-[11.5px] leading-[1.6] text-[#8A9189]">
        Dates are generated from this route&rsquo;s running season, so they are always current.
        Enquire to confirm a seat — we will tell you whether the departure has reached its minimum
        group size.
      </p>
    </section>
  );
}
