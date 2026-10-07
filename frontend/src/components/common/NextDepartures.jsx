import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { scheduleNote, upcomingDepartures } from '../../data/departures';

/*
 * The next few dates this trip actually runs.
 *
 * Computed from today, so nothing here can expire the way the old hardcoded
 * departure strings did. Out-of-season months are skipped by the generator,
 * which is why a Spiti trip viewed in November shows June dates rather than a
 * crossing of a pass that is under snow.
 *
 * When a trip has no schedule we say so and offer private dates, instead of
 * showing an empty box or inventing something.
 */
export default function NextDepartures({ slug, nights = 2, onEnquire }) {
  const dates = useMemo(() => upcomingDepartures(slug, { count: 4, nights }), [slug, nights]);
  const note = scheduleNote(slug);

  return (
    <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
      <h2 className="flex items-center gap-2 font-display text-[17px] text-[#012C18]">
        <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" strokeWidth={2} />
        Next departures
      </h2>

      {dates.length === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#5E6B63]">
          This trip runs on request rather than a fixed schedule. Tell us when you are free and we
          will build it around your dates.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {dates.map((date) => (
            <li
              key={date.id}
              className="flex items-center justify-between gap-3 border-b border-[#EFE9DA] pb-1.5 last:border-0 last:pb-0"
            >
              <span className="text-[12.5px] text-[#012C18]">{date.label}</span>
              <button
                type="button"
                onClick={() => onEnquire?.(date)}
                className="shrink-0 text-[11.5px] font-bold uppercase tracking-wider text-[#075333] underline decoration-[#075333]/30 underline-offset-2 transition-colors hover:decoration-[#075333]"
              >
                Enquire
              </button>
            </li>
          ))}
        </ul>
      )}

      {note && <p className="mt-3 text-[11.5px] leading-relaxed text-[#8A9189]">{note}</p>}

      <p className="mt-3 text-[11px] leading-relaxed text-[#98A09A]">
        Published schedule. We confirm seats and road status before taking any payment.
      </p>
    </section>
  );
}
