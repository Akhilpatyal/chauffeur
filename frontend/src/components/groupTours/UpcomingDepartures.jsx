import React, { useRef } from 'react';
import { ArrowRight, Check, Flame } from 'lucide-react';
import { departures, privateGroup } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';

export default function UpcomingDepartures({ onBook, onViewCalendar, onCustomQuote }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 86%', stagger: 0.07 });

  return (
    <section
      ref={scope}
      aria-labelledby="departures-heading"
      className="bg-[#F4F1E8] pb-14"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-8">
          {/* Departures */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="departures-heading"
                data-reveal
                className="font-display text-[28px] leading-none text-[#012C18] sm:text-[32px]"
              >
                Upcoming Group Departures
              </h2>

              <button
                type="button"
                onClick={onViewCalendar}
                data-reveal
                className="group inline-flex items-center gap-2 rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] px-4 py-2.5 text-[11.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#043A25]"
              >
                View Calendar
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            <ul className="mt-5 space-y-3">
              {departures.map((departure) => (
                <li
                  key={departure.id}
                  data-reveal
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-[#E3DDCB] bg-[#FAF9F5] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#B7C4B4]"
                >
                  {/* Date */}
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F4F1E8] leading-none">
                    <span className="font-display text-[17px] text-[#012C18]">
                      {departure.day}
                    </span>
                    <span className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8A9189]">
                      {departure.month}
                    </span>
                  </span>

                  <span className="min-w-[150px] flex-1 text-[13.5px] font-semibold text-[#012C18]">
                    {departure.title}
                  </span>

                  <span className="text-[11.5px] text-[#7C857E]">{departure.duration}</span>

                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#B0803A]">
                    <Flame className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {departure.seatsLeft} Seats Left
                  </span>

                  <span className="text-[13px] font-bold text-[#012C18]">
                    {departure.price}
                    <span className="ml-0.5 text-[10.5px] font-normal text-[#7C857E]">
                      /person
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onBook(departure)}
                    className="ml-auto rounded-lg bg-[#043A25] px-5 py-2.5 text-[11.5px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
                  >
                    Book Now
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Private group */}
          <aside
            data-reveal
            className="overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5]"
          >
            <img
              src={privateGroup.image}
              alt={privateGroup.imageAlt}
              loading="lazy"
              className="h-[132px] w-full object-cover"
            />

            <div className="p-5">
              <h3 className="font-display text-[19px] leading-tight text-[#012C18]">
                {privateGroup.title}
              </h3>
              <p className="mt-2 text-[12px] leading-[1.6] text-[#7C857E]">
                {privateGroup.body}
              </p>

              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
                {privateGroup.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[#4A5B50]"
                  >
                    <Check
                      className="mt-[1px] h-3 w-3 shrink-0 text-[#075333]"
                      strokeWidth={3}
                    />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={onCustomQuote}
                className="mt-5 w-full rounded-lg bg-[#043A25] py-3 text-[12px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
              >
                {privateGroup.cta}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
