import React from 'react';
import { JourneyIcon } from './journeyUi';

/*
 * One day of the itinerary. The card is a button-less article with an
 * expandable detail row so the section stays keyboard reachable without
 * turning the whole card into a control.
 */
export default function JourneyDayCard({ day, scheduled = true, isActive }) {
  return (
    <article
      id={`day-${day.day}`}
      data-day-card={day.day}
      className={`group scroll-mt-28 overflow-hidden rounded-2xl border bg-[#FAF9F5] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-32px_rgba(1,44,24,0.6)] ${
        isActive
          ? 'border-[#B89A5A]/70 shadow-[0_18px_44px_-32px_rgba(1,44,24,0.55)]'
          : 'border-[#E3DDCB]'
      }`}
    >
      <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_38%] lg:grid-cols-[minmax(0,1fr)_40%]">
        {/* Copy */}
        <div className="order-2 p-5 sm:order-1 sm:p-6">
          <p
            data-day-text
            className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#B89A5A]"
          >
            {scheduled ? 'Day' : 'Stage'} {String(day.day).padStart(2, '0')}
          </p>

          <h3
            data-day-text
            className="mt-2 font-display text-[24px] leading-tight text-[#012C18] sm:text-[27px]"
          >
            {day.title}
          </h3>

          {day.description && (
            <p
              data-day-text
              className="mt-2.5 max-w-[46ch] text-[13px] leading-[1.75] text-[#5E6B63] sm:text-[13.5px]"
            >
              {day.description}
            </p>
          )}

          {day.meta.length > 0 && (
          <ul data-day-text className="mt-4 flex flex-wrap gap-2">
            {day.meta.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3DDCB] bg-[#F4F1E8]/70 px-2.5 py-1 text-[10.5px] font-medium text-[#4A5B50]"
              >
                <JourneyIcon name={day.icon} className="h-3 w-3" />
                {item}
              </li>
            ))}
          </ul>
          )}

        </div>

        {/* Photograph */}
        <div className="relative order-1 h-48 overflow-hidden sm:order-2 sm:h-full sm:min-h-[230px]">
          <img
            src={day.image}
            alt={day.imageAlt}
            loading="lazy"
            data-day-image
            className="absolute inset-0 h-[110%] w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/35 to-transparent" />
        </div>
      </div>
    </article>
  );
}
