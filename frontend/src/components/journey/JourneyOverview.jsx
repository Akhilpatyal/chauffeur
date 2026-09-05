import React, { useRef } from 'react';
import { ArrowRight, CalendarDays, Users } from 'lucide-react';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { JourneyIcon, RidgeMark } from './journeyUi';

/*
 * Shown instead of the day-by-day timeline for journeys whose records carry no
 * stage data (most group departures). It presents only what the record really
 * holds - description, tags, dates, seats and trip leader - rather than
 * inventing a schedule to fill the space.
 */
export default function JourneyOverview({ content, onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 85%' });

  return (
    <div ref={scope}>
      <header className="flex flex-wrap items-end gap-4">
        <h2 className="font-display text-[30px] leading-tight text-[#012C18] sm:text-[38px]">
          About This Journey
        </h2>
        <RidgeMark className="mb-1.5 hidden h-8 w-28 text-[#B7C0B4] sm:block" />
      </header>

      {content.intro && (
        <p
          data-reveal
          className="mt-5 max-w-[62ch] text-[14px] leading-[1.85] text-[#141E18]/75 sm:text-[15px]"
        >
          {content.intro}
        </p>
      )}

      {content.tags.length > 0 && (
        <ul data-reveal className="mt-6 flex flex-wrap gap-2">
          {content.tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DDCB] bg-[#FAF9F5] px-3 py-1.5 text-[11.5px] font-medium text-[#4A5B50]"
            >
              <JourneyIcon name="compass" className="h-3 w-3" />
              {tag}
            </li>
          ))}
        </ul>
      )}

      <dl data-reveal className="mt-7 grid gap-4 sm:grid-cols-2">
        {content.dates && (
          <div className="rounded-xl border border-[#E3DDCB] bg-[#FAF9F5] p-4">
            <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7C857E]">
              <CalendarDays className="h-3.5 w-3.5 text-[#B89A5A]" />
              Departure
            </dt>
            <dd className="mt-2 text-[14px] font-semibold text-[#012C18]">
              {content.dates}
            </dd>
          </div>
        )}

        {content.seatsRemaining != null && (
          <div className="rounded-xl border border-[#E3DDCB] bg-[#FAF9F5] p-4">
            <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7C857E]">
              <Users className="h-3.5 w-3.5 text-[#B89A5A]" />
              Seats left
            </dt>
            <dd className="mt-2 text-[14px] font-semibold text-[#012C18]">
              {content.seatsRemaining} of this departure
            </dd>
          </div>
        )}
      </dl>

      {content.leader && (
        <div
          data-reveal
          className="mt-4 flex items-center gap-3 rounded-xl border border-[#E3DDCB] bg-[#FAF9F5] p-4"
        >
          {content.leader.avatar && (
            <img
              src={content.leader.avatar}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-11 w-11 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7C857E]">
              Trip leader
            </p>
            <p className="mt-1 text-[13px] font-semibold text-[#012C18]">
              {content.leader.name}
            </p>
            {content.leader.role && (
              <p className="text-[11.5px] text-[#7C857E]">{content.leader.role}</p>
            )}
          </div>
        </div>
      )}

      <div
        data-reveal
        className="mt-6 rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-6"
      >
        <h3 className="font-display text-[20px] text-[#012C18]">
          Want the full day-by-day plan?
        </h3>
        <p className="mt-2 max-w-[52ch] text-[13px] leading-[1.7] text-[#5E6B63]">
          This departure is built around the group, so the daily route is confirmed with
          your trip planner. Ask us for the detailed itinerary and we&rsquo;ll send it
          across.
        </p>
        <button
          type="button"
          onClick={onPlanTrip}
          className="group mt-5 inline-flex items-center gap-2 rounded-lg bg-[#043A25] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#FAF9F5] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#012C18]"
        >
          Request Itinerary
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
